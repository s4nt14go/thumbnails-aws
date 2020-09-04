// region --------------------------------------------------- region Resize dependencies
const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');
// endregion

// region --------------------------------------------------- Write to AppSync dependencies
require('dotenv').config();
const appsync = require('aws-appsync');
const gql = require('graphql-tag');
require('cross-fetch/polyfill');
// endregion

// region --------------------------------------------------- Resize initialization
const s3 = new AWS.S3();  // get reference to S3 client
// enregion

// region --------------------------------------------------- Write to AppSync initialization
console.log('APPSYNC_ENDPOINT_URL', process.env.APPSYNC_ENDPOINT_URL);
console.log('AWS_REGION', process.env.AWS_REGION);
console.log('APPSYNC_API_KEY', process.env.APPSYNC_API_KEY);
const graphqlClient = new appsync.AWSAppSyncClient({
  url: process.env.APPSYNC_ENDPOINT_URL,
  region: process.env.AWS_REGION,
  auth: {
    type: 'API_KEY',
    apiKey: process.env.APPSYNC_API_KEY,
  },
  disableOffline: true
});
// endregion

exports.handler = async (event, _context, callback) => {

  // region --------------------------------------------------- Resize
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
  if (!typeMatch) { return console.log("Could not determine the image type."); }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType !== "jpeg" && imageType !== "jpg" && imageType !== "png") {
    return console.log(`Unsupported image type: ${imageType}`);
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

  } catch (error) { return console.log('Download error:', error); }

  // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width  = 200;

  // Use the Sharp module to resize the image and save in a buffer.
  console.log('Resize the image');
  let buffer;
  try {
    buffer = await sharp(origimage.Body).resize(width).toBuffer();
  } catch (error) { return console.log('Resize error:', error); }

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
  // endregion

  // region --------------------------------------------------- Write to AppSync
  async function mutate() {
    const mutation = gql`mutation CreateUrl(
      $input: CreateResizedUrlInput!
    ) {
      createResizedUrl(input: $input) {
        id
        url
      }
    }`;

    console.log(graphqlClient);

    const response = await graphqlClient.mutate({
      mutation,
      variables: {
        input: {
          url: `https://${dstBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`,
        }
      }
    });

    console.log('response', response);
  }

  mutate();
  // endregion

  callback(null, {
    statusCode: '200',
    body: `Resized and mutated to AppSync successfully!!`,
  });

};
