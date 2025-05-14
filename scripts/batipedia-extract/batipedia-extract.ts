import 'dotenv/config';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';

// Google Sheets and Prisma initialization
const SHEET_ID = process.env.GSHEET_ID || 'VOTRE_ID_SHEET';
const SHEET_RANGE = 'Autres';
const prisma = new PrismaClient();

// Function to get rows from Google Sheets
async function getSheetRows() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  });
  return response.data.values || [];
}

async function main() {
  const rows = await getSheetRows();
  if (rows.length < 2) {
    console.log('No data found.');
    return;
  }
  // Get column indexes
  const header = rows[0];
  const idxTitle = header.indexOf('title-part-1');
  const idxSecondaryTitle = header.indexOf('title-part-2');
  const idxS3 = header.indexOf('TITRE S3');
  const idxType = header.indexOf('TYPE');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = row[idxTitle];
    const secondary_title = row[idxSecondaryTitle];
    const key_s3_title = row[idxS3];
    const category = row[idxType];
    if (!title || !key_s3_title || !category) continue;
    try {
      // Create ReferenceDocument in DB
      await prisma.referenceDocument.create({
        data: {
          title,
          secondary_title,
          key_s3_title,
          category,
          mimetype: 'application/pdf',
        },
      });
      console.log(`Inserted: ${title}`);
    } catch (err) {
      console.error(`Error inserting ${title}:`, err);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
  });
