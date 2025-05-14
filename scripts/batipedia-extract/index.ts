import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
dotenv.config();

// Set your AWS credentials here
const REGION = process.env.AWS_REGION || 'eu-north-1';
console.log('REGION:', REGION);
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'VOTRE_ACCESS_KEY_ID';
console.log('ACCESS_KEY_ID:', ACCESS_KEY_ID);
const SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY || 'VOTRE_SECRET_ACCESS_KEY';
console.log('SECRET_ACCESS_KEY:', SECRET_ACCESS_KEY);
const BUCKET_NAME = 'batipedia-files';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});
const DOWNLOAD_DIR = '/home/rolexx/Documents/batipedia-files';
const streamPipeline = promisify(pipeline);

const FILES_LIMIT: number | null = 3;

async function main() {
  try {
    // List all objects in the bucket
    const listResponse = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET_NAME }),
    );
    const files = listResponse.Contents || [];

    // Apply the limit if set
    const filesToProcess =
      FILES_LIMIT === null ? files : files.slice(0, FILES_LIMIT);

    for (const fileObj of filesToProcess) {
      if (!fileObj.Key) continue;
      const key = fileObj.Key;
      const localPath = path.join(DOWNLOAD_DIR, path.basename(key));
      try {
        // Download the file from S3
        const getObjectResponse = await s3.send(
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
        );
        if (!getObjectResponse.Body) throw new Error('No body in S3 response');
        const fileStream = fs.createWriteStream(localPath);
        await streamPipeline(
          getObjectResponse.Body as NodeJS.ReadableStream,
          fileStream,
        );
        console.log(`Downloaded ${key} to ${localPath}`);
        // Remove the file after download
        // fs.unlinkSync(localPath);
        // console.log(`Deleted ${localPath}`);
      } catch (err) {
        console.error(`Error processing ${key}:`, err);
      }
    }
  } catch (err) {
    console.error('Error listing objects:', err);
  }
}

main().catch(console.error);
