/*!
 * EJS
 * Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , path = require('path')
  , dirname = path.dirname
  , extname = path.extname
  , join = path.join
  , fs = require('fs')
  , read = fs.readFileSync
  , _DEFAULT_DELIMITER = '%';

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

exports.clearCache = function(){
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

function rethrow(err, str, filename, lineno){
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
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
 * Parse the given `str` of ejs, returning the function body.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

function parse(str, options){
  var options = options || {}
    , d = options.delimiter || exports.delimiter || _DEFAULT_DELIMITER
    , open = '<' + d
    , close = d + '>'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , buf = "";

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
      i += open.length

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
          } else {
            prefix = "');" + line + ';';
            postfix = "; buf.push('";
          }
      }

      var end = str.indexOf(close, i);

      if (end < 0){
        throw new Error('Could not find matching close tag for "' + open + str[i - 1] + '".');
      }

      var js = str.substring(i, end)
        , start = i
        , include = null
        , n = 0;

      if ('-' == js[js.length-1]){
        js = js.substring(0, js.length - 2);
        consumeEOL = true;
      }

      if (0 == js.trim().indexOf('include')) {
        var name = js.trim().slice(7).trim();
        if (!filename) throw new Error('`include` requires the \'filename\' option.');
        var path = resolveInclude(name, filename);
        include = read(path, 'utf8');
        include = parse(include, { filename: path, _with: false, delimiter: d, compileDebug: compileDebug });
        buf += "' + (function(){" + include + "})() + '";
        js = '';
      }

      while (~(n = js.indexOf("\n", n))) n++, lineno++;
      
      if (js[0] == '#') {
        js = "";
      }
      
      if (js) {
        if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';
        buf += prefix;
        buf += js;
        buf += postfix;
      }
      i += end - start + close.length - 1;
    } else if (stri == "\\") {
      buf += "\\\\";
    } else if (stri == "'") {
      buf += "\\'";
    } else if (stri == "\r") {
      // ignore
    } else if (stri == "\n") {
      if (consumeEOL) {
        consumeEOL = false;
      } else {
        buf += "\\n";
        lineno++;
      }
    } else {
      buf += stri;
    }
  }

  if (false !== options._with) buf += "');}return buf.join('');";
  else buf += "');return buf.join('');";
  return buf;
};

/**
 * Compile the given `str` of ejs into a `Function`.
 *
 * @param {String} str
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

var compile = exports.compile = function(str, opts){
  opts = opts || {};
  var escape = opts.escape || utils.escape;

  var input = JSON.stringify(str)
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
        + '} catch (err) {'
        + '  rethrow(err, __lines, __filename, __line);'
        + '}';
  } else {
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
    if (e instanceof SyntaxError) {
      if (opts.filename) {
        e.message += ' in ' + opts.filename;
      }
      e.message += ' while compiling ejs';
    }
    throw e;
  }

  if (client) return fn;

  return function(locals){
    return fn(locals, escape, null /* TODO */, rethrow);
  }
};

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
 * @param {Object} options
 * @return {String}
 * @api public
 */

exports.render = function(str, locals, options){
  var fn
    , locals = locals || {}
    , options = options || {};

  if (options.cache) {
    if (options.filename) {
      fn = cache[options.filename] || (cache[options.filename] = compile(str, options));
    } else {
      throw new Error('"cache" option requires "filename".');
    }
  } else {
    fn = compile(str, options);
  }

  if (options.context) {
    return fn.call(options.context, locals);
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

exports.renderFile = function(path, locals, options, fn){
  arguments = Array.prototype.slice.call(arguments);
  arguments.shift(); // path
  fn = arguments.pop();
  locals = arguments.shift() || {};
  options = arguments.pop() || {};

  var key = path + ':string';

  options.filename = path;

  var str;
  try {
    str = options.cache
      ? cache[key] || (cache[key] = read(path, 'utf8'))
      : read(path, 'utf8');
    str = exports.render(str, locals, options);
  } catch (err) {
    fn(err);
    return;
  }
  fn(null, str);
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
  var path = join(dirname(filename), name);
  var ext = extname(name);
  if (!ext) path += '.ejs';
  return path;
}

// express support

exports.__express = exports.renderFile;

/**
 * Expose to require().
 */

if (require.extensions) {
  require.extensions['.ejs'] = function (module, filename) {
    filename = filename || module.filename;
    var options = { filename: filename, client: true }
      , template = fs.readFileSync(filename).toString()
      , fn = compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
}
