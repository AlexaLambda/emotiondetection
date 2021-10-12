import AWS from 'aws-sdk';


import { S3Client } from "@aws-sdk/client-s3";
// Set the AWS Region.
const REGION = "us-east-2"; //e.g. "us-east-1"

const s3sourceCredentials = new AWS.Credentials({
    accessKeyId: 'AKIAZRWM3E62IY2FBMWU',
    secretAccessKey: '485FVf7uqaj8sIdpYBq/Fnafk8aee1zNbiyFd2ft',
  });

// Create an Amazon S3 service client object.
const s3Client = new S3Client({ region: REGION,credentials : s3sourceCredentials});
//export { s3Client };


import { PutObjectCommand } from "@aws-sdk/client-s3";


//import 
import * as fs from 'fs';
const file = "C:/Users/mama272242/Desktop/Angry.jpg"; // Path to and name of object. For example '../myFiles/index.js'.
const fileStream = fs.createReadStream(file);

// Set the parameters
export const uploadParams = {
  Bucket: "myemotiondetected",
  // Add the required 'Key' parameter using the 'path' module.
  Key: 'ImageToDetectEmotion.jpg',
  // Add the required 'Body' parameter
  Body: fileStream,
};


// Upload file to specified bucket.
export const run = async () => {
  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Success", data);
    return data; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();

