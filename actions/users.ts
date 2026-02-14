"use server";

import connectToDatabase from "@/lib/db";
import { User, Membership, AuditLog, Tenant } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { hash } from "bcryptjs";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { requireTenantAccess } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// List users in the CURRENT TENANT
export async function getUsers() {
    const { tenantId, role } = await requireTenantAccess();
    if (role !== 'owner' && role !== 'manager') {
        throw new Error("Unauthorized: Only owners and managers can view users");
    }

    await connectToDatabase();

    // Find all memberships for this tenant
    const memberships = await Membership.find({ tenantId }).populate('user').lean();

    // Transform to user list with role from membership
    return memberships.map((m: any) => {
        const u = m.user; // Accessed via virtual
        if (!u) return null;
        return {
            id: u.id,
            username: u.username || u.email,
            email: u.email,
            full_name: u.full_name,
            role: m.role, // Use membership role
            active: m.active, // Use membership status
            created_at: m.created_at, // Membership created_at
            last_login: u.last_login
        };
    }).filter(Boolean);
}

export async function getMyTenants() {
    const session = await getServerSession(authOptions);
    console.log("getMyTenants - Session:", session?.user);
    if (!session || !session.user) return [];

    await connectToDatabase();
    const userId = (session.user as any).id;
    console.log("getMyTenants - UserId:", userId);

    const memberships = await Membership.find({ userId, active: true }).lean();
    console.log("getMyTenants - Memberships found:", memberships.length, memberships);

    // Fetch tenant details for each membership
    const tenantIds = memberships.map((m: any) => m.tenantId);
    const tenants = await Tenant.find({ id: { $in: tenantIds } }).lean();
    console.log("getMyTenants - Tenants found:", tenants.length, tenants);

    const result = memberships.map((m: any) => {
        const tenant = tenants.find((t: any) => t.id === m.tenantId);
        if (!tenant) {
            console.log("getMyTenants - No tenant found for membership:", m.tenantId);
            return null;
        }
        return {
            id: m.tenantId,
            name: tenant.name,
            slug: tenant.slug,
            role: m.role,
        };
    }).filter(Boolean);

    console.log("getMyTenants - Final result:", result);
    return result;
}

// Add a user to the tenant (Invite flow simplified)
export async function createUser(data: { username: string; full_name: string; password?: string, role: 'manager' | 'seller' }) {
    const { tenantId, userId, role } = await requireTenantAccess();
    if (role !== 'owner') {
        throw new Error("Unauthorized: Only owners can add users");
    }

    await connectToDatabase();

    const email = data.username; // Assuming username is email now for multi-tenancy identity

    // 1. Check if user exists globally
    let user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (!user) {
        if (!data.password) throw new Error("Password required for new users");
        // Create new Global User
        const hashedPassword = await hash(data.password, 10);
        const now = new Date().toISOString();
        user = await User.create({
            id: uuidv4(),
            username: email, // Legacy support
            email: email,
            full_name: data.full_name,
            password_hash: hashedPassword,
            active: true,
            created_at: now
        });
    }

    // 2. Check if already a member of this tenant
    const existingMembership = await Membership.findOne({ userId: user.id || user._id, tenantId });
    if (existingMembership) {
        throw new Error("User is already a member of this tenant");
    }

    // 3. Create Membership
    const now = new Date().toISOString();
    await Membership.create({
        id: uuidv4(),
        userId: user.id || user._id,
        tenantId,
        role: data.role,
        active: true,
        created_at: now
    });

    // Audit Log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "CREATE",
        entity_type: "USER_MEMBERSHIP",
        entity_id: user.id,
        details: `Added user ${email} as ${data.role}`,
        timestamp: now,
    });

    await revalidateTenantPaths(["/config/users"]);
    return { success: true };
}

export async function toggleUserStatus(id: string, active: boolean) {
    const { tenantId, role, userId } = await requireTenantAccess();
    if (role !== 'owner') {
        throw new Error("Unauthorized: Only owners can manage users");
    }

    await connectToDatabase();

    // Check if the user to be toggled belongs to the tenant
    const membership = await Membership.findOne({ userId: id, tenantId });
    if (!membership) {
        throw new Error("User not found in this tenant");
    }

    // Toggle membership status, not global user status (unless we want to ban them entirely?)
    // For Multi-tenancy, we should probably toggle the Membership.
    // But the UI might expect User toggling.
    // Let's toggle Membership active status.

    membership.active = active;
    await membership.save();

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "USER_MEMBERSHIP",
        entity_id: membership.id,
        details: `Set active to ${active} for user ${id}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/users");
    return { success: true };
}

export async function updateUser(id: string, data: { username?: string; full_name?: string; password?: string; role?: string }) {
    const { tenantId, role: currentUserRole, userId: currentUserId } = await requireTenantAccess();
    if (currentUserRole !== 'owner') {
        throw new Error("Unauthorized: Only owners can update users");
    }

    await connectToDatabase();

    // 1. Get Membership
    const membership = await Membership.findOne({ userId: id, tenantId }).populate('user');
    if (!membership) {
        throw new Error("User not found in this tenant");
    }

    const userToUpdate = membership.user;

    // 2. Update Global User Data (if provided)
    // Note: Updating username/email change it GLOBALLY. This might be dangerous in a real multi-tenant app.
    // For now, we allow it but we should be careful.
    if (data.username || data.full_name || data.password) {
        const updateFields: any = {};
        if (data.username) {
            // Check uniqueness if changing
            if (data.username !== userToUpdate.email && data.username !== userToUpdate.username) {
                const existing = await User.findOne({
                    $or: [{ email: data.username }, { username: data.username }],
                    _id: { $ne: userToUpdate._id }
                });
                if (existing) throw new Error("Email/Username already taken");
                updateFields.username = data.username;
                updateFields.email = data.username;
            }
        }
        if (data.full_name) updateFields.full_name = data.full_name;
        if (data.password) {
            updateFields.password_hash = await hash(data.password, 10);
        }

        if (Object.keys(updateFields).length > 0) {
            await User.updateOne({ _id: userToUpdate._id }, updateFields);
        }
    }

    // 3. Update Role (Membership)
    if (data.role && data.role !== membership.role) {
        membership.role = data.role;
        await membership.save();
    }

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: currentUserId,
        action: "UPDATE",
        entity_type: "USER",
        entity_id: id,
        details: `Updated user ${userToUpdate.email}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/users");
    return { success: true };
}
