import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Types pour éviter les 'any'
interface ServiceAccountCredentials {
  type: 'service_account';
  client_email: string;
  private_key: string;
  [key: string]: any;
}

interface OAuth2Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    [key: string]: any;
  };
}

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  [key: string]: any;
}

interface DocumentData {
  filename: string;
  path?: string;
  mimetype?: string;
  size?: string;
  title?: string;
  type?: string;
  metadata?: any;
  [key: string]: any;
}

const prisma = new PrismaClient();

// Configuration for Google Sheets API
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

/**
 * Authenticate with Google using service account or OAuth2
 * @returns Authenticated Google Sheets API client
 */
async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets> {
  // Check if we have stored credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      'No credentials.json file found. Please download it from Google Cloud Console',
    );
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8')) as
    | ServiceAccountCredentials
    | OAuth2Credentials;

  // If using service account
  if ('type' in credentials && credentials.type === 'service_account') {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: SCOPES,
    });
    await auth.getClient();
    return google.sheets({ version: 'v4', auth: auth });
  }

  // If using OAuth2
  if ('installed' in credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );

    // Check if we have a stored token
    if (!fs.existsSync(TOKEN_PATH)) {
      throw new Error(
        'No token.json file found. Run the authentication script first',
      );
    }

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')) as TokenInfo;
    oAuth2Client.setCredentials(token);

    // @ts-ignore - Type issues with Google API client
    return google.sheets({
      version: 'v4',
      auth: oAuth2Client,
    });
  }

  throw new Error('Invalid credentials format');
}

/**
 * Fetch reference documents data from Google Sheets
 * @param spreadsheetId The ID of the Google Spreadsheet
 * @param range The range to fetch (e.g., 'Sheet1!A1:E10')
 * @returns Array of document data
 */
async function fetchReferenceDocumentsFromSheet(
  spreadsheetId: string,
  range: string,
): Promise<DocumentData[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in spreadsheet');
      return [];
    }

    // Assuming first row contains headers
    const headers = rows[0] as string[];
    const documents = rows.slice(1).map((row) => {
      const document: DocumentData = { filename: '' }; // Initialisation avec valeur obligatoire
      headers.forEach((header: string, index: number) => {
        document[header] = row[index] || '';
      });
      return document;
    });

    return documents;
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}

/**
 * Index reference documents in the database
 * @param documents Array of document data from Google Sheets
 */
async function indexReferenceDocuments(documents: Record<string, any>[]) {
  console.log(`Indexing ${documents.length} reference documents...`);

  try {
    // Get default organization (for reference documents)
    const organization = await prisma.organization.findFirst({
      where: { scope: 'ADMIN' },
    });

    if (!organization) {
      throw new Error('No admin organization found. Please create one first.');
    }

    // Create a reference project if it doesn't exist
    let referenceProject = await prisma.project.findFirst({
      where: {
        name: 'Reference Documents',
        organizationId: organization.id,
      },
    });

    if (!referenceProject) {
      referenceProject = await prisma.project.create({
        data: {
          name: 'Reference Documents',
          status: 'COMPLETED',
          organizationId: organization.id,
        },
      });
      console.log('Created reference project:', referenceProject.id);
    }

    // Process each document
    for (const doc of documents) {
      console.log(`Processing document: ${doc.title || 'Untitled'}`);

      // Check if document already exists (by filename or other unique identifier)
      const existingDoc = await prisma.document.findFirst({
        where: {
          filename: doc.filename,
          projectId: referenceProject.id,
        },
      });

      if (existingDoc) {
        console.log(`Document already exists: ${doc.filename}`);
        continue;
      }

      // Create document in database
      const document = await prisma.document.create({
        data: {
          filename: doc.filename,
          path: doc.path || '',
          mimetype: doc.mimetype || 'application/pdf',
          size: parseInt(doc.size) || 0,
          status: 'COMPLETED',
          indexation_status: 'PENDING',
          category: 'REFERENCE',
          projectId: referenceProject.id,
          ai_titre_document: doc.title || '',
          ai_Type_document: doc.type ? [doc.type] : [],
          ai_metadata: doc.metadata || {},
        },
      });

      console.log(`Created document: ${document.id}`);
    }

    console.log('Reference documents indexing completed successfully');
  } catch (error) {
    console.error('Error indexing reference documents:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting reference documents indexing');

    const databaseUrl = process.env.DATABASE_URL;
    const spreadsheetId = process.env.REFERENCE_SPREADSHEET_ID;
    const range = process.env.REFERENCE_SHEET_RANGE || 'Sheet1!A1:Z1000';

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    if (!spreadsheetId) {
      throw new Error(
        'REFERENCE_SPREADSHEET_ID environment variable is required',
      );
    }

    // Fetch documents from Google Sheets
    const documents = await fetchReferenceDocumentsFromSheet(
      spreadsheetId,
      range,
    );

    // Index documents in database
    await indexReferenceDocuments(documents);

    console.log('Reference documents indexing completed');
  } catch (error) {
    const firstLine =
      error instanceof Error
        ? error.message.split('\n')[0]
        : String(error).split('\n')[0];
    console.error('MAIN || Error in process:', firstLine);
    process.exit(1);
  }
}

// Execute the script
void main();
