"use server";

import connectToDatabase from "@/lib/db";
import { User, Membership, AuditLog, Tenant } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { hash, compare } from "bcryptjs";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { requireTenantAccess } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// List users in the CURRENT TENANT
export async function getUsers() {
    const { tenantId, role } = await requireTenantAccess();
    if (role !== 'manager') {
        throw new Error("Unauthorized: Only managers can view users");
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
            username: u.username,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            full_name: u.full_name,
            role: m.role, // Use membership role
            active: m.active, // Use membership status
            created_at: m.created_at, // Membership created_at
            phone: u.phone
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
export async function createUser(data: {
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    password?: string;
    role: 'manager' | 'seller'
}) {
    const { tenantId, userId, role } = await requireTenantAccess();
    if (role !== 'manager') {
        throw new Error("Unauthorized: Only managers can add users");
    }

    await connectToDatabase();

    const email = data.email.toLowerCase();
    const username = data.username?.toLowerCase();

    // 1. Check if user exists globally by email or username
    const query = username
        ? { $or: [{ email }, { username }] }
        : { email };

    let user = await User.findOne(query);

    if (!user) {
        if (!data.password) throw new Error("Un mot de passe est requis pour les nouveaux utilisateurs");

        // 1b. Check if username is already taken by someone else (if provided)
        if (username) {
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                throw new Error(`Le nom d'utilisateur "${username}" est déjà utilisé.`);
            }
        }

        // Create new Global User
        const hashedPassword = await hash(data.password, 10);
        const now = new Date().toISOString();
        user = await User.create({
            id: uuidv4(),
            username: username,
            email: email,
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: `${data.first_name} ${data.last_name}`,
            password_hash: hashedPassword,
            active: true,
            created_at: now
        });
    }

    // 2. Check if already a member of this tenant
    const userIdToLink = user.id || user._id;
    const existingMembership = await Membership.findOne({ userId: userIdToLink, tenantId });
    if (existingMembership) {
        throw new Error("Nom d'utilisateur indisponible");
    }

    // 3. Create Membership
    const now = new Date().toISOString();
    await Membership.create({
        id: uuidv4(),
        userId: userIdToLink,
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

    await revalidateTenantPaths(["/users", "/config/salesmen"]);
    return { success: true };
}

/**
 * Update current user's password
 */
export async function updateMyPassword(currentPassword: string, newPassword: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Non authentifié");
    }

    await connectToDatabase();
    const userId = (session.user as any).id;

    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    // Verify current password
    const isValid = await compare(currentPassword, user.password_hash);
    if (!isValid) {
        throw new Error("Mot de passe actuel incorrect");
    }

    // Hash and update new password
    const password_hash = await hash(newPassword, 10);
    user.password_hash = password_hash;
    await user.save();

    return { success: true };
}

/**
 * Update current user's profile
 */
export async function updateMyProfile(data: {
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
    phone?: string
}) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Non authentifié");
    }

    await connectToDatabase();
    const userId = (session.user as any).id;

    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    // Update fields
    if (data.first_name) user.first_name = data.first_name;
    if (data.last_name) user.last_name = data.last_name;
    if (data.first_name || data.last_name) {
        user.full_name = `${user.first_name} ${user.last_name}`;
    }
    if (data.username !== undefined) {
        if (data.username && data.username !== user.username) {
            const existing = await User.findOne({ username: data.username.toLowerCase(), id: { $ne: userId } });
            if (existing) throw new Error("Ce nom d'utilisateur est déjà utilisé");
        }
        user.username = data.username || undefined;
    }
    if (data.email) {
        // Check if email is already taken
        const existing = await User.findOne({ email: data.email, id: { $ne: userId } });
        if (existing) {
            throw new Error("Cet email est déjà utilisé");
        }
        user.email = data.email;
    }
    if (data.phone !== undefined) user.phone = data.phone;

    await user.save();

    return { success: true };
}


export async function toggleUserStatus(id: string, active: boolean) {
    const { tenantId, role, userId } = await requireTenantAccess();
    if (role !== 'manager') {
        throw new Error("Unauthorized: Only managers can manage users");
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

export async function updateUser(id: string, data: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    role?: string
}) {
    const { tenantId, role: currentUserRole, userId: currentUserId } = await requireTenantAccess();
    if (currentUserRole !== 'manager') {
        throw new Error("Unauthorized: Only managers can update users");
    }

    await connectToDatabase();

    // 1. Get Membership
    const membership = await Membership.findOne({ userId: id, tenantId }).populate('user');
    if (!membership) {
        throw new Error("User not found in this tenant");
    }

    const userToUpdate = membership.user;

    // 2. Update Global User Data (if provided)
    if (data.username || data.email || data.first_name || data.last_name || data.password) {
        const updateFields: any = {};
        if (data.username !== undefined) {
            if (data.username !== userToUpdate.username) {
                if (data.username) { // Only check uniqueness if username is provided
                    const existing = await User.findOne({ username: data.username, id: { $ne: id } });
                    if (existing) throw new Error("Nom d'utilisateur déjà pris");
                }
                updateFields.username = data.username || null;
            }
        }
        if (data.email) {
            if (data.email !== userToUpdate.email) {
                const existing = await User.findOne({ email: data.email, id: { $ne: id } });
                if (existing) throw new Error("Cet email est déjà utilisé");
                updateFields.email = data.email;
            }
        }
        if (data.first_name) updateFields.first_name = data.first_name;
        if (data.last_name) updateFields.last_name = data.last_name;
        if (data.first_name || data.last_name) {
            const fn = data.first_name || userToUpdate.first_name;
            const ln = data.last_name || userToUpdate.last_name;
            updateFields.full_name = `${fn} ${ln}`;
        }
        if (data.password) {
            updateFields.password_hash = await hash(data.password, 10);
        }

        if (Object.keys(updateFields).length > 0) {
            await User.updateOne({ id: id }, updateFields);
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
