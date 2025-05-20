import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import {
  OCRPageObject,
  OCRResponse,
  OCRUsageInfo,
} from '@mistralai/mistralai/models/components';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import OpenAI from 'openai';

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

// Nouvelle structure : tableau d'usages par document
type LLMUsage = {
  provider: string;
  model: string;
  function: string;
  prompt: number;
  completion: number;
  total: number;
  cost: number;
};

const llmUsageByDoc: Record<string, LLMUsage[]> = {};

// Ajoute le type pour doc (adapter si besoin)
type ReferenceDocument = {
  id: string;
  key_s3_title: string;
  title: string;
  secondary_title: string;
};

// Fonction utilitaire pour calculer le coût (à adapter selon tes prix)
function computeCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  if (model === 'openai/gpt-4o-mini') {
    // $0.15 / 1M input, $0.60 / 1M output
    return promptTokens * 0.00000015 + completionTokens * 0.0000006;
  }
  return 0;
}

function anonymizeText(text: string) {
  // Remove the full block (paragraph) if present
  let anonymizedText = text.replace(
    /Ce document est à usage exclusif et non collectif\s*Société : BTP CONSULTANTS\s*\$\\Delta \\mathrm\{N\}\^\{\\circ\}\$ client : BTP CONSULTANTS\s*\$\\pm\$ Téléchargé le : .*/gm,
    '',
  );

  // Replace "Société : BTP CONSULTANTS" by ''
  anonymizedText = anonymizedText.replace(/Société : BTP CONSULTANTS/g, '');
  // Replace "$\Delta \mathrm{N}^{\circ}$ client : BTP CONSULTANTS" by ''
  anonymizedText = anonymizedText.replace(
    /\$\\Delta \\mathrm\{N\}\^\{\\circ\}\$ client : BTP CONSULTANTS/g,
    '',
  );

  // Optionally, you can also blank the download date line
  anonymizedText = anonymizedText.replace(/\$\\pm\$ Téléchargé le : .*/g, '');

  return anonymizedText;
}

async function getApplicationDomain(
  text: string,
  docId: string,
): Promise<string | null> {
  // Prompt to extract the application domain from the DTU document
  const prompt = `
Tu es un assistant expert en normalisation du bâtiment.
À partir du texte suivant issu d'un DTU, extraits seulement le paragraphe entier à l'exact qui définit le domaine d'application du document.
Pas de commentaire, pas de titre,pas de phrase de conclusion, juste le paragraphe. Le but étant de le sauvegarder dans la base de données.

Texte :
${text}
`;

  const openrouter = createOpenRouter({
    apiKey: process.env.OPEN_ROUTER_API_KEY,
  });

  const provider = 'openrouter';
  const modelName = 'openai/gpt-4o-mini';

  try {
    const { text: result, usage } = await generateText({
      model: openrouter(modelName),
      prompt,
    });

    if (usage) {
      const promptTokens = usage.promptTokens || 0;
      const completionTokens = usage.completionTokens || 0;
      const totalTokens = usage.totalTokens || 0;
      const cost = computeCost(modelName, promptTokens, completionTokens);

      if (!llmUsageByDoc[docId]) llmUsageByDoc[docId] = [];
      llmUsageByDoc[docId].push({
        provider,
        model: modelName,
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
        cost,
        function: 'getApplicationDomain',
      });
    }

    return result.trim();
  } catch (err) {
    // Log the error and return null if something goes wrong
    console.error(
      "Erreur lors de l'extraction du domaine d'application :",
      err,
    );
    return null;
  }
}

