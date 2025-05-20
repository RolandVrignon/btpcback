import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient, ReferenceDocument } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import {
  OCRPageObject,
  OCRResponse,
  OCRUsageInfo,
} from '@mistralai/mistralai/models/components';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'VOTRE_ACCESS_KEY_ID',
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || 'VOTRE_SECRET_ACCESS_KEY',
  },
});

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({
  apiKey: apiKey,
});

const prisma = new PrismaClient();

let globalOcrCost = 0;

function anonymizeText(text: string) {
  // Remove the full block (paragraph) if present
  let anonymizedText = text.replace(
    /Ce document est à usage exclusif et non collectif\s*Société : BTP CONSULTANTS\s*\$\\Delta \\mathrm\{N\}\^\{\\circ\}\$ client : BTP CONSULTANTS\s*\$\\pm\$ Téléchargé le : .*/gm,
    '',
  );

  // Replace "Editions pour BTP CONSULTANTS le 28/02/2025 14:19" by ''
  anonymizedText = anonymizedText.replace(
    /CSTB Editions pour BTP CONSULTANTS le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/g,
    '',
  );

  // Replace "Hédi Calabrese - hedi.calabrese@btp-consultants.fr" by ''
  anonymizedText = anonymizedText.replace(
    /Hédi Calabrese - hedi\.calabrese@btp-consultants\.fr/g,
    '',
  );

  // Replace "Société : BTP CONSULTANTS" by ''
  anonymizedText = anonymizedText.replace(/Société : BTP CONSULTANTS/g, '');
  // Replace "$\Delta \mathrm{N}^{\circ}$ client : BTP CONSULTANTS" by ''
  anonymizedText = anonymizedText.replace(
    /\$\\Delta \\mathrm\{N\}\^\{\\circ\}\$ client : BTP CONSULTANTS/g,
    '',
  );

  // Replace "BTP CONSULTANTS" by ''
  anonymizedText = anonymizedText.replace(/BTP CONSULTANTS/g, '');
  // Optionally, you can also blank the download date line
  anonymizedText = anonymizedText.replace(/Téléchargé le : .*/g, '');

  anonymizedText = anonymizedText.replace(/Hédi Calabrese/g, '');

  //Replace Hédi by 'Un utilisateur'
  anonymizedText = anonymizedText.replace(/Hédi/g, '');

  // Replace Calabrese by ''
  anonymizedText = anonymizedText.replace(/Calabrese/g, '');

  return anonymizedText;
}

async function processDocument(
  doc: ReferenceDocument,
  docIndex: number,
  limit: number,
) {
  if (!doc || !doc.key_s3_title) return;
  const key = doc.key_s3_title;
  const docId = doc.id;

  try {
    console.log(`Processing document ${docIndex + 1} / ${limit}`);
    // Génère une URL présignée pour le PDF
    const presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: 'batipedia-files', Key: key }),
      { expiresIn: 3600 },
    );

    const ocrResponse: OCRResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: presignedUrl,
      },
      includeImageBase64: true,
    });
    // Additionne le coût OCR (pagesProcessed / 1000)
    const usage: OCRUsageInfo = ocrResponse.usageInfo;
    if (usage && typeof usage.pagesProcessed === 'number') {
      const ocrCost = usage.pagesProcessed / 1000;
      globalOcrCost += ocrCost;
    }

    // Anonymise chaque page
    const anonymizedPages = ocrResponse.pages.map((page: OCRPageObject) => ({
      ...page,
      markdown: anonymizeText(page.markdown),
    }));
    // Sauvegarde en base dans mistral_ocr_result
    await prisma.referenceDocument.update({
      where: { id: docId },
      data: { mistral_ocr_result: anonymizedPages },
    });
    console.log(`Document ${docId} updated with mistral_ocr_result.`);
  } catch (err) {
    console.error(`Error processing ${key}:`, err);
  }
}

async function main() {
  console.time('Total processing time');
  // Sélectionne tous les documents où mistral_ocr_result = {} (champ JSON vide)
  const docs: ReferenceDocument[] = await prisma.$queryRawUnsafe(`
    SELECT id, title, secondary_title, key_s3_title, category, mistral_ocr_result,
           application_domain, application_domain_vector::text
    FROM "ReferenceDocument"
    WHERE mistral_ocr_result = '{}'::jsonb
  `);

  console.log(`We found ${docs.length} documents to process`);

  const limit = docs.length;
  //   const limit = 1;
  console.log(`Processing ${limit} documents`);

  //For first doc, print the ocrResponse
  const doc = docs[0];

  console.log('doc', JSON.stringify(doc.mistral_ocr_result, null, 2));

  const concurrency = 5;
  let currentIndex = 0;
  let running = 0;

  return new Promise<void>((resolve) => {
    function launchNext() {
      if (currentIndex >= limit && running === 0) {
        console.timeEnd('Total processing time');
        resolve();
        return;
      }
      while (running < concurrency && currentIndex < limit) {
        const doc = docs[currentIndex];
        running++;
        processDocument(doc, currentIndex, limit)
          .catch((err) => console.error('Error in processDocument:', err))
          .finally(() => {
            running--;
            launchNext();
          });
        currentIndex++;
      }
    }
    launchNext();
  });
}

main()
  .catch(console.error)
  .finally(() => {
    console.log('Closing Prisma connection...');
    console.log(`\n====> Global OCR cost: $${globalOcrCost.toFixed(4)}`);
    void prisma.$disconnect();
  });

process.on('SIGINT', () => {
  console.log('\nInterruption reçue (Ctrl+C), fermeture de Prisma...');
  console.log(`\n====> Global OCR cost: $${globalOcrCost.toFixed(4)}`);
  void prisma.$disconnect();
  process.exit(0);
});
