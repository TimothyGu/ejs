# EJS -- Embedded JavaScript templates

[![Build Status](https://img.shields.io/travis/TimothyGu/ejs-tj/master.svg?style=flat)](https://travis-ci.org/TimothyGu/ejs-tj)
[![Developing Dependencies](https://img.shields.io/david/dev/TimothyGu/ejs-tj.svg?style=flat)](https://david-dm.org/TimothyGu/ejs-tj#info=devDependencies)

This repo is a continuation of TJ Holowaychuk's original EJS project.

## History

Since May 1, 2014, TJ Holowaychuk (@tj), the original author of EJS for
Node.js, has not made any contribution to EJS. This might be in part because
of [his migration to Go](https://medium.com/code-adventures/farewell-node-js-4ba9e7f3e52b).

In December of last year, Matthew Eernisse apparent asked @tj for
maintainership of EJS, but switched the `ejs` npm package to use his own
implementation (mde/ejs), and started calling it EJS v2. It works well (with
[my patches](https://github.com/mde/ejs/commits/master?author=TimothyGu) :P),
but is [*too* slow](https://gist.github.com/TimothyGu/2c43a88789d5302d81f9#file-result-md)
compared to TJ's original implementation.

So, I got TJ's implementation to shape and made all tests in EJS v2 to pass,
plus some more, and asked @mde if he was willing to merge my repo in. Turns
out he wasn't, citing the (very efficient) spaghetti code is hard to maintain,
which is true but I honestly don't think the OOP in his implementation is
that much better or worths it.

And thus, I decided to officially fork EJS, and publish the package as
`ejs-tj` in NPM. It is intended to be 100% compatible with EJS v2, and might
be more compatible with older scripts due to its root in TJ's implementation.
In the mean time, I will continue to contribute to mde/ejs, and merge its
changes to this repo as well.

Note that EJS v2 is still a very active project. Do not refrain from using
it because of this post. But instead, when you *do* start using EJS, check out
this project as well :wink:.

## Installation

```bash
$ npm install ejs-tj
```

## Features

  * Control flow with `<% %>`
  * Escaped output with `<%= %>`
  * Unescaped raw output with `<%- %>`
  * Trim-mode ('newline slurping') with `-%>` ending tag
  * Custom delimiters (e.g., use '<? ?>' instead of '<% %>')
  * Includes
  * Client-side support
  * Static caching of intermediate JavaScript
  * Static caching of templates
  * Complies with the [Express](http://expressjs.com) view system

## Example

```html
<% if (user) { %>
  <h2><%= user.name %></h2>
<% } %>
```

## Usage

```javascript
var template = ejs.compile(str, options);
template(data);
// => Rendered HTML string

ejs.render(str, data, options);
// => Rendered HTML string
```

You can also use the shortcut `ejs.render(dataAndOptions);` where you pass
everything in a single object. In that case, you'll end up with local variables
for all the passed options.

## Options

  - `cache`           Compiled functions are cached, requires `filename`
  - `filename`        Used by `cache` to key caches, and for includes
  - `context`         Function execution context
  - `compileDebug`    When `false` no debug instrumentation is compiled
  - `client`          Returns standalone compiled function
  - `delimiter`       Character to use with angle brackets for open/close
  - `debug`           Output generated function body
  - `_with`           Whether or not to use `with() {}` constructs. If `false` then the locals will be stored in the `locals` object.

## Tags

  - `<%`              'Scriptlet' tag, for control-flow, no output
  - `<%=`             Outputs the value into the template (HTML escaped)
  - `<%-`             Outputs the unescaped value into the template
  - `<%#`             Comment tag, no execution, no output
  - `<%%`             Outputs a literal '<%'
  - `%>`              Plain ending tag
  - `-%>`             Trim-mode ('newline slurp') tag, trims following newline

## Includes

Includes are relative to the template with the `include` call. (This
requires the 'filename' option.) For example if you have "./views/users.ejs" and
"./views/user/show.ejs" you would use `<%- include('user/show'); %>`.

You'll likely want to use the raw output tag (`<%-`) with your include to avoid
double-escaping the HTML output.

```html
<ul>
  <% users.forEach(function(user){ %>
    <%- include('user/show', {user: user}); %>
  <% }); %>
</ul>
```

Includes are inserted at runtime, so you can use variables for the path in the
`include` call (for example `<%- include(somePath); %>`). Variables in your
top-level data object are available to all your includes, but local variables
need to be passed down.

NOTE: Include preprocessor directives (`<% include user/show  %>`) are
still supported.

## Custom delimiters

Custom delimiters can be applied on a per-template basis, or globally:

```javascript
var ejs = require('ejs'),
    users = ['geddy', 'neil', 'alex'];

// Just one template
ejs.render('<?= users.join(" | "); ?>', {users: users}, {delimiter: '?'});
// => 'geddy | neil | alex'

// Or globally
ejs.delimiter = '$';
ejs.render('<$= users.join(" | "); $>', {users: users});
// => 'geddy | neil | alex'
```

## Caching

EJS ships with a basic in-process cache for caching the intermediate JavaScript
functions used to render templates. It's easy to plug in LRU caching using
Node's `lru-cache` library:

```javascript
var ejs = require('ejs')
  , LRU = require('lru-cache');
ejs.cache = LRU(100); // LRU cache with 100-item limit
```

If you want to clear the EJS cache, call `ejs.clearCache`. If you're using the
LRU cache and need a different limit, simple reset `ejs.cache` to a new instance
of the LRU.

## Layouts

EJS does not specifically support blocks, but layouts can be implemented by
including headers and footers, like so:


```html
<%- include('header'); -%>
<h1>
  Title
</h1>
<p>
  My page
</p>
<%- include('footer'); -%>
```

## Client-side support

Go to the [Latest Release](https://github.com/mde/ejs/releases/latest), download
`./ejs.js` or `./ejs.min.js`.

Include one of these on your page, and `ejs.render(str)`.

## Related projects

There are a number of implementations of EJS:

 * Matthew's implementation, also known as EJS v2: https://github.com/mde/ejs
 * TJ's implementation, the v1 of this library: https://github.com/tj/ejs
 * Jupiter Consulting's EJS, the granddaddy of all the EJS projects:
   http://www.embeddedjs.com/
 * EJS Embedded JavaScript Framework on Google Code: https://code.google.com/p/embeddedjavascript/
 * Sam Stephenson's Ruby implementation: https://rubygems.org/gems/ejs
 * Erubis, an ERB implementation which also runs JavaScript: http://www.kuwata-lab.com/erubis/users-guide.04.html#lang-javascript

## License

Licensed under the Apache License, Version 2.0
(<http://www.apache.org/licenses/LICENSE-2.0>)

- - -
EJS Embedded JavaScript templates copyright 2112

- Copyright 2012 TJ Holowaychuk <tj@vision-media.ca>
- Copyright 2112 Matthew Eernisse <mde@fleegix.org>
- Copyright 2112 Tiancheng "Timothy" Gu <timothygu99@gmail.com>


