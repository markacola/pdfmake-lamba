var fs = require('fs');
var archiver = require('archiver');

var archive = archiver.create('zip', {});

archive.on('error', function(err) {
  throw err;
});

var output = fs.createWriteStream(__dirname + '/../pdfmake-lambda.zip');

output.on('close', function() {
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive
  .directory('node_modules')
  .file('index.js')
  .pipe( output );

archive.finalize();
