import { z } from 'zod';
import { ToolResult } from '@/chat-iframe/tools/index';
import { DEFAULT_STREAM_CONFIG } from '@/chat-iframe/tools/streamConfig';
import { ReferenceDocumentsService } from '@/reference-documents/reference-documents.service';
import { ReferenceDocument } from '@prisma/client';
import { OCRPageObject } from '@mistralai/mistralai/models/components';
import { ShortUrlService } from '@/short-url/short-url.service';

/**
 * Tool to find a reference document by title similarity and return its id
 * @param referenceDocumentsService ReferenceDocumentsService instance
 * @returns Tool definition
 */
export const createReadReferenceDocumentTool = (
  referenceDocumentsService: ReferenceDocumentsService,
  shortUrlService: ShortUrlService,
  baseRedirectUrl: string,
) => ({
  readReferenceDocument: {
    description:
      "Recherche un document de référence par similarité de titre et retourne l'url du document ainsi que le texte du document formaté en markdown",
    parameters: z.object({
      title: z
        .string()
        .describe('Titre du document de référence à rechercher (ex: DTU 43.1)'),
    }),
    execute: async ({ title }: { title: string }): Promise<ToolResult> => {
      try {
        const doc: ReferenceDocument | null =
          await referenceDocumentsService.findByTitleSimilarity(title);

        if (doc) {
          const ocrResponse: OCRPageObject[] =
            doc.mistral_ocr_result as OCRPageObject[];

          const fullText = ocrResponse
            .map((page: OCRPageObject) => page.markdown)
            .join('\n');

          const presignedUrl = await referenceDocumentsService.getPresignedUrl(
            doc.id,
          );

          const id = await shortUrlService.createShortUrl(presignedUrl);
          const shortUrl = `${baseRedirectUrl}/${id}`;

          const fullTextWithUrl = `Fournis l'url du document à l'utilisateur : ${shortUrl}\n\n"Document :"${fullText}`;

          return {
            text: fullTextWithUrl,
            stream: false,
            config: DEFAULT_STREAM_CONFIG,
            save: true,
            label: 'Recherche de document de référence',
          } as ToolResult;
        } else {
          return {
            text: 'Aucun document trouvé pour ce titre.',
            stream: false,
            config: DEFAULT_STREAM_CONFIG,
            save: true,
            label: 'Recherche de document de référence',
          } as ToolResult;
        }
      } catch (error) {
        return {
          text: `Erreur lors de la recherche : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          stream: false,
          config: DEFAULT_STREAM_CONFIG,
          save: false,
          label: 'Recherche de document de référence',
        } as ToolResult;
      }
    },
  },
});
