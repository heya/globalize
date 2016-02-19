# `heya-globalize`

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]


This utility is a simple source transformer for JavaScript modules written using either a Heya-style UMD prologue, or a simple AMD prologue.
It produces JavaScript modules, which use globals as their dependences and exports. Such modules can be directly including into HTML with
`<script>`, or concatenated and minified by a builder of your choice.

## Install

```sh
npm install --save-dev heya-globalize
```

## Usage

For simplicity `heya-globalize` does not install a global command opting to be called directly:

```sh
node node_modules/heya-globalize/index.js
```

This command will convert all files that is detected as Heya-style UMD or simple AMD to globals copying them to a folder of your choice (`dist` by default).

It is adviseable to add it to a `package.json` file of a project in question in `scripts` section, so it is always available:

```js
{
  // ... package.json settings ...
  "scripts": {
    // ... project-specific scripts ...
    "dist": "node node_modules/heya-globalize/index.js"
  },
  // ... more package.json settings ...
}
```

This script can be invoked like that:

```sh
npm run dist
```

It is possible to run the script on at lifecycle events, e.g., after installing that package, or integrate with existing project tooling,
such as `grunt` or `gulp` runners. See [npm-scripts](https://docs.npmjs.com/misc/scripts) for more details on scripts.

## Configuration

The converter takes its configuraton from two sources:

* `package.js` with following sections used:
  * [`browser`](https://github.com/defunctzombie/package-browser-field-spec) to rename/skip files, while preparing a distribution for a browser.
    * [`main`](https://docs.npmjs.com/files/package.json#main) can be used indirectly by `browser` section.
    * [`name`](https://docs.npmjs.com/files/package.json#name) to provide a default for a global variable that will host package modules.
  * `browserGlobals` to define how modules mapped to globals. This section is described in details below.
* `bower.json` with following sections used:
  * [`ignore`](https://github.com/bower/spec/blob/master/json.md#ignore) to skip files, while preparing a distribution for a browser.

### `browserGlobals`

This section of `package.json` can contain a simple key/value pairs as an object, where keys are module names, and values are corresponding
globals. If a module is not listed there, its parents will be checked. If a parent is specified, it will be used to form an accessor.

There are two special keys:

* `!root` &mdash; a root variable to resolve all local modules. For example, if `!root` is  `heya.example`, `./a` will be resolved as `heya.example.a`.
  Default: `name` of the package taken from `package.json`.
* `!dist` &mdash; a folder name where to copy all transformed files. Default: `dist`.

Some modules modify existing packages by augmented their exports. They do not create their own globals using existing ones. In this case,
a value of such module should be a global variable to use when referring to this module, but it should be prefixed with `'!'`.
This prefix means that modules result is not assigned anywhere on its definition, the rest defines how to access it.

External modules should be always resolved explicitly in `browserGlobals`.

#### Example #1

We have five modules:

1. `./box`, which defines the main functionality,
2. `./boxExt`, which extends the main functionality,
   * Depends on `./box`.
3. `./wrench` is a simple module.
4. `./belt/utils`, which provides some additional functionality,
5. `./belt/utils/hammer/small`, which is a specialized algorithm.
   * Depends on `./boxExt`, and modules from an external package `anvil`.

We know that `anvil` uses a global variable `window.anvil`. We want our package to be anchored at `window.heya.box`,
our main module `./box` should map to that variable as well, as `./boxExt`, and all modules below `./belt/utils` should be anchored at `window.toolbox`.
This is how our `browserGlobals` should look like:

```js
{
  // ... package.json settings ...
  "browserGlobals": {
    "!root":        "heya.box",
    "./box":        "heya.box",
    "./boxExt":     "!heya.box",
    "./belt/utils": "toolbox",
    "anvil":        "anvil"
  },
  // ... more package.json settings ...
}
```

With this configuration our modules are mapped to globals like that:

```txt
./box                     => heya.box
./boxExt                  => heya.box
./wrench                  => heya.box.wrench
./belt/utils              => toolbox
./belt/utils/hammer/small => toolbox.hammer.small
anvil/x                   => anvil.x
anvil/y/z                 => anvil.y.z
```

#### Example #2: dcl

A possible map for the main part of [dcl](https://github.com/uhop/dcl) to accommodate existing (as of 1.1.3) globals:

```js
{
  // ... package.json settings ...
  "browserGlobals": {
    "!root":       "dcl",
    "./mini":      "dcl",
    "./legacy":    "dcl",
    "./dcl":       "!dcl",
    "./debug":     "dclDebug",
    "./advise":    "advise",
    "./inherited": "!dcl.inherited"
  },
  // ... more package.json settings ...
}
```

#### Example #3: super simple

For a simple mapping of all local files to a single root variable, we don't need to specify anything. For example,
if our module is called `our-core`, following modules will be mapped like that:

```txt
./a     => window["our-core"].a
./b     => window["our-core"].b
./b/c   => window["our-core"].b.c
./d/e/f => window["our-core"].d.e.f
```

Note that `our-core` is used as an anchor variable for all modules, but it is not an identifier in a JavaScript sense,
so it is used with `[]` notation, rather than a dot notation.

Let's fix it, and assign a simple root variable:

```js
{
  // ... package.json settings ...
  "browserGlobals": {
    "!root": "kore"
  },
  // ... more package.json settings ...
}
```

Now our modules will be mapped like that:

```txt
./a     => kore.a
./b     => kore.b
./b/c   => kore.b.c
./d/e/f => kore.d.e.f
```

### Algorithm

The precise algorithm works like that:

1. `package.json` and `bower.json` are read from the current directory. The latter is optional.
2. All `*.js` files are collected from the current directory recursively.
3. Certain directories are always excluded:
   1. `node_modules`
   2. `bower_components`
   3. The `dist` directory (can be overridden in `!dict` value of `browserGlobals` section of `package.json`).
4. Directories and files from `ignore` section of `bower.json`, if any, are excluded too.
5. The remaining files are processed one by one. The result of a successful transformation is copied to
   `dist` directory (can be overridden in `!dict` value of `browserGlobals` section of `package.json`)
   preserving the directory structure.

The latter step means that files are copied like that:

```txt
./a.js    => ./dist/a.js
./b.js    => ./dist/b.js
./b/c.js  => ./dist/b/c.js
.d/e/f.js => ./dist/d/e/f.js
```

When files are processed they are checked against a standard Heya-style UMD header (it covers both AMD and CommonJS-style modules,
but no globals), ar a simple AMD header (the very first line starts with `define(`, and lists all dependencies as an array of strings).
If a file is not identified as one of those, it is ignored and skipped.

While resolving module names, the directory structure is preserved as well, and reflected as subobjects using
a dot or `[]` notation (whichever is more appropriate). Important details:

* All local modules are assumed to be anchored at `!root` variable specified in `browserGlobals`.
* All modules are checked against `browserGlobals`, and if it is there, the specified variable is used.
* Otherwise all parents are checked agaist `browserGlobals`, and the closest parent's variable is used for the rest as an anchor.

#### Example #4: multiple parents

```js
{
  // ... package.json settings ...
  "browserGlobals": {
    "!root":   "kore",
    "./b":     "kore.base",
    "./b/c/d": "kore.bcd"
  },
  // ... more package.json settings ...
}
```

Given this map we can resolve following modules like that:

```txt
./a         => kore.a
./b/a       => kore.base.a
./b/c       => kore.base.c
./b/c/d/e   => kore.bcd.e
./b/c/d/e/f => kore.bcd.e.f
```

External modules are resolved the same way as local modules, but they require that at least top-level package names were defined,
because they cannot use `!root` to form a name.

#### Example #5: transforms

This is complete example, which shows original and transformed sources. The config is:

```js
{
  // ... package.json settings ...
  "browserGlobals": {
    "!root": "heya.example",
    "boom":  "BOOM",
    "./d":   "!heya.D",
    "./f":   "!heya.F"
  },
  // ... more package.json settings ...
}
```

`a.js` was copied to `dist/a.js`:

```js
// before
/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["./b", "./c"], function(b, c){});

// after
(function(_,f){window.heya.example.a=f(window.heya.example.b,window.heya.example.c);})
(["./b", "./c"], function(b, c){});
```

`b.js` was copied to `dist/b.js`:

```js
// before
/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(["./c"], function(c){});

// after
(function(_,f){window.heya.example.b=f(window.heya.example.c);})
(["./c"], function(c){});
```

`c.js` is copied to `dist/c.js`:

```js
// before
/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function(){});

// after
(function(_,f,g){g=window;g=g.heya||(g.heya={});g=g.example||(g.example={});g.c=f();})
([], function(){});
```

`d.js` is copied to `dist/d.js` (note that this file includes `module` object, two modules from a declared external module `boom`,
and an undeclared one `wham!` &mdash; the undeclared one will generate a warning):

```js
// before
define(['module', 'boom', 'boom/Hello-World', 'wham!'], function(module, boom, hello, wham){});

// after
(function(_,f,m){m={};m.id=m.filename="./d";f(m,window.BOOM,window.BOOM["Hello-World"],window["wham!"]);})
(['module', 'boom', 'boom/Hello-World', 'wham!'], function(module, boom, hello, wham){});
```

`e.js` is copied to `dist/e.js`:

```js
// before
define(['./d'], function(d){});

// after
(function(_,f){window.heya.example.e=f(window.heya.D);})
(['./d'], function(d){});
```

`f.js` is copied to `dist/f.js`:

```js
// before
define(["./b", "./c"], function(b, c){});

// after
(function(_,f){f(window.heya.example.b,window.heya.example.c);})
(["./b", "./c"], function(b, c){});
```

As can be seen, the same module functions are used with new prologues, which replaces `define()` or an Heya-style UMD prologue,
which itself approximates `define()` as well. New prologues form identical arguments using globals, and assign their results to
correct global variables.

## Versions

1.0.0 &mdash; *the initial public release*

## License

BSD


[npm-image]:      https://img.shields.io/npm/v/heya-globalize.svg
[npm-url]:        https://npmjs.org/package/heya-globalize
[deps-image]:     https://img.shields.io/david/heya/globalize.svg
[deps-url]:       https://david-dm.org/heya/globalize
[dev-deps-image]: https://img.shields.io/david/dev/heya/globalize.svg
[dev-deps-url]:   https://david-dm.org/heya/globalize#info=devDependencies
[travis-image]:   https://img.shields.io/travis/heya/globalize.svg
[travis-url]:     https://travis-ci.org/heya/globalize
