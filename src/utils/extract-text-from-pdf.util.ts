import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { Mistral } from '@mistralai/mistralai';

/**
 * Extract text from a PDF file page by page using pdfinfo and pdftotext
 * @param pdfPath Path to the PDF file
 * @returns Promise<Array<{ text: string; page: number }>>
 */
export async function extractTextFromPdf(
  pdfPath: string,
): Promise<Array<{ text: string; page: number }>> {
  const exec = promisify(execCallback);
  const tempDir = path.dirname(pdfPath);
  const tempOutputPath = path.join(tempDir, 'temp_page.txt');

  try {
    // Obtenir le nombre total de pages du PDF
    const pdfInfoCommand = `pdfinfo "${pdfPath}"`;
    const { stdout: pdfInfoOutput } = await exec(pdfInfoCommand);

    // Extraire le nombre de pages à partir de la sortie de pdfinfo
    const pagesMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
    if (!pagesMatch) {
      throw new Error('Impossible de déterminer le nombre de pages du PDF');
    }

    const totalPages = parseInt(pagesMatch[1], 10);

    // Vérifier si le PDF est OCRisé en examinant plusieurs pages
    // Nous vérifierons la première page, une page au milieu et la dernière page
    const pagesToCheck = [
      1, // Première page
      Math.ceil(totalPages / 2), // Page du milieu
      totalPages > 2 ? totalPages : 1, // Dernière page (si différente de la première)
    ].filter((v, i, a) => a.indexOf(v) === i); // Éliminer les doublons

    let isOcred = false;
    let ocrCheckCount = 0;

    for (const pageNum of pagesToCheck) {
      const checkOcrCommand = `pdftotext -f ${pageNum} -l ${pageNum} "${pdfPath}" "${tempOutputPath}"`;
      await exec(checkOcrCommand);

      if (fs.existsSync(tempOutputPath)) {
        const sampleText = fs.readFileSync(tempOutputPath, 'utf8');
        // Si le texte extrait est significatif (plus de 50 caractères non-espace), considérer que la page est OCRisée
        const pageHasText = sampleText.trim().replace(/\s+/g, '').length > 50;

        if (pageHasText) {
          ocrCheckCount++;
        }

        fs.unlinkSync(tempOutputPath);
      }
    }

    // On considère le document comme OCRisé si au moins 2/3 des pages vérifiées contiennent du texte
    isOcred = ocrCheckCount >= Math.ceil(pagesToCheck.length * 0.66);

    // Si le document n'est pas OCRisé, traitement alternatif
    if (!isOcred) {
      const results = await processNonOcrPdf(pdfPath);
      return results;
    }

    // Tableau pour stocker les résultats
    const results: Array<{ text: string; page: number }> = [];

    // Extraire le texte page par page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Utiliser pdftotext avec les options -f et -l pour extraire une seule page
      const extractCommand = `pdftotext -f ${pageNum} -l ${pageNum} -layout "${pdfPath}" "${tempOutputPath}"`;
      await exec(extractCommand);

      // Lire le contenu du fichier texteou
      if (fs.existsSync(tempOutputPath)) {
        const pageText = fs.readFileSync(tempOutputPath, 'utf8');

        // Ajouter le texte et le numéro de page au tableau de résultats
        results.push({
          text: pageText,
          page: pageNum,
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(tempOutputPath);
      }
    }

    return results;
  } catch (error) {
    console.error("Erreur lors de l'extraction du texte:", error);
    // Nettoyer le fichier temporaire en cas d'erreur
    if (fs.existsSync(tempOutputPath)) {
      fs.unlinkSync(tempOutputPath);
    }
    throw new Error(
      `Échec de l'extraction du texte: ${(error as Error).message}`,
    );
  }
}

async function processNonOcrPdf(pdfPath: string) {
  const results: Array<{ text: string; page: number }> = [];

  try {
    const mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error("La clé API Mistral n'est pas configurée");
    }

    const presignedUrl = await this.storageService.getPresignedUrl(
      projectId,
      fileName,
    );

    const client = new Mistral({ apiKey: mistralApiKey });

    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: presignedUrl.url,
      },
      includeImageBase64: true,
    });

    ocrResponse.pages.forEach((page, index) => {
      results.push({
        text: page.markdown,
        page: index + 1,
      });
    });

    return results;
  } catch (error) {
    this.logger.error(`Erreur globale durant le processus OCR:`, error);

    return results;
  }
}
