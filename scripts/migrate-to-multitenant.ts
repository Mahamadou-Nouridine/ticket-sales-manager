import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Tenant, Membership, Sale, TicketType, Salesman, TicketInventory, AuditLog } from '../lib/models';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log("Connected to MongoDB.");

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Create Default Tenant
            console.log("Creating default tenant...");
            let defaultTenant = await Tenant.findOne({ slug: 'default-org' }).session(session);

            if (!defaultTenant) {
                const createdTenants = await Tenant.create([{
                    id: uuidv4(),
                    name: 'Default Organization',
                    slug: 'default-org', // URL safe slug
                    plan: 'enterprise',
                    active: true,
                    created_at: new Date().toISOString()
                }], { session });
                defaultTenant = createdTenants[0];
                console.log(`- Created Default Tenant: ${defaultTenant.name} (${defaultTenant.id})`);
            } else {
                console.log(`- Using existing Default Tenant: ${defaultTenant.name} (${defaultTenant.id})`);
            }

            const tenantId = defaultTenant.id;

            // 2. Migrate Users & Create Memberships
            console.log("Migrating Users...");
            // Use raw collection to get data that might be filtered out by strict Mongoose schemas (like 'role')
            const users = await mongoose.connection.collection('users').find({}).toArray();
            console.log(`Found ${users.length} users to migrate.`);

            for (const user of users) {
                if (!user) {
                    console.warn("Skipping undefined/null user document.");
                    continue;
                }

                // Determine role based on previous 'role' field
                const legacyRole = (user as any).role || 'user';
                const newRole = legacyRole === 'superuser' ? 'owner' : 'seller';

                // ID handling: ensure we have a string ID
                let userId = (user as any).id;
                if (!userId && (user as any)._id) {
                    userId = (user as any)._id.toString();
                }

                if (!userId) {
                    console.warn("Skipping user without ID:", user);
                    continue;
                }

                // Create Membership if not exists
                const existingMembership = await Membership.findOne({ userId: userId, tenantId }).session(session);
                if (!existingMembership) {
                    await Membership.create([{
                        id: uuidv4(),
                        userId: userId,
                        tenantId: tenantId,
                        role: newRole,
                        active: (user as any).active !== false,
                        created_at: new Date().toISOString()
                    }], { session });
                    console.log(`- Created Membership for ${(user as any).full_name || 'User'} as ${newRole}`);
                }
            }

            // 3. Migrate Business Collections
            const collections = [
                { model: Sale, name: 'Sales' },
                { model: TicketType, name: 'TicketTypes' },
                { model: Salesman, name: 'Salesmen' },
                { model: TicketInventory, name: 'Inventories' },
                { model: AuditLog, name: 'AuditLogs' }
            ];

            for (const { model, name } of collections) {
                console.log(`Updating ${name} with tenantId...`);
                // Update specific documents that are missing tenantId
                const result = await model.updateMany(
                    { tenantId: { $exists: false } }, // Only update if missing
                    { $set: { tenantId: tenantId } }
                ).session(session);

                console.log(`- Updated ${result.modifiedCount} ${name}.`);
            }

            await session.commitTransaction();
            session.endSession();
            console.log("✅ Migration completed successfully.");

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

    } catch (error) {
        console.error("Error during migration:", error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
