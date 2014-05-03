## broccoli-rev

A [Broccoli](https://github.com/joliss/broccoli) plugin that adds the checksum of files to the output filename.

### Usage

```js
var rev = require('broccoli-rev');

var revvedTree = rev(myTree, {

  // The length to use for the has that is appended to the filename
  // immediately before the file extension. Defaults to 8.
  hashLength: 10,

  // The name of a file in the destination directory that will be created
  // that contains a mapping of unrevved filenames to their revved versions.
  // This is useful for doing search & replace in files that reference revved
  // files later on. Defaults to "rev-manifest.json".
  manifestFile: 'rev-manifest.json'

});
```

### License

MIT
