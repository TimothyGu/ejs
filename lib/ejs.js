/*!
 * EJS Embedded JavaScript templates
 * Copyright 2012 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright 2112 Matthew Eernisse <mde@fleegix.org>
 * Copyright 2112 Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , path = require('path')
  , dirname = path.dirname
  , extname = path.extname
  , resolve = path.resolve
  , fs = require('fs')
  , read = fs.readFileSync
  , optInDataWarned = false
  , scopeOptionWarned = false
  , _DEFAULT_DELIMITER = '%'
  , _OPTS = [ 'cache', 'filename', 'delimiter', 'scope', 'context'
            , 'debug', 'compileDebug', 'client'
            ];

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

function handleCache(options, template) {
  var fn
    , key
    , path = options.filename
    , hasTemplate = template !== undefined;

  if (options.cache) {
    if (!path) {
      throw new Error('cache option requires a filename');
    }
    var key = path + (options.client ? ':client' : '');
    fn = cache[key];
    if (fn) {
      return fn;
    }
    if (!hasTemplate) {
      template = fs.readFileSync(path, {encoding: 'utf8'});
    }
  }
  else if (!hasTemplate) {
    if (!path) {
      throw new Error('Internal EJS error: no file name or template '
                    + 'provided');
    }
    template = fs.readFileSync(path, {encoding: 'utf8'});
  }
  fn = exports.compile(template, options);
  if (options.cache) {
    cache[key] = fn;
  }
  return fn;
}

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

exports.clearCache = function clearCache() {
  cache = {};
};

/**
 * Re-throw the given `err` in context to the
 * `str` of ejs, `filename`, and `lineno`.
 *
 * @param {Error} err
 * @param {String} str
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

function rethrow(err, str, filename, lineno) {
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function (line, i) {
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}

function makeInclude(options, locals) {
  return function include(path, includeLocals) {
    if (!options.filename) {
      throw new Error('`include` requires the \'filename\' option.');
    }
    var d = utils.shallowCopy({}, locals)
      , opts = utils.shallowCopy({}, options);
    if (includeLocals) {
      d = utils.shallowCopy(d, includeLocals);
    }
    opts.filename = resolveInclude(path, options.filename);
    return handleCache(opts)(d);
  };
}

/**
 * Parse the given `str` of ejs, returning the function body.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

function parse(str, options) {
  var d = options.delimiter || exports.delimiter || _DEFAULT_DELIMITER
    , open = '<' + d
    , close = d + '>'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , buf = '';

  buf += 'var buf = [];';
  if (false !== options._with) {
    buf += 'with (locals || {}) { ';
  }
  buf += 'buf.push(\'';

  var lineno = 1;

  var consumeEOL = false;
  for (var i = 0, len = str.length; i < len; ++i) {
    var stri = str[i];
    if (str.slice(i, open.length + i) == open) {
      i += open.length;

      var prefix
        , postfix
        , line = (compileDebug ? '__line=' : '') + lineno
        , noEndNeeded = false;
      switch (str[i]) {
        case '=':
          prefix = "', escape((" + line + ', ';
          postfix = ")), '";
          ++i;
          break;
        case '-':
          prefix = "', (" + line + ', ';
          postfix = "), '";
          ++i;
          break;
        default:
          if (str.substr(i, d.length) == d) {
            buf += "', '" + open + "', '";
            i += d.length - 1;
            noEndNeeded = true;
            continue;
          }
          else {
            prefix = "');" + line + ';';
            postfix = "; buf.push('";
          }
      }

      var end = str.indexOf(close, i);

      if (end < 0) {
        throw new Error('Could not find matching close tag for "' + open + str[i - 1] + '".');
      }

      var js = str.substring(i, end).trim()
        , start = i
        , include = null
        , n = 0;

      if ('-' == js[js.length-1]) {
        js = js.substring(0, js.length - 2).trim();
        consumeEOL = true;
      }
      if (';' == js[js.length-1]) {
        js = js.substring(0, js.length - 1).trim();
      }

      if (js.indexOf('include') === 0) {
        var name = js.slice(7).trim();
        if (!filename) {
          throw new Error('`include` requires the \'filename\' option.');
        }
        // skip include() if any
        if (name.indexOf('(') !== 0) {
          var path = resolveInclude(name, filename);
          include = read(path, 'utf8');
          include = parse(include, {
            filename: path
          , _with: false
          , delimiter: d
          , compileDebug: compileDebug
          });
          buf += "' + (function(){" + include + "})() + '";
          js = '';
        }
      }

      while (!(n = js.indexOf('\n', n))) {
        n++;
        lineno++;
      }
      
      if (js[0] == '#') {
        js = '';
      }
      
      if (js) {
        if (js.lastIndexOf('//') > js.lastIndexOf('\n')) {
          js += '\n';
        }
        buf += prefix;
        buf += js;
        buf += postfix;
      }
      i += end - start + close.length - 1;
    }
    else if (stri == '\\') {
      buf += '\\\\';
    }
    else if (stri == "'") {
      buf += "\\'";
    }
    else if (stri == '\r') {
      // ignore
    }
    else if (stri == '\n') {
      if (consumeEOL) {
        consumeEOL = false;
      }
      else {
        buf += '\\n';
        lineno++;
      }
    }
    else {
      buf += stri;
    }
  }

  if (false !== options._with) {
    buf += "');}return buf.join('');";
  }
  else {
    buf += "');return buf.join('');";
  }
  return buf;
}

/**
 * Compile the given `str` of ejs into a `Function`.
 *
 * @param {String} str
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

exports.compile = function compile(str, opts) {
  opts = opts || {};
  var escape = opts.escape || utils.escapeXML
    , input = JSON.stringify(str)
    , fn
    , compileDebug = opts.compileDebug !== false
    , client = opts.client
    , filename = opts.filename
        ? JSON.stringify(opts.filename)
        : 'undefined';

  if (compileDebug) {
    // Adds the fancy stack trace meta info
    str = 'var __line = 1'
        +   ', __lines = ' + input
        +   ', __filename = ' + filename + ';'
        + 'try {'
        +   parse(str, opts)
        + '}'
        + 'catch (err) {'
        + '  rethrow(err, __lines, __filename, __line);'
        + '}';
  }
  else {
    str = parse(str, opts);
  }

  if (opts.debug) {
    console.log(str);
  }

  if (opts.client) {
    str = 'escape = escape || ' + escape.toString() + ';\n' + str;
    str = 'rethrow = rethrow || ' + rethrow.toString() + ';\n' + str;
  }

  try {
    fn = new Function('locals, escape, include, rethrow', str);
  }
  catch(e) {
    // istanbul ignore else
    if (e.message) {
      if (opts.filename) {
        e.message += ' in ' + opts.filename;
      }
      e.message += ' while compiling ejs';
    }
    throw e;
  }

  if (client) {
    return fn;
  }

  return function (locals) {
    var include = makeInclude(opts, locals);
    return fn(locals, escape, include, rethrow);
  };
};

function cpOptsInData(locals, opts) {
  _OPTS.forEach(function (p) {
    if (typeof locals[p] != 'undefined') {
      if (!(optInDataWarned || locals.__expressRender__)) {
        console.warn('options found in locals object. The option(s) is '
                   + 'copied to the option object. This behavior is '
                   + 'deprecated and will be removed in EJS 3');
        optInDataWarned = true;
      }
      opts[p] = locals[p];
    }
  });
}

/**
 * Render the given `str` of ejs.
 *
 * Options:
 *
 *   - `locals`          Local variables object
 *   - `cache`           Compiled functions are cached, requires `filename`
 *   - `filename`        Used by `cache` to key caches
 *   - `scope`           Function execution context
 *   - `debug`           Output generated function body
 *
 * @param {String} str
 * @param {Object} opts
 * @return {String}
 * @api public
 */

