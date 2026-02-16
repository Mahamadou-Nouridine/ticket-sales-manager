"use server";

import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { Tenant, Membership, AuditLog } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Fetches all active memberships for the current user
 */
export async function getUserOrganizations() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    await connectToDatabase();
    const userId = (session.user as any).id;

    const memberships = await Membership.find({ userId, active: true }).lean();

    const tenantIds = memberships.map((m: any) => m.tenantId);
    if (tenantIds.length === 0) return [];

    const tenants = await Tenant.find({ id: { $in: tenantIds }, active: true }).lean();

    return memberships.map((m: any) => {
        const tenant = tenants.find((t: any) => t.id === m.tenantId);
        if (!tenant) return null;
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            role: m.role,
        };
    }).filter(Boolean);
}

/**
 * Creates a new organization with ACID transaction
 */
export async function createOrganization(data: { name: string; slug: string }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Non authentifié");
    }

    const userId = (session.user as any).id;
    await connectToDatabase();

    // Slug validation
    const existing = await Tenant.findOne({ slug: data.slug.toLowerCase() });
    if (existing) {
        throw new Error("Cette URL d'organisation est déjà utilisée.");
    }

    const tenantId = uuidv4();
    const now = new Date().toISOString();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // 1. Create Tenant
        const [tenant] = await Tenant.create([{
            id: tenantId,
            name: data.name,
            slug: data.slug.toLowerCase(),
            created_at: now,
            active: true,
            plan: 'free',
            currency: 'FCFA'
        }], { session: dbSession });

        // 2. Create Membership for the creator as Manager
        await Membership.create([{
            id: uuidv4(),
            userId: userId,
            tenantId: tenantId,
            role: 'manager',
            active: true,
            created_at: now
        }], { session: dbSession });

        // 3. Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            tenantId: tenantId,
            user_id: userId,
            action: "CREATE",
            entity_type: "TENANT",
            entity_id: tenantId,
            details: `Created organization ${data.name}`,
            timestamp: now,
        }], { session: dbSession });

        await dbSession.commitTransaction();

        revalidatePath("/");
        return { success: true, slug: tenant.slug, tenantId };
    } catch (error: any) {
        await dbSession.abortTransaction();
        console.error("Failed to create organization:", error);
        throw new Error(error.message || "Erreur lors de la création de l'organisation");
    } finally {
        dbSession.endSession();
    }
}
