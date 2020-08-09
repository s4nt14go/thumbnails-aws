const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

const s3 = new AWS.S3();  // get reference to S3 client

exports.handler = async (event, _context, _callback) => {

  // Read options from the event parameter.
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
  const srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const filename    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  console.log('filename', filename);
  const dstBucket = srcBucket + "-resized";

  // Infer the image type from the file suffix.
  const typeMatch = filename.match(/\.([^.]*)$/);
  console.log('typeMatch', typeMatch);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType !== "jpeg" && imageType !== "jpg" && imageType !== "png") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  console.log('Download the image from the S3 source bucket');
  let origimage;
  try {
    const params = {
      Bucket: srcBucket,
      Key: filename
    };
    console.log('s3.getObject', params);
    origimage = await s3.getObject(params).promise();
    console.log('origimage', origimage);

  } catch (error) {
    return console.log('Download error:', error);
  }

  // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width  = 200;

  // Use the Sharp module to resize the image and save in a buffer.
  console.log('Resize the image');
  try {
    var buffer = await sharp(origimage.Body).resize(width).toBuffer();

  } catch (error) {
    console.log('Resize error:', error);
    return;
  }

  // Upload the thumbnail image to the destination bucket
  console.log('dstBucket', dstBucket);
  try {
    const destparams = {
      Bucket: dstBucket,
      Key: filename,
      Body: buffer,
      ContentType: "image"
    };

    const putResult = await s3.putObject(destparams).promise();

    console.log('Successfully resized ' + srcBucket + '/' + filename +
      ' and uploaded to ' + dstBucket + '/' + filename, putResult);

  } catch (error) { return console.log('s3.putObject error:', error); }
};