exports.render = function render(str, locals, opts) {
  var fn;
  locals = locals || {};
  opts = opts || {};

  cpOptsInData(locals, opts);
  if (opts.scope) {
    if (!scopeOptionWarned) {
      console.warn('`scope` option is deprecated and will be removed in EJS 3');
      scopeOptionWarned = true;
    }
    if (!opts.context) {
      opts.context = opts.scope;
    }
    delete opts.scope;
  }
  fn = handleCache(opts, str);

  if (opts.context) {
    return fn.call(opts.context, locals);
  }
  return fn(locals);
};

/**
 * Render an EJS file at the given `path` and callback `fn(err, str)`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @param {Function} fn
 * @api public
 */

exports.renderFile = function renderFile(path, locals, options, fn) {
  var args = Array.prototype.slice.call(arguments);
  args.shift(); // path
  fn = args.pop();
  locals = args.shift() || {};
  options = args.pop() || {};
  cpOptsInData(locals, options);

  options.filename = path;

  try {
    var str = handleCache(options)(locals);
  }
  catch (e) {
    return fn(e);
  }
  return fn(null, str);
};

/**
 * Resolve include `name` relative to `filename`.
 *
 * @param {String} name
 * @param {String} filename
 * @return {String}
 * @api private
 */

function resolveInclude(name, filename) {
  var path = resolve(dirname(filename), name);
  var ext = extname(name);
  if (!ext) {
    path += '.ejs';
  }
  return path;
}

// express support

exports.__express = function () {
  // (path, opts, cb)
  // Indicate this is the backward-compatible Express API shim
  if (arguments.length == 3) {
    arguments[1].__expressRender__ = true;
  }
  exports.renderFile.apply(null, arguments);
};

/**
 * Expose to require().
 */

// istanbul ignore else
if (require.extensions) {
  require.extensions['.ejs'] = function (module, filename) {
    filename = filename || /* istanbul ignore next */ module.filename;
    var options = { filename: filename, client: true }
      , template = fs.readFileSync(filename).toString()
      , fn = exports.compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
}
