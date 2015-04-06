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
 * @file Embedded JavaScript templating engine -- TJ's implementation.
 * @author TJ Holowaychuk <tj@vision-media.ca>
 * @author Matthew Eernisse <mde@fleegix.org>
 * @author Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 * @project EJS-TJ
 * @license {@link http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0}
 */

/**
 * EJS internal functions.
 *
 * Technically this "module" lies in the same file as {@link module:ejs}, for
 * the sake of organization all the private functions re grouped into this
 * module.
 *
 * @module ejs-internal
 * @private
 */

/**
 * Embedded JavaScript templating engine.
 *
 * @module ejs
 * @public
 */

var fs = require('fs')
  , utils = require('./utils')
  , scopeOptionWarned = false
  , _VERSION_STRING = require('../package.json').version
  , _DEFAULT_DELIMITER = '%'
  , _DEFAULT_LOCALS_NAME = 'locals'
  , _OPTS = [ 'cache', 'filename', 'delimiter', 'scope', 'context'
            , 'debug', 'compileDebug', 'client', '_with'
            ]
  , _TRAILING_SEMCOL = /;\s*$/
  , _BOM = /^\uFEFF/;

/**
 * EJS template function cache. This can be a LRU object from lru-cache NPM
 * module. By default, it is {@link module:utils.cache}, a simple in-process
 * cache that grows continuously.
 *
 * @type {Cache}
 */

exports.cache = utils.cache;

/**
 * Name of the object containing the locals.
 *
 * This variable is overriden by {@link Options}`.localsName` if it is not
 * `undefined`.
 *
 * @type {String}
 * @public
 */

exports.localsName = _DEFAULT_LOCALS_NAME;

/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * @param {String} name     specified path
 * @param {String} filename parent file path
 * @return {String}
 */

exports.resolveInclude = function(name, filename) {
  var path = require('path')
    , dirname = path.dirname
    , extname = path.extname
    , resolve = path.resolve
    , includePath = resolve(dirname(filename), name)
    , ext = extname(name);
  if (!ext) {
    includePath += '.ejs';
  }
  return includePath;
};

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `template` is not set, the file specified in `options.filename` will be
 * read.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @memberof module:ejs-internal
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */

function handleCache(options, template) {
  var fn
    , key
    , path = options.filename
    , hasTemplate = template !== undefined;

  if (options.cache) {
    if (!path) {
      throw new Error('cache option requires a filename');
    }
    key = path + (options.client ? ':client' : '');
    fn = exports.cache.get(key);
    if (fn) {
      return fn;
    }
    if (!hasTemplate) {
      template = fs.readFileSync(path).toString().replace(_BOM, '');
    }
  }
  else if (!hasTemplate) {
    // istanbul ignore if: should not happen at all
    if (!path) {
      throw new Error('Internal EJS error: no file name or template '
                    + 'provided');
    }
    template = fs.readFileSync(path).toString().replace(_BOM, '');
  }
  fn = exports.compile(template, options);
  if (options.cache) {
    exports.cache.set(key, fn);
  }
  return fn;
}

/**
 * Clear intermediate JavaScript cache. Calls {@link Cache#reset}.
 * @public
 */

exports.clearCache = function () {
  exports.cache.reset();
};

/**
 * Re-throw the given `err` in context to the `str` of ejs, `filename`, and
 * `lineno`.
 *
 * @implements RethrowCallback
 * @memberof module:ejs-internal
 * @param {Error}  err      Error object
 * @param {String} str      EJS source
 * @param {String} filename file name of the EJS file
 * @param {String} lineno   line number of the error
 * @static
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

/**
 * Copy properties in data object that are recognized as options to an
 * options object.
 *
 * This is used for compatibility with earlier versions of EJS and Express.js.
 *
 * @memberof module:ejs-internal
 * @param {Object}  data data object
 * @param {Options} opts options object
 * @static
 */

function cpOptsInData(data, opts) {
  _OPTS.forEach(function (p) {
    if (typeof data[p] != 'undefined') {
      opts[p] = data[p];
    }
  });
}

/**
 * Parse the given `str` of ejs, returning the function body.
 *
 * @memberof module:ejs-internal
 * @param {String} str
 * @return {String}
 * @static
 */

