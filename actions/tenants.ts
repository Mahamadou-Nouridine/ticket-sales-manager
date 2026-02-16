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

    // Check Organization Limit
    const ownedOrgsCount = await Tenant.countDocuments({ ownerId: userId });
    const limit = parseInt(process.env.MAX_ORGANIZATIONS_LIMIT || '3');

    if (ownedOrgsCount >= limit) {
        throw new Error(`Vous avez atteint la limite de ${limit} organisations. Une offre premium sera bientôt disponible pour en créer davantage.`);
    }

    try {
        // 1. Create Tenant
        const [tenant] = await Tenant.create([{
            id: tenantId,
            name: data.name,
            slug: data.slug.toLowerCase(),
            created_at: now,
            active: true,
            plan: 'free',
            currency: 'FCFA',
            ownerId: userId
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

export async function updateOrganization(tenantId: string, data: { name: string; slug: string; currency?: string }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Non authentifié");

    // START TRANSACTION
    await connectToDatabase();
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Check permissions
        const membership = await Membership.findOne({
            userId: (session.user as any).id,
            tenantId,
            role: 'manager',
            active: true
        });

        if (!membership) throw new Error("Non autorisé");

        // Check availability of slug if changed
        const existing = await Tenant.findOne({ slug: data.slug.toLowerCase(), id: { $ne: tenantId } });
        if (existing) throw new Error("Cette URL est déjà utilisée");

        await Tenant.updateOne({ id: tenantId }, {
            name: data.name,
            slug: data.slug.toLowerCase(),
            currency: data.currency
        }, { session: dbSession });

        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: (session.user as any).id,
            action: "UPDATE",
            entity_type: "TENANT",
            entity_id: tenantId,
            details: `Updated organization to ${data.name} (${data.slug}) [Currency: ${data.currency}]`,
            timestamp: new Date().toISOString(),
        }], { session: dbSession });

        await dbSession.commitTransaction();
        revalidatePath(`/t/${data.slug}`);
        return { success: true };
    } catch (error: any) {
        await dbSession.abortTransaction();
        throw new Error(error.message);
    } finally {
        dbSession.endSession();
    }
}

// ... deleteOrganization ...

export async function getTenantDetails(tenantId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Non authentifié");

    await connectToDatabase();

    // Check membership
    const membership = await Membership.findOne({
        userId: (session.user as any).id,
        tenantId,
        active: true
    });

    if (!membership) throw new Error("Non autorisé");

    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    if (!tenant) throw new Error("Organisation introuvable");

    return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        currency: tenant.currency || 'FCFA',
        role: membership.role,
        isOwner: tenant.ownerId === (session.user as any).id
    };
}

export async function deleteOrganization(tenantId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Check manager permissions
        const membership = await Membership.findOne({
            userId: (session.user as any).id,
            tenantId,
            role: 'manager',
            active: true
        });

        if (!membership) throw new Error("Seul un manager peut supprimer l'organisation");

        // Check Owner Permission
        const tenant = await Tenant.findOne({ id: tenantId }).session(dbSession);
        if (tenant.ownerId && tenant.ownerId !== (session.user as any).id) {
            throw new Error("Seul le propriétaire de l'organisation peut la supprimer");
        }

        // Import all models to ensure they are registered
        const { Sale, TicketInventory, TicketType, SalePayment } = await import("@/lib/models");

        // Cascade Delete
        // 1. Delete Memberships
        await Membership.deleteMany({ tenantId }, { session: dbSession });

        // 2. Delete Inventory
        await TicketInventory.deleteMany({ tenantId }, { session: dbSession });

        // 3. Delete Ticket Types
        await TicketType.deleteMany({ tenantId }, { session: dbSession });

        // 4. Delete Payments (related to sales)
        const sales = await Sale.find({ tenantId }).session(dbSession);
        const saleIds = sales.map((s: any) => s.id);
        await SalePayment.deleteMany({ saleId: { $in: saleIds } }, { session: dbSession });

        // 5. Delete Sales
        await Sale.deleteMany({ tenantId }, { session: dbSession });

        // 6. Delete Audit Logs
        await AuditLog.deleteMany({ tenantId }, { session: dbSession });

        // 7. Delete Tenant
        await Tenant.deleteOne({ id: tenantId }, { session: dbSession });

        await dbSession.commitTransaction();
        return { success: true };
    } catch (error: any) {
        await dbSession.abortTransaction();
        console.error("Delete org error:", error);
        throw new Error(error.message || "Erreur lors de la suppression");
    } finally {
        dbSession.endSession();
    }
}

export async function getOrganizationStats(tenantId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const { Sale, TicketType } = await import("@/lib/models");

    const [membersCount, salesCount, ticketTypesCount, revenueData] = await Promise.all([
        Membership.countDocuments({ tenantId, active: true }),
        Sale.countDocuments({ tenantId }),
        TicketType.countDocuments({ tenantId }),
        Sale.aggregate([
            { $match: { tenantId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$total_amount" } } }
        ])
    ]);

    return {
        members: membersCount,
        sales: salesCount,
        ticketTypes: ticketTypesCount,
        revenue: revenueData[0]?.total || 0,
    };
}

// export async function getTenantDetails(tenantId: string) {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) throw new Error("Non authentifié");

//     await connectToDatabase();

//     // Check membership
//     const membership = await Membership.findOne({
//         userId: (session.user as any).id,
//         tenantId,
//         active: true
//     });

//     if (!membership) throw new Error("Non autorisé");

//     const tenant = await Tenant.findOne({ id: tenantId }).lean();
//     if (!tenant) throw new Error("Organisation introuvable");

//     return {
//         id: tenant.id,
//         name: tenant.name,
//         slug: tenant.slug,
//         role: membership.role
//     };
// }

export async function leaveOrganization(tenantId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const userId = (session.user as any).id;

    // Check membership
    const membership = await Membership.findOne({
        userId,
        tenantId,
        active: true
    });

    if (!membership) throw new Error("Vous n'êtes pas membre de cette organisation");

    if (membership.role === 'manager') {
        throw new Error("Les managers ne peuvent pas quitter l'organisation. Veuillez contacter le propriétaire.");
    }

    // Deactivate membership (leaving sales history intact)
    // We could delete it, but soft delete (active: false) preserves history better if we join again?
    // User asked to "leave without deleting his sales". Deleting the membership record doesn't delete sales (unless we cascade).
    // Our deleteOrganization cascades, but leaving shouldn't.
    // So distinct from deleteOrganization.

    // Let's perform a DELETE on the membership, as "active" flag might be sufficient but removing the record is cleaner if we don't want them showing up in lists.
    // However, if we delete the membership, we lose the link to the user for historical sales display if we rely on membership for something?
    // Sales are linked to userId. So deleting membership is fine.

    await Membership.deleteOne({ id: membership.id });

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "LEAVE",
        entity_type: "ORGANIZATION",
        entity_id: tenantId,
        details: `User left the organization`,
        timestamp: new Date().toISOString(),
    });

    return { success: true };
}
