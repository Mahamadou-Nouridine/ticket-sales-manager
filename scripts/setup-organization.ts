/**
 * Interactive Script: Setup New Organization (Tenant) and Manager
 * 
 * This script will:
 * 1. Prompt for MongoDB connection string
 * 2. Prompt for Organization details
 * 3. Prompt for Manager details
 * 4. Create Tenant, User, and Membership records
 */

import readline from 'readline';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { Tenant, User, Membership } from '../lib/models';

// Load existing env if available
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    console.log('\n🏢 --- Organization Setup Utility ---\n');

    // 1. Connection String
    const defaultUri = process.env.MONGODB_URI || "";
    let mongoUri = await question(`MongoDB URI [${defaultUri}]: `);
    mongoUri = mongoUri || defaultUri;

    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully.\n');
    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }

    // 2. Organization Details
    console.log('--- Organization Details ---');
    const orgName = await question('Organization Name: ');
    if (!orgName) {
        console.error('❌ Organization Name is required');
        process.exit(1);
    }

    const defaultSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let orgSlug = await question(`Organization Slug [${defaultSlug}]: `);
    orgSlug = orgSlug || defaultSlug;

    // Check if slug exists
    const existingTenant = await Tenant.findOne({ slug: orgSlug });
    if (existingTenant) {
        console.error(`❌ Organization with slug "${orgSlug}" already exists.`);
        process.exit(1);
    }

    // 3. Manager Details
    console.log('\n--- Manager (Owner) Details ---');
    const fullName = await question('Manager Full Name: ');
    const email = await question('Manager Email: ');
    const username = await question('Manager Username (optional): ');
    const password = await question('Manager Password: ');

    if (!fullName || !email || !password) {
        console.error('❌ Full Name, Email, and Password are required');
        process.exit(1);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        console.error(`❌ User with email "${email}" already exists.`);
        process.exit(1);
    }

    console.log('\n⏳ Creating organization and manager account...');

    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create Tenant
            const userId = uuidv4();
            const tenantId = uuidv4();
            const tenant = await Tenant.create([{
                id: tenantId,
                ownerId: userId,
                name: orgName,
                slug: orgSlug,
                plan: 'enterprise',
                active: true,
                created_at: new Date().toISOString()
            }], { session });

            // Create User
            const hashedPassword = await hash(password, 10);

            const nameParts = fullName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || firstName;

            const user = await User.create([{
                id: userId,
                email,
                username: username || email.split('@')[0],
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                password_hash: hashedPassword,
                active: true,
                created_at: new Date().toISOString()
            }], { session });

            // Create Membership
            await Membership.create([{
                id: uuidv4(),
                userId,
                tenantId,
                role: 'manager',
                active: true,
                created_at: new Date().toISOString()
            }], { session });

            await session.commitTransaction();
            session.endSession();

            console.log('\n✨ Setup Complete! ✨');
            console.log('---------------------------');
            console.log(`Organization: ${orgName}`);
            console.log(`Slug:         ${orgSlug}`);
            console.log(`Dashboard URL: /t/${orgSlug}/dashboard`);
            console.log('---------------------------');
            console.log(`Manager Email: ${email}`);
            console.log('---------------------------');

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error('\n❌ Setup failed:', error);
    } finally {
        await mongoose.disconnect();
        rl.close();
    }
}

main();
