import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { User } from '../lib/models';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

async function createSuperUser() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log("Connected to MongoDB.");

        const username = process.argv[2];
        const password = process.argv[3];
        const fullName = process.argv[4] || 'Admin User';

        if (!username || !password) {
            console.log("Usage: npx tsx scripts/create-user.ts <username> <password> [full_name]");
            process.exit(1);
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.error(`Error: User '${username}' already exists.`);
            process.exit(1);
        }

        const passwordHash = await hash(password, 10);
        const id = uuidv4();
        const now = new Date().toISOString();

        await User.create({
            id,
            username,
            password_hash: passwordHash,
            role: 'superuser',
            full_name: fullName,
            active: true,
            created_at: now,
            last_login: "",
        });

        console.log(`✅ Superuser created successfully:`);
        console.log(`- Username: ${username}`);
        console.log(`- ID: ${id}`);
        console.log(`- Name: ${fullName}`);

    } catch (error) {
        console.error("Error creating user:", error);
    } finally {
        await mongoose.disconnect();
    }
}

createSuperUser();