function chunkMarkdownToStringChunksWithPage(
  title: string,
  secondaryTitle: string,
  applicationDomain: string,
  ocrPages: { markdown: string }[],
): { text: string; page: number }[] {
  // On garde la correspondance ligne -> page
  const linesWithPage: { line: string; page: number }[] = [];
  ocrPages.forEach((pageObj, idx) => {
    const page = idx + 1;
    pageObj.markdown.split('\n').forEach((line) => {
      linesWithPage.push({ line, page });
    });
  });

  const contextStack: string[] = [title, secondaryTitle];
  const contextRawTitles: string[] = [];
  const chunks: { text: string; page: number }[] = [];
  let currentParagraph: { line: string; page: number }[] = [];
  let afterSummary = false;

  function getChunkString(): { text: string; page: number } {
    // Première page d'apparition du chunk
    const firstPage =
      currentParagraph.length > 0 ? currentParagraph[0].page : 1;

    return {
      text: [
        `${title} ${secondaryTitle}`.trim(),
        `Domaine d'application : ${applicationDomain}`,
        ...contextRawTitles,
        `Extrait page ${firstPage} :`,
        currentParagraph
          .map((l) => l.line)
          .join('\n')
          .trim(),
      ]
        .filter(Boolean)
        .join('\n'),
      page: firstPage,
    };
  }

  for (let i = 0; i < linesWithPage.length; i++) {
    const { line, page } = linesWithPage[i];
    const trimmedLine = line.trim();

    if (!afterSummary && /^#\s*Sommaire/i.test(trimmedLine)) {
      afterSummary = true;
      continue;
    }
    if (!afterSummary) {
      continue;
    }
    // Detect markdown titles
    const titleMatch = trimmedLine.match(/^(#+)\s+(.*)$/);
    if (titleMatch) {
      if (currentParagraph.length > 0) {
        chunks.push(getChunkString());
        currentParagraph = [];
      }
      const level = titleMatch[1].length;
      contextStack.length = level + 1;
      contextStack[level] = titleMatch[2];
      contextRawTitles.length = level - 1;
      contextRawTitles.push(trimmedLine);
      continue;
    }
    if (trimmedLine !== '') {
      currentParagraph.push({ line: trimmedLine, page });
    } else if (currentParagraph.length > 0) {
      chunks.push(getChunkString());
      currentParagraph = [];
    }
  }
  if (currentParagraph.length > 0) {
    chunks.push(getChunkString());
  }
  return chunks.filter((chunk) => chunk.text.trim().length > 0);
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Generate an embedding for a given text using OpenAI and log usage/cost.
 * @param docId Document identifier for usage tracking
 * @param text Text to embed
 * @returns Embedding vector (number[])
 */
async function embedChunk(docId: string, text: string): Promise<number[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const modelName: string = 'text-embedding-3-large';
  const dimensions = 1536;

  // Request embedding from OpenAI
  const response = await openai.embeddings.create({
    model: modelName,
    input: text,
    dimensions,
  });

  // Extract embedding vector
  const embedding = response.data[0].embedding;

  // Extract usage info
  const usage = response.usage;
  if (usage) {
    const totalTokens = usage.total_tokens || 0;
    // For text-embedding-3-large, cost is $0.13 per 1M tokens
    const cost = (totalTokens / 1_000_000) * 0.13;
    if (!llmUsageByDoc[docId]) llmUsageByDoc[docId] = [];
    llmUsageByDoc[docId].push({
      provider: 'OpenAI',
      model: modelName,
      function: 'embedChunk',
      prompt: 0,
      completion: 0,
      total: totalTokens,
      cost,
    });
  }
  return embedding;
}

// Déplace tout le traitement d'un document dans une fonction dédiée
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

    const usage: OCRUsageInfo = ocrResponse.usageInfo;
    const ocrCost = usage.pagesProcessed / 1000;

    if (!llmUsageByDoc[docId]) llmUsageByDoc[docId] = [];
    llmUsageByDoc[docId].push({
      provider: 'MistralAI',
      model: 'mistral-ocr-latest',
      function: 'ocr',
      prompt: 0,
      completion: 0,
      total: usage.pagesProcessed,
      cost: ocrCost,
    });

    const anonymizedPages: OCRPageObject[] = ocrResponse.pages.map(
      (page: OCRPageObject) => ({
        ...page,
        markdown: anonymizeText(page.markdown),
      }),
    );

    const applicationDomain = await getApplicationDomain(
      anonymizedPages.map((page) => page.markdown).join('\n'),
      docId,
    );

    const applicationDomainVector = await embedChunk(docId, applicationDomain);

    await prisma.$executeRawUnsafe(
      `
        UPDATE "ReferenceDocument"
        SET application_domain = $1,
            application_domain_vector = $2::vector,
            mistral_ocr_result = $4::jsonb
        WHERE id = $3
      `,
      applicationDomain,
      JSON.stringify(applicationDomainVector),
      docId,
      JSON.stringify(anonymizedPages),
    );

    const chunksWithPage = chunkMarkdownToStringChunksWithPage(
      doc.title,
      doc.secondary_title,
      applicationDomain,
      anonymizedPages,
    );

    const contextualizedChunks = chunksWithPage;
    const batchSize = 20;
    const chunkBatches = chunkArray(contextualizedChunks, batchSize);

    for (const [batchIndex, batch] of chunkBatches.entries()) {
      console.log(
        `Processing batch ${batchIndex + 1} of ${chunkBatches.length}`,
      );
      for (const [orderInBatch, chunkObj] of batch.entries()) {
        const { text: chunk, page } = chunkObj;
        const order = batchIndex * batchSize + orderInBatch;
        try {
          const vector = await embedChunk(docId, chunk);
          const createdChunk = await prisma.referenceChunk.create({
            data: {
              text: chunk,
              order,
              page,
              referenceDocument: {
                connect: { id: docId },
              },
            },
          });
          const uuid = crypto.randomUUID();
          await prisma.$executeRawUnsafe(`
              INSERT INTO "ReferenceEmbedding"
                ("id", "vector", "modelName", "modelVersion", "dimensions", "referenceChunkId", "createdAt", "updatedAt")
              VALUES
                (
                  '${uuid}',
                  '${JSON.stringify(vector)}'::vector,
                  'text-embedding-3-large',
                  'v3',
                  ${vector.length},
                  '${createdChunk.id}',
                  NOW(),
                  NOW()
                )
            `);
          console.log(
            `Chunk ${order} of ${contextualizedChunks.length} - End with embedding db insertion`,
          );
        } catch (error) {
          console.error(
            `Chunk ${order} of ${contextualizedChunks.length} - Error with embedding db insertion`,
            error,
          );
        }
      }
    }
  } catch (err) {
    console.error(`Error processing ${key}:`, err);
  }
}

async function main() {
  console.time('Total processing time');
  const docs = await prisma.referenceDocument.findMany({
    where: { application_domain: null },
  });

  const limit = docs.length;
  console.log(`Processing ${limit} documents`);
  const concurrency = 10;
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

function closeConnectionsAndLogUsage() {
  void prisma.$disconnect();
  console.log('LLM usage by document (cost per function):');
  for (const [docId, usages] of Object.entries(llmUsageByDoc)) {
    // Regroupe les coûts, providers et modèles par fonction
    const functionStats: Record<
      string,
      { cost: number; provider: string; model: string }
    > = {};
    usages.forEach((usage) => {
      if (!functionStats[usage.function]) {
        functionStats[usage.function] = {
          cost: 0,
          provider: usage.provider,
          model: usage.model,
        };
      }
      functionStats[usage.function].cost += usage.cost;
    });

    // Affiche le résumé pour ce document
    console.log(`Document ${docId}:`);
    for (const [func, stats] of Object.entries(functionStats)) {
      console.log(
        `  - ${func}: $${stats.cost.toFixed(4)} (provider: ${stats.provider}, model: ${stats.model})`,
      );
    }
    // Optionnel : coût total pour le document
    const total = Object.values(functionStats).reduce((a, b) => a + b.cost, 0);
    console.log(`  => Total: $${total.toFixed(4)}`);
  }
  // Ajout du coût total global
  const globalTotal = Object.values(llmUsageByDoc).reduce((acc, usages) => {
    const functionStats: Record<string, { cost: number }> = {};
    usages.forEach((usage) => {
      if (!functionStats[usage.function]) {
        functionStats[usage.function] = { cost: 0 };
      }
      functionStats[usage.function].cost += usage.cost;
    });
    const total = Object.values(functionStats).reduce((a, b) => a + b.cost, 0);
    return acc + total;
  }, 0);
  console.log(`\n====> Global total cost: $${globalTotal.toFixed(4)}`);
}

main()
  .catch(console.error)
  .finally(() => {
    console.log('Closing connections and logging usage...');
    closeConnectionsAndLogUsage();
  });

process.on('SIGINT', () => {
  console.log('\nInterruption reçue (Ctrl+C), fermeture de Prisma...');
  closeConnectionsAndLogUsage();
  process.exit(0);
});
