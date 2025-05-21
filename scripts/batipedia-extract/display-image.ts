import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function displayReferenceImage(imageId: string, outputPath: string) {
  // Fetch the image from the database
  const refImage = await prisma.referenceImage.findUnique({
    where: { id: imageId },
    select: { imageData: true },
  });

  if (!refImage || !refImage.imageData) {
    console.error('Image not found or imageData is empty');
    return;
  }

  // Write the buffer to a file
  fs.writeFileSync(outputPath, refImage.imageData);
  console.log(`Image written to ${outputPath}`);
}

// Replace with your ReferenceImage id (without .jpeg)
const imageId = 'cmaxq65jz001tqko2v5dj26wh';
const outputPath = 'outpuut.jpeg';

if (!imageId) {
  console.error('Usage: ts-node display-image.ts <imageId> [outputPath]');
  process.exit(1);
}

displayReferenceImage(imageId, outputPath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
