import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import {
  OCRPageObject,
  OCRResponse,
  OCRUsageInfo,
} from '@mistralai/mistralai/models/components';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as crypto from 'crypto';

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

// async function contextualizeChunkWithLLM(
//   fullMarkdown: string,
//   chunk: string,
//   docId: string,
// ): Promise<string> {
//   const openrouter = createOpenRouter({
//     apiKey: process.env.OPEN_ROUTER_API_KEY,
//   });

//   const prompt = `
// Voici le texte complet d'un document technique (markdown) :
// \`\`\`
// ${fullMarkdown}
// \`\`\`

// Voici un extrait (chunk) à contextualiser :
// \`\`\`
// ${chunk}
// \`\`\`

// Reformate cet extrait pour qu'il soit bien contextualisé :
// - Ajoute les titres et sous-titres pertinents (avec leur hiérarchie, ex : #, ##, etc.)
// - Corrige la hiérarchie si besoin
// - Le chunk doit être autonome et compréhensible sans le reste du document
// - Retourne uniquement le texte markdown final
// `;

//   const provider = 'openrouter';
//   const modelName = 'openai/gpt-4o-mini';

//   const { text: result, usage } = await generateText({
//     model: openrouter(modelName),
//     prompt,
//   });

//   // Récupère l'usage réel si disponible
//   if (usage) {
//     const promptTokens = usage.promptTokens || 0;
//     const completionTokens = usage.completionTokens || 0;
//     const totalTokens = usage.totalTokens || 0;
//     const cost = computeCost(modelName, promptTokens, completionTokens);

//     if (!llmUsageByDoc[docId]) llmUsageByDoc[docId] = [];
//     llmUsageByDoc[docId].push({
//       provider,
//       model: modelName,
//       prompt: promptTokens,
//       completion: completionTokens,
//       total: totalTokens,
//       cost,
//       function: 'contextualizeChunkWithLLM',
//     });
//   }

//   return result.trim();
// }

