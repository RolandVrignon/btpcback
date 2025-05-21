import {
  OCRImageObject,
  OCRPageObject,
} from '@mistralai/mistralai/models/components';
import { PrismaClient, ReferenceDocument } from '@prisma/client';

const prisma = new PrismaClient();

async function normalizeOcrImages() {
  // Find all ReferenceDocuments with a non-empty mistral_ocr_result array
  const docs = await prisma.$queryRawUnsafe<ReferenceDocument[]>(
    `SELECT
          id, title, secondary_title, key_s3_title, application_domain,
          application_domain_vector::text, category, mistral_ocr_result,
          official_version, organization, published_at, effective_date, path,
          mimetype, size, "createdAt", "updatedAt"
       FROM "ReferenceDocument"
       WHERE jsonb_typeof("mistral_ocr_result") = 'array'
         AND jsonb_array_length("mistral_ocr_result"::jsonb) > 0`,
  );

  console.log(`Found ${docs.length} documents with OCR result`);

  for (const doc of docs) {
    const ocrResult: OCRPageObject[] =
      doc.mistral_ocr_result as OCRPageObject[];

    let modified = false;

    for (const page of ocrResult) {
      if (page.images && Array.isArray(page.images) && page.images.length > 0) {
        for (const image of page.images) {
          const imageData: OCRImageObject = image;
          if (!imageData.imageBase64) continue;

          // Convert base64 to buffer
          const base64 = imageData.imageBase64.replace(
            /^data:image\/\w+;base64,/,
            '',
          );
          const buffer = Buffer.from(base64, 'base64');

          // Create ReferenceImage in DB
          const refImage = await prisma.referenceImage.create({
            data: {
              referenceDocumentId: doc.id,
              pageIndex: page.index,
              topLeftX: imageData.topLeftX,
              topLeftY: imageData.topLeftY,
              bottomRightX: imageData.bottomRightX,
              bottomRightY: imageData.bottomRightY,
              imageData: buffer,
            },
          });

          const oldId = imageData.id;
          imageData.id = refImage.id + '.jpeg';
          delete imageData.imageBase64; // Remove base64 from JSON

          // Replace old image id in markdown
          if (page.markdown) {
            // Use regex to replace all occurrences (in case of multiple)
            const regex = new RegExp(
              oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              'g',
            );
            page.markdown = page.markdown.replace(regex, imageData.id);
          }
          modified = true;
          console.log(
            `Document ${doc.id} page ${page.index}: image ${oldId} -> ${imageData.id}`,
          );
        }
        page.images = [];
      }
    }

    // Update the document if any modification was made
    if (modified) {
      await prisma.referenceDocument.update({
        where: { id: doc.id },
        data: { mistral_ocr_result: ocrResult },
      });

      console.log(`Updated ReferenceDocument ${doc.id}`);

      console.log(JSON.stringify(ocrResult, null, 2));
    }
  }
}

normalizeOcrImages()
  .then(() => {
    console.log('OCR image normalization completed.');
    void prisma.$disconnect();
  })
  .catch((err) => {
    console.error('Error during OCR image normalization:', err);
    void prisma.$disconnect();
    process.exit(1);
  });
