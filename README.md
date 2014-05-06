## broccoli-rev

A [Broccoli](https://github.com/joliss/broccoli) plugin that adds the checksum of files to the output filename. This is useful in situations where you need unique names for asset files so you can bust HTTP caches.

### Usage

broccoli-rev is actually two plugins in a single module.

The first plugin (called `rev`) maps every file in the input tree to a file with the same name + a hash of the file's contents. For example, a file named `styles/fonts.css` in the input tree might be named `styles/fonts-83f26306.css` in the output. This step also generates a manifest file in the output that contains a map of all the original file paths to their new versions.

```js
var rev = require('broccoli-rev');

var revvedTree = rev(myTree, {

  // The length to use for the hash that is appended to the filename
  // immediately before the file extension. Defaults to 8.
  hashLength: 8,

  // The name of a file in the destination directory that will be created
  // that contains a mapping of unrev'd filenames to their rev'd versions.
  // This is useful for doing search & replace in files that reference rev'd
  // files later on. Defaults to "/rev-manifest.json".
  manifestFile: '/rev-manifest.json'

});
```

The second plugin in this module is optional, but represents a common use case. Basically, it takes the manifest file from the first step and interpolates its values into a Handlebars template using a `rev` helper function.

For example, let's say you're generating an HTML page that includes a JavaScript file that you want to manage using broccoli-rev. Your `index.hbs` file might look like this:

```handlebars
<!DOCTYPE html>
<html>
  <head>
    <script src="{{ rev "built-scripts/navigation.js" }}"></script>
  </head>
  <body></body>
</html>
```

You might also have a `scripts` directory that contains source versions of all the scripts you want to run on your HTML page. In this scenario, you could use the following `Brocfile.js` to build rev'd versions of the scripts and interpolate the rev'd file names into the template for `index.html`.

```js
var pickFiles = require('broccoli-static-compiler');
var mergeTrees = require('broccoli-merge-trees');
var rev = require('broccoli-rev');

var indexTree = pickFiles('templates', {
  srcDir: '/',
  destDir: '/',
  files: [ 'index.hbs' ]
});

// scriptsTree is a rev'd version of all files in the scripts
// source directory + the rev-manifest.json file.
var scriptsTree = rev(pickFiles('scripts', {
  srcDir: '/',
  destDir: '/built-scripts'
}));

var indexAndScriptsTree = mergeTrees([ indexTree, scriptsTree ]);

// Render index.hbs => index.html using a rev Handlebars helper
// function that looks up paths in the rev-manifest.json file.
module.exports = rev.rewriter(indexAndScriptsTree, {
  inputFile: 'index.hbs',
  outputFile: 'index.html'
});
```

### License

MIT
