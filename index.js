var fs = require('fs');
var path = require('path');
var Writer = require('broccoli-writer');
var helpers = require('broccoli-kitchen-sink-helpers');
var mkdirp = require('mkdirp');

module.exports = Rev;

function Rev(inputTree, manifestFile, hashLength) {
  if (!(this instanceof Rev))
    return new Rev(inputTree, hashLength);

  this.hashLength = hashLength || 8;
  this.manifestFile = manifestFile || 'rev-manifest.json';
  this.inputTree = inputTree;
}

Rev.prototype = Object.create(Writer.prototype);
Rev.prototype.constructor = Rev;

Rev.prototype.write = function (readTree, destDir) {
  var hashLength = this.hashLength;
  var manifestFile = this.manifestFile;
  var inputTree = this.inputTree;

  return readTree(inputTree).then(function (srcDir) {
    var inputFiles = helpers.multiGlob([ '**' ], { cwd: srcDir });
    var manifestMap = {};

    inputFiles.forEach(function (inputFile) {
      var originalInputFile = inputFile;
      var srcFile = path.join(srcDir, inputFile);
      var srcStat = fs.lstatSync(srcFile);

      var hash;
      if (srcStat.isFile()) {
        hash = makeHash(fs.readFileSync(srcFile));
      } else if (srcStat.isSymbolicLink()) {
        hash = makeHash(fs.readlinkSync(srcFile));
      } else {
        return;
      }

      // Append "-hash" to the file name, just before the extension.
      inputFile = addSuffixBeforeExt(inputFile, '-' + hash.substring(0, hashLength));

      var destFile = path.join(destDir, inputFile);

      mkdirp.sync(path.dirname(destFile));
      helpers.copyPreserveSync(srcFile, destFile, srcStat);

      manifestMap[originalInputFile] = inputFile;
    });

    var manifestJson = JSON.stringify(manifestMap, null, 2);

    fs.writeFileSync(path.join(destDir, manifestFile), manifestJson);
  });
};

var crypto = require('crypto');

function makeHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function addSuffixBeforeExt(fileName, suffix) {
  var ext = path.extname(fileName);
  return path.join(path.dirname(fileName), path.basename(fileName, ext) + suffix + ext);
}
