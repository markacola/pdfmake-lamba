/**
 * Lib
 */
aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var PdfPrinter = require('pdfmake/src/printer');
var fs = require('fs');
var uuid = require('uuid');
var bl = require('bl');
var _ = require('lodash');

var fonts = {
    Lato: {
        normal: __dirname+'/fonts/Lato-Regular.ttf',
        bold: __dirname+'/fonts/Lato-Bold.ttf',
        italics: __dirname+'/fonts/Lato-Italic.ttf',
        bolditalics: __dirname+'/fonts/Lato-BoldItalic.ttf'
    },
    Oswald: {
        normal: __dirname+'/fonts/Oswald-Regular.ttf',
        italics: __dirname+'/fonts/Oswald-RegularItalic.ttf',
        bold: __dirname+'/fonts/Oswald-Bold.ttf',
        bolditalics: __dirname+'/fonts/Oswald-BoldItalic.ttf'
    }
};

module.exports.respond = function(event, cb) {

  this.prepareTemplate( event, function ( err, event ) {

    if ( err ) { return cb( err ); }

    module.exports.transformDefinition( event.doc, event.context );

    var printer = new PdfPrinter(fonts);
    var doc = printer.createPdfKitDocument( event.doc );
    doc.end();

    doc.pipe(
      bl(function (err, data) {
        s3.putObject({
          Bucket: 'pdfmake-lambda',
          Key: uuid.v4()+'.pdf',
          Body: data,
          ACL: 'public-read',
          Expires: Date.now()+1000*60*60*24,
          ContentLength: data.length
        }, function(err, response) {
          if (err) return cb(err);

          var params = this.request.params;

          return cb( null, {
            message: 'PDF generated successfully!',
            url: 'http://' + params.Bucket + '.s3.amazonaws.com/' + params.Key
          });

        });
      })
    )

  });

};

module.exports.prepareTemplate = function ( event, cb ) {

  if ( event.docTemplate && !event.doc ) {

    s3.getObject({
      Bucket: 'pdfmake-lambda',
      Key: 'templates/'+event.docTemplate+'.json'
    }, function(err, data) {
      if (err) {return cb( err );}

      event.doc = JSON.parse(data.Body.toString());

      cb( null, event );

    });

  } else {

    cb( null, event );

  }

}

module.exports.transformDefinition = function ( doc, context) {

  return walkStrings( doc, function (item) {

    if ( _.isString(item) ) {
      return _.template(item)(context);
    }

    return item;

  });

}

function walkStrings( object, transformer ) {

  if ( _.isArray( object ) ) {

    object.forEach( function (item, index) {
      object[index] = walkStrings( item, transformer );
    });

  } else if ( _.isObject( object ) ) {

    _.forOwn( object, function (v, key) {
      object[key] = walkStrings( v, transformer );
    });

  } else {

    return transformer( object );

  }

  return object;

}
