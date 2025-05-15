import 'dotenv/config';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';

// Google Sheets and Prisma initialization
const SHEET_ID = process.env.GSHEET_ID || 'VOTRE_ID_SHEET';
console.log('SHEET_ID:', SHEET_ID);
const SHEET_RANGE = 'Autres!A:Z';
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

  // Filter rows where TYPE === 'DTU'
  const filteredRows = rows.slice(1).filter((row) => row[idxType] === 'DTU');
  console.log('filteredRows:', filteredRows.length);

  // Display the first 6 filtered rows
  for (let i = 0; i < filteredRows.length; i++) {
    const row = filteredRows[i];
    const title = String(row[idxTitle] ?? '');
    const secondary_title = String(row[idxSecondaryTitle] ?? '');
    const key_s3_title = row[idxS3] ? `${row[idxS3]}.pdf` : '';
    const category = String(row[idxType] ?? '');

    try {
      // Check if a document with the same title already exists
      const existing = await prisma.referenceDocument.findFirst({
        where: {
          title,
          key_s3_title,
          category,
          secondary_title,
        },
      });

      if (existing) {
        continue;
      }

      // Create ReferenceDocument in DB
      await prisma.referenceDocument.create({
        data: {
          title,
          secondary_title,
          key_s3_title,
          category,
          mimetype: 'application/pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`Inserted: ${title}`);
    } catch {
      console.error(`Error inserting ${title}:`);
    }
  }

  console.log('filteredRows.length:', filteredRows.length);

  return;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
  });