function parse(str, options) {
  var d = options.delimiter || exports.delimiter || _DEFAULT_DELIMITER
    , open = '<' + d
    , close = d + '>'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , _with = options._with !== false
    , buf = '  var __output = [];\n';

  if (_with) {
    buf += '  with (' + exports.localsName + ' || {}) {\n';
  }
  buf += '  __output.push(\'';

  var lineno = 1;

  var consumeEOL = false;
  for (var i = 0, len = str.length; i < len; ++i) {
    var stri = str[i];
    if (str.slice(i, open.length + i) == open) {
      i += open.length;

      var prefix
        , postfix
        , lineNoComma = compileDebug ? '__line = ' + lineno : ''
        , line = compileDebug ? lineNoComma + ', ' : '';
      switch (str[i]) {
        case '=':
          prefix = "'\n  , escape((" + line;
          postfix = "))\n  , '";
          ++i;
          break;
        case '-':
          prefix = "'\n  , (" + line;
          postfix = ")\n  , '";
          ++i;
          break;
        default:
          if (str.substr(i, d.length) == d) {
            buf += "'\n  , '" + open + "'\n  , '";
            i += d.length - 1;
            continue;
          }
          else {
            prefix = "');\n  " + lineNoComma + ';\n';
            postfix = "\n; __output.push('";
          }
      }

      var end = str.indexOf(close, i);

      if (end < 0) {
        throw new Error('Could not find matching close tag for "' + open + (str[i - 1] == d ? '' : str[i - 1]) + '".');
      }

      var js = str.substring(i, end).trim()
        , start = i
        , include = null
        , n = 0;

      if ('-' == js[js.length-1]) {
        js = js.substring(0, js.length - 1).trim();
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
          var path = exports.resolveInclude(name, filename);
          include = fs.readFileSync(path).toString().replace(_BOM, '');
          include = parse(include, {
            filename: path
          , _with: false
          , delimiter: d
          , compileDebug: compileDebug
          });
          buf += "'\n  , (function () {\n" + include + "})()\n  , '";
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
      lineno++;
      if (consumeEOL) {
        consumeEOL = false;
      }
      else {
        buf += '\\n';
      }
    }
    else {
      buf += stri;
    }
  }

  if (_with) {
    buf += "');\n  }\n  return __output.join('');";
  }
  else {
    buf += "');\n  return __output.join('');";
  }
  return buf;
}

/**
 * Compile the given `str` of ejs into a template function.
 *
 * @param {String}  template EJS template
 *
 * @param {Options} opts     compilation options
 *
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `opts.client`, either type might be returned.
 * @public
 */

exports.compile = function compile(str, options) {
  options = options || {};
  var escape = options.escape || utils.escapeXML
    , input = JSON.stringify(str)
    , fn
    , compileDebug = options.compileDebug !== false
    , filename = options.filename
        ? JSON.stringify(options.filename)
        : 'undefined';

  if (compileDebug) {
    // Adds the fancy stack trace meta info
    str = '\nvar __line = 1'
        + '\n  , __lines = ' + input
        + '\n  , __filename = ' + filename + ';'
        + '\ntry {\n'
        +      parse(str, options)
        + '\n}'
        + '\ncatch (err) {'
        + '\n  rethrow(err, __lines, __filename, __line);'
        + '\n}';
  }
  else {
    str = parse(str, options);
  }

  if (options.debug) {
    console.log(str);
  }

  if (options.client) {
    str = 'escape = escape || ' + escape.toString() + ';\n' + str;
    if (compileDebug) {
      str = 'rethrow = rethrow || ' + rethrow.toString() + ';\n' + str;
    }
  }

  try {
    fn = new Function(exports.localsName + ', escape, include, rethrow', str);
  }
  catch(e) {
    // istanbul ignore else
    if (e.message) {
      if (options.filename) {
        e.message += ' in ' + options.filename;
      }
      e.message += ' while compiling ejs';
    }
    throw e;
  }

  if (options.client) {
    return fn;
  }

  return function (locals) {
    function include(path, includeLocals) {
      if (!options.filename) {
        throw new Error('`include` requires the \'filename\' option.');
      }
      var d = utils.shallowCopy({}, locals)
        , copiedOpts = utils.shallowCopy({}, options);
      if (includeLocals) {
        d = utils.shallowCopy(d, includeLocals);
      }
      copiedOpts.filename = exports.resolveInclude(path, options.filename);
      return handleCache(copiedOpts)(d);
    }
    return fn(locals, escape, include, rethrow);
  };
};


/**
 * Render the given `template` of ejs.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}   template EJS template
 * @param {Object}  [data={}] template data
 * @param {Options} [opts={}] compilation and rendering options
 * @return {String}
 * @public
 */

exports.render = function render(str, locals, options) {
  var fn;
  locals = locals || {};
  options = options || {};

  cpOptsInData(locals, options);
  if (options.scope) {
    if (!scopeOptionWarned) {
      console.warn('`scope` option is deprecated and will be removed in EJS 3');
      scopeOptionWarned = true;
    }
    if (!options.context) {
      options.context = options.scope;
    }
    delete options.scope;
  }
  fn = handleCache(options, str);

  if (options.context) {
    return fn.call(options.context, locals);
  }
  return fn(locals);
};

/**
 * Render an EJS file at the given `path` and callback `cb(err, str)`.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}             path     path to the EJS file
 * @param {Object}            [data={}] template data
 * @param {Options}           [opts={}] compilation and rendering options
 * @param {RenderFileCallback} cb callback
 * @public
 */

exports.renderFile = function renderFile(path, locals, opts, cb) {
  var args = Array.prototype.slice.call(arguments, 1)
    , result;
  cb = args.pop();
  locals = args.shift() || {};
  opts = args.pop() || {};
  cpOptsInData(locals, opts);

  opts.filename = path;

  try {
    result = handleCache(opts)(locals);
  }
  catch(err) {
    return cb(err);
  }
  return cb(null, result);
};

/**
 * Express.js support.
 *
 * This is an alias for {@link module:ejs.renderFile}, in order to support
 * Express.js out-of-the-box.
 *
 * @func
 */

exports.__express = exports.renderFile;

/**
 * Expose to require().
 */

// istanbul ignore else
if (require.extensions) {
  require.extensions['.ejs'] = function (module, filename) {
    filename = filename || /* istanbul ignore next */ module.filename;
    var options = {
          filename: filename
        , client: true
        }
      , template = fs.readFileSync(filename).toString()
      , fn = exports.compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
}

/**
 * Version of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */

exports.VERSION = _VERSION_STRING;

/* istanbul ignore if */
if (typeof window != 'undefined') {
  window.ejs = exports;
}
