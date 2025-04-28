import { google } from 'googleapis';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Download a file from Google Drive using its file ID and save it to destPath
 * @param fileId Google Drive file ID
 * @param destPath Local path to save the file
 * @returns Promise<string> - The local file path when done
 */
export async function downloadFromGDrive(
  fileId: string,
  destPath: string,
): Promise<string> {
  // Auth via env: either GOOGLE_SERVICE_ACCOUNT_PATH (file) or GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON)
  let keyFile: string | undefined = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  let tmpFile: string | undefined;

  if (!keyFile && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Write JSON to a temp file
    tmpFile = os.tmpdir() + '/gdrive-sa.json';
    fs.writeFileSync(tmpFile, process.env.GOOGLE_SERVICE_ACCOUNT_JSON, {
      encoding: 'utf-8',
    });
    keyFile = tmpFile;
  }

  if (!keyFile) {
    throw new Error('Google service account credentials not found in env');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data
      .on('end', () => resolve(destPath))
      .on('error', (err: any) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      )
      .pipe(dest);
  });
}

/**
 * Extract Google Drive file ID from a standard share URL
 * @param url Google Drive share URL
 * @returns fileId or null
 */
export function extractGDriveFileId(url: string): string | null {
  const match = url.match(/drive\\.google\\.com\/file\/d\/([\w-]+)/);
  return match ? match[1] : null;
}
