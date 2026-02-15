/**
 * Migration Script: Legacy Sales Data to Multi-tenant System
 * 
 * This script:
 * 1. Prompts for MongoDB connection string.
 * 2. Reads legacy sales data from JSON.
 * 3. Maps legacy sellers to new User IDs.
 * 4. Merges provided tenantId.
 * 5. Links sales to existing TicketType IDs.
 * 6. Batch inserts sales into the database.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { Sale, TicketType } from '../lib/models';

const TENANT_ID = '85de4d74-ebb0-4c7b-a54e-1fe52ccb4641';

const sellerMapping: Record<string, string> = {
    'ibrahim': '658be035-493b-4bf2-a468-57abb8501266',
    'rahim': '658be035-493b-4bf2-a468-57abb8501266', // Added alias just in case
    'housseini': '8bac1a9a-1bd2-4bdb-8dba-5ce9cfa1e205',
    'doudou': '9e9da90d-2193-4592-ae73-687fa8cee126'
};

const ticketTypeMapping: Record<string, string> = {
    '3 heures': 'c584129c-3b05-4211-a94d-8b0eed129b7e',
    '12 heures/24 heures': '7d45937c-ac39-4482-ba59-362926972697',
    '12h / 24h': '7d45937c-ac39-4482-ba59-362926972697'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    console.log('\n🚢 --- Legacy Sales Migration Utility (v2) ---\n');

    const mongoUri = await question('Enter MongoDB Connection String: ');
    if (!mongoUri) {
        console.error('❌ MongoDB URI is required');
        process.exit(1);
    }

    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully.\n');

        // Read legacy JSON
        const dataPath = path.resolve(process.cwd(), 'data/ticket-management-data.json');
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at: ${dataPath}`);
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const legacyData = JSON.parse(rawData);
        const legacySales = legacyData['Sales Records'] || [];

        console.log(`📊 Found ${legacySales.length} legacy sales records.`);

        const salesToInsert: any[] = [];
        let skipped = 0;

        for (const legacy of legacySales) {
            const sellerId = sellerMapping[legacy.nom.toLowerCase()];
            if (!sellerId) {
                console.warn(`⚠️ Skipping record ${legacy.id}: Unknown seller "${legacy.nom}"`);
                skipped++;
                continue;
            }

            const ticketTypeId = ticketTypeMapping[legacy.type_de_ticket];

            // Strict Schema Adherence for Sale Model
            const saleDoc = {
                id: String(legacy.id),
                tenantId: TENANT_ID,
                seller_id: sellerId,
                ticket_type_name: String(legacy.type_de_ticket),
                ticket_type_id: ticketTypeId || "",
                quantity: Number(legacy.quantite),
                date_de_prise: legacy.date_de_prise?.split('T')[0] || legacy.date_de_prise,
                date_de_versement: legacy.date_de_versement?.split('T')[0] || undefined,
                verse: Boolean(legacy.verse),
                invoice_number: String(legacy['invoice_number '] || legacy.invoice_number || ""),
                created_by: String(legacy.created_by || "historical-migration"),
                created_at: String(legacy.created_at || new Date().toISOString()),
                updated_at: String(legacy.updated_at || new Date().toISOString())
            };

            salesToInsert.push(saleDoc);
        }

        if (salesToInsert.length > 0) {
            console.log(`⏳ Inserting ${salesToInsert.length} sales into "${TENANT_ID}"...`);

            try {
                // Use ordered: false to continue even if some IDs already exist
                await Sale.insertMany(salesToInsert, { ordered: false });
                console.log('✅ Migration completed!');
            } catch (error: any) {
                if (error.code === 11000) {
                    console.log('ℹ️ Migration finished. Some duplicate records were naturally skipped.');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('⚠️ No valid records found to insert.');
        }

        console.log(`\nFinal Summary:`);
        console.log(`- Total legacy records: ${legacySales.length}`);
        console.log(`- Successfully mapped: ${salesToInsert.length}`);
        console.log(`- Unmapped/Skipped:    ${skipped}`);

    } catch (error) {
        console.error('\n❌ Migration crash:', error);
    } finally {
        await mongoose.disconnect();
        rl.close();
    }
}

main();
