var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var pdfmake = require('pdfmake');
var uuid = require('uuid');

exports.handler = function(event, context) {

  var printer = new pdfmake();
  var doc = printer.createPdfKitDocument( event.doc );
  doc.end();

  s3.putObject({
    Bucket: 'pdfmake-lambda',
    Key: uuid.v4()+'.pdf',
    Body: doc,
    ContentLength: doc._offset
  }, function(err, response) {
    if (err) {
      console.log(err);
      context.fail(err);
    } else {
      console.log( JSON.stringify(response) );
      context.succeed();
    }
  });
};
