"use server";

import connectToDatabase from "@/lib/db";
import { User, Tenant, Membership, AuditLog } from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

/**
 * Ensures the current user is a global administrator.
 */
async function requireGlobalAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).isAdmin) {
        throw new Error("Unauthorized: Global admin access required");
    }
    return session.user as any;
}

export async function getGlobalStats() {
    await requireGlobalAdmin();
    await connectToDatabase();

    const [totalTenants, totalUsers, totalSales, pendingPayments] = await Promise.all([
        Tenant.countDocuments(),
        User.countDocuments(),
        // We can add more complex stats later if needed
        Promise.resolve(0),
        Promise.resolve(0)
    ]);

    return {
        totalTenants,
        totalUsers,
        totalSales,
        pendingPayments,
    };
}

export async function getAllTenants() {
    await requireGlobalAdmin();
    await connectToDatabase();
    return Tenant.find().sort({ created_at: -1 }).lean();
}

export async function createOrganizationByAdmin(data: { name: string, slug: string, managerName: string, managerEmail: string }) {
    const admin = await requireGlobalAdmin();
    await connectToDatabase();

    // 1. Check if slug exists
    const existingTenant = await Tenant.findOne({ slug: data.slug });
    if (existingTenant) {
        return { success: false, error: "SLUG_ALREADY_EXISTS" };
    }

    // 2. Check if user exists (Should not link existing users per requirement)
    const existingUser = await User.findOne({ email: data.managerEmail.toLowerCase() });
    if (existingUser) {
        return { success: false, error: "USER_ALREADY_EXISTS_GLOBALLY" };
    }

    // 3. Create Tenant
    const tenantId = uuidv4();
    const now = new Date().toISOString();

    await Tenant.create({
        id: tenantId,
        name: data.name,
        slug: data.slug,
        created_at: now
    });

    // 4. Create Manager User
    const userEmail = data.managerEmail.toLowerCase();
    const user = await User.create({
        id: uuidv4(),
        email: userEmail,
        first_name: data.managerName.split(' ')[0],
        last_name: data.managerName.split(' ').slice(1).join(' ') || "",
        full_name: data.managerName,
        active: true,
        created_at: now
    });

    // 5. Create Membership
    await Membership.create({
        id: uuidv4(),
        userId: user.id,
        tenantId,
        role: 'manager',
        active: true,
        created_at: now
    });

    // 6. Audit Log
    await AuditLog.create({
        id: uuidv4(),
        user_id: admin.id,
        username: admin.name,
        action: 'CREATE_TENANT',
        entity_type: 'Tenant',
        entity_id: tenantId,
        details: `Admin created tenant ${data.name} with manager ${userEmail}`,
        timestamp: now
    });

    // 7. Generate Setup Link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/setup-password?uid=${user.id}`;

    revalidatePath("/admin/tenants");
    return { success: true, setupUrl };
}

export async function toggleTenantStatus(tenantId: string, active: boolean) {
    const admin = await requireGlobalAdmin();
    await connectToDatabase();

    await Tenant.updateOne({ id: tenantId }, { active });

    await AuditLog.create({
        id: uuidv4(),
        user_id: admin.id,
        username: admin.name,
        action: active ? 'ENABLE_TENANT' : 'DISABLE_TENANT',
        entity_type: 'Tenant',
        entity_id: tenantId,
        details: `Admin ${active ? 'enabled' : 'disabled'} tenant ${tenantId}`,
        timestamp: new Date().toISOString()
    });

    revalidatePath("/admin/tenants");
    return { success: true };
}

export async function getGlobalUsers() {
    await requireGlobalAdmin();
    await connectToDatabase();
    return User.find().sort({ created_at: -1 }).lean();
}

export async function toggleUserStatusGlobally(userId: string, active: boolean) {
    const admin = await requireGlobalAdmin();
    await connectToDatabase();

    await User.updateOne({ id: userId }, { active });

    await AuditLog.create({
        id: uuidv4(),
        user_id: admin.id,
        username: admin.name,
        action: active ? 'ENABLE_USER_GLOBAL' : 'DISABLE_USER_GLOBAL',
        entity_type: 'User',
        entity_id: userId,
        details: `Admin ${active ? 'enabled' : 'disabled'} user ${userId} globally`,
        timestamp: new Date().toISOString()
    });

    revalidatePath("/admin/users");
    return { success: true };
}

export async function getGlobalLogs() {
    await requireGlobalAdmin();
    await connectToDatabase();
    return AuditLog.find().sort({ timestamp: -1 }).limit(100).lean();
}

export async function toggleUserAdminStatus(userId: string, isAdmin: boolean) {
    const admin = await requireGlobalAdmin();
    await connectToDatabase();

    // Prevent self-demotion
    if (userId === admin.id && !isAdmin) {
        throw new Error("Vous ne pouvez pas retirer vos propres droits d'administrateur");
    }

    await User.updateOne({ id: userId }, { isAdmin });

    await AuditLog.create({
        id: uuidv4(),
        user_id: admin.id,
        username: admin.name,
        action: isAdmin ? 'PROMOTE_TO_ADMIN' : 'DEMOTE_FROM_ADMIN',
        entity_type: 'User',
        entity_id: userId,
        details: `Admin set isAdmin=${isAdmin} for user ${userId}`,
        timestamp: new Date().toISOString()
    });

    revalidatePath("/admin/users");
    return { success: true };
}
