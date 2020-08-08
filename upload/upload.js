"use strict";
require('dotenv').config();
const AWS = require("aws-sdk");
const s3 = new AWS.S3({ signatureVersion: "v4" });

exports.handler = async (event, _context) => {

  console.log('event', event);
  console.log('event.queryStringParameters', event.queryStringParameters);

  const key = event.queryStringParameters.fileName;   // Reading the file name from the request.

  try {
    console.log(process.env.S3_BUCKET);
    const params = {    // Params object for creating the
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: "multipart/form-data",
      Expires: 60  // Epiration Time of the presignedUrl in seconds
    };

    const preSignedURL = await s3.getSignedUrl("putObject", params);    // Creating the presigned Url
    return {
      statusCode: 200,
      headers: {
        "access-control-allow-origin": "*"
      },
      body: JSON.stringify({
        fileUploadURL: preSignedURL
      })
    };

  } catch (e) {
    return {
      err: e.message,
      headers: {
        "access-control-allow-origin": "*"
      },
      body: "error occured"
    };
  }
};
