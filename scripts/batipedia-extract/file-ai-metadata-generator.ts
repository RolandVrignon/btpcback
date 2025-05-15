import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import {
  OCRPageObject,
  OCRResponse,
} from '@mistralai/mistralai/models/components';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import crypto from 'crypto';

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

async function getApplicationDomain(text: string): Promise<string | null> {
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

  try {
    const { text: result } = await generateText({
      model: openrouter('openai/gpt-4o-mini'),
      prompt,
    });

    // Clean and return the result
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

async function contextualizeChunkWithLLM(
  fullMarkdown: string,
  chunk: string,
): Promise<string> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPEN_ROUTER_API_KEY,
  });

  const prompt = `
Voici le texte complet d'un document technique (markdown) :
\`\`\`
${fullMarkdown}
\`\`\`

Voici un extrait (chunk) à contextualiser :
\`\`\`
${chunk}
\`\`\`

Reformate cet extrait pour qu'il soit bien contextualisé :
- Ajoute les titres et sous-titres pertinents (avec leur hiérarchie, ex : #, ##, etc.)
- Corrige la hiérarchie si besoin
- Le chunk doit être autonome et compréhensible sans le reste du document
- Retourne uniquement le texte markdown final
`;

  const { text: result } = await generateText({
    model: openrouter('openai/gpt-4o-mini'),
    prompt,
  });

  return result.trim();
}

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
      applicationDomain,
      ...contextRawTitles,
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

async function embedChunk(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-ada-002'),
    value: text,
  });
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

      const ocrResponse: OCRResponse = await client.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: presignedUrl,
        },
        includeImageBase64: true,
      });

      const compactText = ocrResponse.pages
        .map((page: OCRPageObject) => page.markdown)
        .join('\n');

      const anonymizedText = anonymizeText(compactText);

      const applicationDomain = await getApplicationDomain(anonymizedText);

      await prisma.referenceDocument.update({
        where: { id: docId },
        data: { application_domain: applicationDomain },
      });

      const chunks = chunkMarkdownToStringChunks(
        doc.title,
        doc.secondary_title,
        applicationDomain,
        anonymizedText,
      );

      // Découper les chunks en batchs de 20
      const batchSize = 40;
      const chunkBatches = chunkArray(chunks, batchSize);

      const contextualizedChunks: string[] = [];
      for (const batch of chunkBatches) {
        // Lancer les requêtes en parallèle pour chaque batch
        const results = await Promise.all(
          batch.map((chunk) =>
            contextualizeChunkWithLLM(anonymizedText, chunk),
          ),
        );
        contextualizedChunks.push(...results);
      }

      for (const [order, chunk] of contextualizedChunks.entries()) {
        // Générer l'embedding pour le chunk
        const vector = await embedChunk(chunk);

        // Créer le chunk dans la table ReferenceChunk
        const createdChunk = await prisma.referenceChunk.create({
          data: {
            text: chunk,
            order,
            referenceDocument: {
              connect: { id: docId },
            },
          },
        });

        // Générer un UUID pour l'embedding
        const embeddingId = crypto.randomUUID();

        // Insérer l'embedding dans ReferenceEmbedding via SQL brut
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ReferenceEmbedding"
            ("id", "vector", "modelName", "modelVersion", "dimensions", "referenceChunkId", "createdAt", "updatedAt")
          VALUES
            (
              '${embeddingId}',
              '${JSON.stringify(vector)}'::vector,
              'text-embedding-ada-002',
              'v2',
              ${vector.length},
              '${createdChunk.id}',
              NOW(),
              NOW()
            )
        `);
      }
    } catch (err) {
      console.error(`Error processing ${key}:`, err);
    }
  }
}

main().catch(console.error);