function chunkMarkdownToStringChunks(
  title: string,
  secondaryTitle: string,
  applicationDomain: string,
  markdown: string,
): string[] {
  const lines = markdown.split('\n');
  const contextStack: string[] = [title, secondaryTitle];
  const contextRawTitles: string[] = [];
  const chunks: string[] = [];
  let currentParagraph: string[] = [];
  let afterSummary = false;

  function getChunkString() {
    return [
      `${title} ${secondaryTitle}`.trim(),
      `Domaine d'application : ${applicationDomain}`,
      ...contextRawTitles,
      'Extrait :',
      currentParagraph.join('\n').trim(),
    ]
      .filter(Boolean)
      .join('\n');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!afterSummary && /^#\s*Sommaire/i.test(line)) {
      afterSummary = true;
      continue;
    }

    if (!afterSummary) {
      continue;
    }

    // Detect markdown titles
    const titleMatch = line.match(/^(#+)\s+(.*)$/);
    if (titleMatch) {
      if (currentParagraph.length > 0) {
        chunks.push(getChunkString());
        currentParagraph = [];
      }
      const level = titleMatch[1].length;
      contextStack.length = level + 1;
      contextStack[level] = titleMatch[2];
      contextRawTitles.length = level - 1;
      contextRawTitles.push(line);
      continue;
    }

    if (line !== '') {
      currentParagraph.push(line);
    } else if (currentParagraph.length > 0) {
      chunks.push(getChunkString());
      currentParagraph = [];
    }
  }

  if (currentParagraph.length > 0) {
    chunks.push(getChunkString());
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function embedChunk(docId: string, text: string): Promise<number[]> {
  const modelName: string = 'text-embedding-3-large';

  const { embedding, usage } = await embed({
    model: openai.embedding(modelName),
    value: text,
  });

  if (usage) {
    const totalTokens = usage.tokens || 0;

    let cost = 0;

    if (modelName === 'text-embedding-ada-002') {
      cost = (totalTokens / 1_000_000) * 0.1;
    } else if (modelName === 'text-embedding-3-small') {
      cost = (totalTokens / 1_000_000) * 0.02;
    } else if (modelName === 'text-embedding-3-large') {
      cost = (totalTokens / 1_000_000) * 0.13;
    }

    llmUsageByDoc[docId].push({
      provider: 'OpenAI',
      model: modelName,
      function: 'embedChunk',
      prompt: 0,
      completion: 0,
      total: totalTokens,
      cost: cost,
    });
  }
  return embedding;
}

async function main() {
  const docs = await prisma.referenceDocument.findMany({
    where: { application_domain: null },
  });

  for (let i = 0; i < 1; i++) {
    const doc = docs[i];
    const key = doc.key_s3_title;
    if (!key) continue;
    const docId = doc.id;

    try {
      // Generate a presigned URL for the PDF file
      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: 'batipedia-files', Key: key }),
        { expiresIn: 3600 }, // 1 heure
      );

      console.log('presignedUrl:', presignedUrl);

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

      const compactText = ocrResponse.pages
        .map((page: OCRPageObject) => page.markdown)
        .join('\n');

      const anonymizedText = anonymizeText(compactText);

      const applicationDomain = await getApplicationDomain(
        anonymizedText,
        docId,
      );

      const applicationDomainVector = await embedChunk(
        docId,
        applicationDomain,
      );

      await prisma.$executeRawUnsafe(
        `
        UPDATE "ReferenceDocument"
        SET application_domain = $1,
            application_domain_vector = $2::vector
        WHERE id = $3
        `,
        applicationDomain,
        JSON.stringify(applicationDomainVector),
        docId,
      );

      const chunks = chunkMarkdownToStringChunks(
        doc.title,
        doc.secondary_title,
        applicationDomain,
        anonymizedText,
      );

      const contextualizedChunks = chunks;

      console.log('Number of chunks :', contextualizedChunks.length);

      console.log(contextualizedChunks);

      // // Découper les chunks en batchs de 20
      const batchSize = 20;
      const chunkBatches = chunkArray(contextualizedChunks, batchSize);

      for (const [batchIndex, batch] of chunkBatches.entries()) {
        console.log(
          `Processing batch ${batchIndex + 1} of ${chunkBatches.length}`,
        );
        for (const [orderInBatch, chunk] of batch.entries()) {
          // Calculer l'ordre global du chunk
          const order = batchIndex * batchSize + orderInBatch;
          try {
            console.log(
              `Chunk ${order} of ${contextualizedChunks.length} - Start embedding and db insertion`,
            );
            const vector = await embedChunk(docId, chunk);

            console.log(
              `Chunk ${order} of ${contextualizedChunks.length} - Vector length : ${vector.length}`,
            );

            if (order === 1) {
              console.log(vector);
            }

            // Create the chunk in the ReferenceChunk table
            const createdChunk = await prisma.referenceChunk.create({
              data: {
                text: chunk,
                order,
                referenceDocument: {
                  connect: { id: docId },
                },
              },
            });

            console.log(
              `Chunk ${order} of ${contextualizedChunks.length} - End embedding and db chunk insertion`,
            );

            // Generate a UUID for the embedding
            const uuid = crypto.randomUUID();

            // Insert the embedding into ReferenceEmbedding via raw SQL
            await prisma.$executeRawUnsafe(`
              INSERT INTO "ReferenceEmbedding"
                ("id", "vector", "modelName", "modelVersion", "dimensions", "referenceChunkId", "createdAt", "updatedAt")
              VALUES
                (
                  '${uuid}',
                  '${JSON.stringify(vector)}'::vector,
                  'text-embedding-ada-002',
                  'v2',
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
}

main()
  .catch(console.error)
  .finally(() => {
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
      const total = Object.values(functionStats).reduce(
        (a, b) => a + b.cost,
        0,
      );
      console.log(`  => Total: $${total.toFixed(4)}`);
    }
  });
