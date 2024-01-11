'use strict';
import * as functions from 'firebase-functions';
const gcs = require('@google-cloud/storage')
//const gcs = Storage();

import { tmpdir } from 'os';
import { join } from 'path';

import * as sharp from 'sharp';
import * as fs from 'fs-extra';

export const generateThumbs = functions.storage
.object()
.onFinalize(async object => {
    const path = require('path');
    const bucket = gcs.bucket(object.bucket);
    const filePath = object.name;
    const fileName  = path.basename(filePath);
    const bucketDir = path.dirname(filePath);

    const workingDir = join(tmpdir(), 'thumbs');
    const tmpFilePath = join(workingDir, 'source.png');

    if (fileName.includes('thumb@')) {
      console.log('exiting function');
      return false;
    }

    if (fileName.includes('image')) {
      console.log('exiting function');
      return false;
    }

    // 1. Ensure thumbnail dir exists
    await fs.ensureDir(workingDir);

    // 2. Download Source File
    await bucket.file(filePath).download({
      destination: tmpFilePath
    });

    // 3. Resize the images and define an array of upload promises
    const sizes = [128, 256];

    const uploadPromises = sizes.map(async size => {
      const thumbName = `thumb@${size}_${fileName}`;
      const thumbPath = join(workingDir, thumbName);

      // Resize source image
      await sharp(tmpFilePath)
        .resize(size, size)
        .toFile(thumbPath);

      await bucket.file(thumbPath).getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      }).then((signedUrls: any[]) => {
        console.log('Signed URL: ', signedUrls[0]);
      });

      // Upload to GCS
      return bucket.upload(thumbPath, {
        destination: join(bucketDir, thumbName)
      });
    });

    // 4. Run the upload operations
    await Promise.all(uploadPromises);

    // 5. Cleanup remove the tmp/thumbs from the filesystem
    return fs.remove(workingDir);
  });
