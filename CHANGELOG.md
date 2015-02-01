# EJS v2 and this project's releases

## v2.2.4: 2015-02-01

+ Ability to customize name of the locals object with `ejs.localsName` (@mde)
* Only bundle rethrow() in client scripts when compileDebug is enabled
  (@TimothyGu)

## v2.2.4-beta.4 (ejs-tj only): 2015-01-24

* Copy `_with` from locals object to options object (@TimothyGu)
* Add `ejs.version` like upstream does

## v2.2.4-beta.3 (ejs-tj only): 2015-01-24

* Fix new line slurping mode without a space before `-%>`

## v2.2.4-beta.2 (ejs-tj only): 2015-01-24

* Fix repo URL in package.json

## v2.2.4-beta.1 (ejs-tj only): 2015-01-24

* This is the first release of the ejs-tj project

# EJS v2's releases

## v2.2.3: 2015-01-23

* Better filtering for deprecation notice when called from Express (@mde)

## v2.2.2: 2015-01-21

* Fix handling of variable output containing semicolons (@TimothyGu)
* Fix included files caching (@TimothyGu)
* Simplified caching routine (@TimothyGu)
* Filter out deprecation warning for `renderFile` when called from
  Express (@mde)

## v2.2.1: 2015-01-19

+ 4x faster HTML escaping function, especially beneficial if you use lots
  of escaped locals (@TimothyGu)
+ Up to 4x faster compiled functions in addition to above (@TimothyGu)
+ Caching mode regression test coverage (@TimothyGu)
* Fix `//` in an expanded string (@TimothyGu)
* Fix literal mode without an end tag (@TimothyGu)
* Fix setting options to renderFile() through the legacy 3-argument interface
  (as is the case for Express.js) (@TimothyGu)
+ Added version string to exported object for use in browsers (@mde)

## v2.1.4: 2015-01-12

* Fix harmony mode (@mde)

## v2.1.3: 2015-01-11

* Fix `debug` option (@TimothyGu)
* Fix two consecutive tags together (@TimothyGu)

## v2.1.2: 2015-01-11

* Fix `scope` option handling
+ Improve testing coverage (@TimothyGu)

## v2.1.1: 2015-01-11

+ Add `_with` option to control whether or not to use `with() {}` constructs
  (@TimothyGu)
+ Improve test coverage (@mde & @TimothyGu)
+ Add a few more metadata fields to `package.json` (@TimothyGu)
- Revert hack for Etherpad Lite (@TimothyGu)
* Do not claim node < 0.10.0 support (@TimothyGu)
* Pin dependencies more loosely (@TimothyGu)
* Fix client function generation without using locals (@TimothyGu)
* Fix error case where the callback be called twice (@TimothyGu)
* Add `"use strict";` to all JS files (@TimothyGu)
* Fix absolute path inclusion (@TimothyGu) (#11)

## v2.0.8: 2015-01-06

* Fix crash on missing file

## v2.0.7: 2015-01-05

* Linting and cosmetics

## v2.0.6: 2015-01-04

* Temporary hack for Etherpad Lite. It will be removed soon.

## v2.0.5: 2015-01-04

* Fix leaking global `fn`

## v2.0.4: 2015-01-04

* Fix leaking global `includeSource`
* Update client-side instructions

## v2.0.3: 2015-01-04

+ Add Travis CI support
+ Add LICENSE file
+ Better compatibility with EJS v1 for options
+ Add `debug` option
* Fix typos in examples in README

## v2.0.2: 2015-01-03

* Use lowercase package name in `package.json`

## v2.0.1: 2015-01-02

+ Completely rewritten
+ Single custom delimiter (e.g., `?`) with `delimiter` option instead of
  `open`/`close` options
+ `include` now runtime function call instead of preprocessor directive
+ Variable-based includes now possible
+ Comment tag support (`<%#`)
* Data and options now separate params (i.e., `render(str, data, options);`)
- Removed support for filters

# TJ's releases

## 1.0.0: 2014-03-24

 * change: escape & even if it looks like an HTML entity. Don't try to prevent double-escaping.

## 0.8.6: 2014-03-21

 * fix: Escape & even if it looks like an HTML entity. Don't try to prevent double-escaping.

## 0.8.5: 2013-11-21

 * fix: Escape apostrophe & don't over-match existing entities
 * fix function name changed by uglify
 * fixes require, closes #78

## 0.8.4: 2013-05-08

  * fix support for colons in filter arguments
  * fix double callback when the callback throws
  * rename escape option

## 0.8.3: 2012-09-13

  * allow pre-compiling into a standalone function [seanmonstar]

## 0.8.2: 2012-08-16

  * fix include "open" / "close" options. Closes #64

## 0.8.1: 2012-08-11

  * fix comments. Closes #62 [Nate Silva]

## 0.8.0: 2012-07-25

  * add `<% include file %>` support
  * fix wrapping of custom require in build step. Closes #57

## 0.7.3: 2012-04-25

  * Added repository to package.json [isaacs]

## 0.7.1: 2012-03-26

  * Fixed exception when using express in production caused by typo. [slaskis]

## 0.7.0: 2012-03-24

  * Added newline consumption support (`-%>`) [whoatemydomain]

## 0.6.1: 2011-12-09

  * Fixed `ejs.renderFile()`

## 0.6.0: 2011-12-09

  * Changed: you no longer need `{ locals: {} }`

## 0.5.0: 2011-11-20

  * Added express 3.x support
  * Added ejs.renderFile()
  * Added 'json' filter
  * Fixed tests for 0.5.x

## 0.4.3: 2011-06-20

  * Fixed stacktraces line number when used multiline js expressions [Octave]

## 0.4.2: 2011-05-11

  * Added client side support

## 0.4.1: 2011-04-21

  * Fixed error context

## 0.4.0: 2011-04-21

  * Added; ported jade's error reporting to ejs. [slaskis]

## 0.3.1: 2011-02-23

  * Fixed optional `compile()` options

## 0.3.0: 2011-02-14

  * Added 'json' filter [Yuriy Bogdanov]
  * Use exported version of parse function to allow monkey-patching [Anatoliy Chakkaev]

## 0.2.1: 2010-10-07

  * Added filter support
  * Fixed _cache_ option. ~4x performance increase

## 0.2.0: 2010-08-05

  * Added support for global tag config
  * Added custom tag support. Closes #5
  * Fixed whitespace bug. Closes #4

## 0.1.0: 2010-08-04

  * Faster implementation [ashleydev]

## 0.0.4: 2010-08-02

  * Fixed single quotes for content outside of template tags. [aniero]
  * Changed; `exports.compile()` now expects only "locals"

## 0.0.3: 2010-07-15

  * Fixed single quotes

## 0.0.2: 2010-07-09

  * Fixed newline preservation

## 0.0.1: 2010-07-09

  * Initial release
