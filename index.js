var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Writer = require('broccoli-writer');
var helpers = require('broccoli-kitchen-sink-helpers');

module.exports = Rev;

function Rev(inputTree, options) {
  if (!(this instanceof Rev))
    return new Rev(inputTree, options);

  options = options || {};

  this.revision = options.revision || null;
  this.hashLength = options.hashLength || 8;
  this.manifestFile = options.manifestFile || '/rev-manifest.json';
  this.inputTree = inputTree;
}

Rev.prototype = Object.create(Writer.prototype);
Rev.prototype.constructor = Rev;

Rev.prototype.write = function (readTree, destDir) {
  var revision = this.revision;
  var hashLength = this.hashLength;
  var manifestFile = this.manifestFile;

  return readTree(this.inputTree).then(function (srcDir) {
    var manifestMap = {};

    getFilesRecursively(srcDir, [ '**/*' ]).forEach(function (file) {
      var srcFile = path.join(srcDir, file);
      var stat = fs.lstatSync(srcFile);

      if (!stat.isFile() && !stat.isSymbolicLink())
        return;

      var fileRev = revision || makeHash(getFileContents(srcFile, stat)).substring(0, hashLength);
      var revvedFile = addSuffixBeforeExt(file, '-' + fileRev);
      var destFile = path.join(destDir, revvedFile);

      mkdirp.sync(path.dirname(destFile));
      helpers.copyPreserveSync(srcFile, destFile, stat);

      // Record the rev'd file name in the manifest.
      manifestMap[file] = revvedFile;
    });

    var manifestJson = JSON.stringify(manifestMap, null, 2);

    fs.writeFileSync(path.join(destDir, manifestFile), manifestJson);
  });
};

// Expose.
Rev.Rewriter = Rev.rewriter = Rewriter;

function Rewriter(inputTree, options) {
  if (!(this instanceof Rewriter))
    return new Rewriter(inputTree, options);

  options = options || {};

  this.inputFile = options.inputFile;
  this.outputFile = options.outputFile;
  this.manifestFile = options.manifestFile || '/rev-manifest.json';
  this.context = options.context || {};
  this.inputTree = inputTree;
}

Rewriter.prototype = Object.create(Writer.prototype);
Rewriter.prototype.constructor = Rewriter;

Rewriter.prototype.write = function (readTree, destDir) {
  var inputFile = this.inputFile;
  var outputFile = this.outputFile;
  var manifestFile = this.manifestFile;
  var context = mergeProperties({}, this.context);

  return readTree(this.inputTree).then(function (srcDir) {
    var srcTemplateFile = path.join(srcDir, inputFile);
    var srcManifestFile = path.join(srcDir, manifestFile);
    var srcFiles = getFilesRecursively(srcDir, [ '**/*' ]);

    var template = fs.readFileSync(srcTemplateFile, 'utf8');
    var manifest = JSON.parse(fs.readFileSync(srcManifestFile, 'utf8'));

    // Provide a "rev" helper to the template that returns the
    // revved version of a given file path.
    var options = {
      helpers: {
        rev: function (path) {
          return manifest[path];
        }
      }
    };

    // Write the rendered template file.
    fs.writeFileSync(path.join(destDir, outputFile), renderTemplate(template, context, options));

    // Copy all other files verbatim.
    srcFiles.forEach(function (file) {
      var srcFile = path.join(srcDir, file);

      // Ignore the template and manifest files.
      if (srcFile === srcTemplateFile || srcFile === srcManifestFile)
        return;

      var destFile = path.join(destDir, file);
      var stat = fs.lstatSync(srcFile);

      if (stat.isFile() || stat.isSymbolicLink()) {
        mkdirp.sync(path.dirname(destFile));
        helpers.copyPreserveSync(srcFile, destFile, stat);
      }
    });
  });
};

function addSuffixBeforeExt(fileName, suffix) {
  var ext = path.extname(fileName);
  return path.join(path.dirname(fileName), path.basename(fileName, ext) + suffix + ext);
}

var crypto = require('crypto');

function makeHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

var Handlebars = require('handlebars');

function renderTemplate(template, context, options) {
  return Handlebars.compile(template)(context, options);
}

function getFilesRecursively(dir, globPatterns) {
  return helpers.multiGlob(globPatterns, { cwd: dir });
}

function getFileContents(file, stat) {
  return stat.isFile() ? fs.readFileSync(file, arguments[2]) : fs.readlinkSync(file, arguments[2]);
}

function mergeProperties(object, properties) {
  for (var property in properties) {
    if (properties.hasOwnProperty(property))
      object[property] = properties[property];
  }

  return object;
}
