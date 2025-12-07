import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function getSheetsClient() {
    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
        throw new Error('Google Sheets credentials are missing');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
    });

    const client = await auth.getClient();

    return google.sheets({ version: 'v4', auth: client as any });
}

export async function readSheet(sheetName: string, range?: string) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const rangeToRead = range ? `${sheetName}!${range}` : sheetName;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: rangeToRead,
        });

        return response.data.values || [];
    } catch (error: any) {

        if (error.response) {

        }
        throw error;
    }
}

export async function appendRow(sheetName: string, values: any[]) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
        });
        return response.data;
    } catch (error: any) {

        if (error.response) {

        }
        throw error;
    }
}

export async function updateRow(sheetName: string, rowIndex: number, values: any[]) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const range = `${sheetName}!A${rowIndex + 1}`;

    try {
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
        });
        return response.data;
    } catch (error: any) {

        if (error.response) {

        }
        throw error;
    }
}

export async function deleteRow(sheetName: string, rowIndex: number) {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

    if (!sheet || !sheet.properties?.sheetId) {
        throw new Error(`Sheet ${sheetName} not found`);
    }

    const sheetId = sheet.properties.sheetId;

    try {
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1,
                            },
                        },
                    },
                ],
            },
        });
        return response.data;
    } catch (error: any) {

        if (error.response) {

        }
        throw error;
    }
}
