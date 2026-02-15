/**
 * Migration Script: Convert Salesmen to Sellers
 * 
 * This script:
 * 1. Converts all "owner" memberships to "manager"
 * 2. Creates User accounts for each Salesman
 * 3. Creates Membership records linking sellers to tenants
 * 4. Updates Sale records to reference user IDs instead of salesman names
 */

import connectToDatabase from '../lib/db';
import { User, Tenant, Membership, Sale } from '../lib/models';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrateSalesmenToSellers() {
    console.log('🚀 Starting migration: Salesmen → Sellers');

    await connectToDatabase();

    // Step 1: Convert all "owner" memberships to "manager"
    console.log('\n📝 Step 1: Converting owner → manager...');
    const ownerMemberships = await Membership.find({ role: 'owner' });
    console.log(`Found ${ownerMemberships.length} owner memberships`);

    for (const membership of ownerMemberships) {
        membership.role = 'manager';
        await membership.save();
        console.log(`✅ Converted membership ${membership.id} to manager`);
    }

    // Step 2: Get all salesmen
    console.log('\n📝 Step 2: Processing salesmen...');
    const salesmen = await Salesman.find({ active: true });
    console.log(`Found ${salesmen.length} active salesmen`);

    const sellerMap = new Map(); // Maps salesman name → user ID

    for (const salesman of salesmen) {
        console.log(`\n  Processing: ${salesman.name}`);

        // Generate email from name (you may want to customize this)
        const emailSafeName = salesman.name
            .toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '');
        const email = `${emailSafeName}@seller.local`;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
            // Generate temporary password
            const tempPassword = `Seller${Math.random().toString(36).slice(-8)}!`;
            const password_hash = await hash(tempPassword, 10);

            // Split name into first and last name
            const nameParts = salesman.name.trim().split(/\s+/);
            const first_name = nameParts[0] || "Vendeur";
            const last_name = nameParts.slice(1).join(' ') || salesman.name;

            // Create user account
            const userId = uuidv4();
            user = await User.create({
                id: userId,
                username: emailSafeName,
                email,
                password_hash,
                first_name,
                last_name,
                full_name: salesman.name,
                active: true,
                created_at: new Date().toISOString(),
            });

            console.log(`  ✅ Created user: ${email}`);
            console.log(`  🔑 Temporary password: ${tempPassword}`);
            console.log(`  ⚠️  User must change password on first login`);
        } else {
            console.log(`  ℹ️  User already exists: ${email}`);
        }

        // Create membership for this seller
        const existingMembership = await Membership.findOne({
            userId: user.id,
            tenantId: salesman.tenantId
        });

        if (!existingMembership) {
            await Membership.create({
                id: uuidv4(),
                userId: user.id,
                tenantId: salesman.tenantId,
                role: 'seller',
                active: true,
                created_at: new Date().toISOString(),
            });
            console.log(`  ✅ Created seller membership`);
        } else {
            console.log(`  ℹ️  Membership already exists`);
        }

        // Map salesman name to user ID for sales update
        sellerMap.set(salesman.name, user.id);
    }

    // Step 3: Update Sale records
    console.log('\n📝 Step 3: Updating sale records...');
    const sales = await Sale.find({});
    console.log(`Found ${sales.length} sales to update`);

    let updated = 0;
    let skipped = 0;

    for (const sale of sales) {
        const userId = sellerMap.get(sale.salesman_name);

        if (userId) {
            // Update created_by to user ID if it's not already
            if (sale.created_by !== userId) {
                sale.created_by = userId;
                await sale.save();
                updated++;
            } else {
                skipped++;
            }
        } else {
            console.log(`  ⚠️  No user found for salesman: ${sale.salesman_name}`);
        }
    }

    console.log(`  ✅ Updated ${updated} sales`);
    console.log(`  ℹ️  Skipped ${skipped} sales (already updated)`);

    // Summary
    console.log('\n✨ Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Converted ${ownerMemberships.length} owner → manager`);
    console.log(`  - Created ${salesmen.length} seller accounts`);
    console.log(`  - Updated ${updated} sale records`);
    console.log('\n⚠️  IMPORTANT: All sellers have temporary passwords.');
    console.log('   They must change their password on first login.');

    process.exit(0);
}

// Run migration
migrateSalesmenToSellers().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
