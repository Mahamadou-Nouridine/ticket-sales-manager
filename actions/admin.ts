"use server";

import connectToDatabase from "@/lib/db";
import { User, Tenant, Membership, AuditLog, Waitlist } from "@/lib/models";
import mongoose from "mongoose";
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

    const [totalTenants, totalUsers, totalSales, pendingWaitlist] = await Promise.all([
        Tenant.countDocuments(),
        User.countDocuments(),
        // We can add more complex stats later if needed
        Promise.resolve(0),
        Waitlist.countDocuments({ isHandled: false })
    ]);

    return {
        totalTenants,
        totalUsers,
        totalSales,
        pendingWaitlist,
    };
}

export async function getAllTenants() {
    await requireGlobalAdmin();
    await connectToDatabase();
    return Tenant.find().sort({ created_at: -1 }).lean();
}

export async function createOrganizationByAdmin(data: { name: string, slug: string, managerName: string, managerEmail: string }) {
    const admin = await requireGlobalAdmin();
    const conn = await connectToDatabase();

    // 1. Check if slug exists (Atomic check outside transaction is okay as first step, 
    // but better inside for full consistency if possible. We'll do simple checks first.)
    const existingTenant = await Tenant.findOne({ slug: data.slug });
    if (existingTenant) {
        return { success: false, error: "SLUG_ALREADY_EXISTS" };
    }

    const existingUser = await User.findOne({ email: data.managerEmail.toLowerCase() });
    if (existingUser) {
        return { success: false, error: "USER_ALREADY_EXISTS_GLOBALLY" };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tenantId = uuidv4();
        const userId = uuidv4();
        const now = new Date().toISOString();
        const userEmail = data.managerEmail.toLowerCase();

        // 3. Create Manager User
        const [user] = await User.create([{
            id: userId,
            email: userEmail,
            first_name: data.managerName.split(' ')[0],
            last_name: data.managerName.split(' ').slice(1).join(' ') || "",
            full_name: data.managerName,
            active: true,
            created_at: now
        }], { session });

        // 4. Create Tenant with ownerId
        await Tenant.create([{
            id: tenantId,
            name: data.name,
            slug: data.slug,
            ownerId: userId,
            created_at: now
        }], { session });

        // 5. Create Membership
        await Membership.create([{
            id: uuidv4(),
            userId: userId,
            tenantId,
            role: 'manager',
            active: true,
            created_at: now
        }], { session });

        // 6. Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            user_id: admin.id,
            username: admin.name,
            action: 'CREATE_TENANT',
            entity_type: 'Tenant',
            entity_id: tenantId,
            details: `Admin created tenant ${data.name} with manager ${userEmail}`,
            timestamp: now
        }], { session });

        await session.commitTransaction();

        // 7. Generate Setup Link
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const setupUrl = `${baseUrl}/setup-password?uid=${userId}`;

        revalidatePath("/admin/tenants");
        return { success: true, setupUrl };

    } catch (error) {
        await session.abortTransaction();
        console.error("Transaction aborted:", error);
        throw error;
    } finally {
        session.endSession();
    }
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

export async function getUserSetupLink(userId: string) {
    await requireGlobalAdmin();
    await connectToDatabase();

    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    // Generate setup URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/setup-password?uid=${user.id}`;

    return { success: true, setupUrl };
}

// --- Waitlist Management ---

// --- Waitlist Management ---

function generateOnboardingEmail(setupUrl: string) {
    return `Bonjour,

Félicitations ! Vous avez été sélectionné pour rejoindre la phase de test exclusive de Vendora. Vous faites désormais partie des 20 premiers utilisateurs qui vont nous aider à façonner le futur de la gestion de Wifi-Zone.

Voici les prochaines étapes pour commencer :

🔹 Configurez votre compte
Cliquez sur ce lien pour choisir votre mot de passe et accéder à votre tableau de bord : ${setupUrl}

🔹 Maîtrisez l'outil en 5 minutes
Consultez notre documentation officielle pour comprendre le fonctionnement (Zonage, Ventes, Rapports) : https://vendora-waitlist.vercel.app/docs

🔹 Rejoignez la communauté
Intégrez notre groupe WhatsApp privé pour échanger avec les autres testeurs et nous faire part de vos retours en direct : https://chat.whatsapp.com/FplCypHbZIu45AhwWhdaHk

Si vous rencontrez le moindre problème, posez simplement votre question sur le groupe WhatsApp.

Bienvenue dans l'aventure !

L'équipe Vendora`;
}

export async function getWaitlistEntries() {
    await requireGlobalAdmin();
    await connectToDatabase();
    return Waitlist.find().sort({ createdAt: -1 }).lean();
}

export async function getWaitlistEmailTemplate(waitlistId: string) {
    await requireGlobalAdmin();
    await connectToDatabase();

    const entry = await Waitlist.findById(waitlistId);
    if (!entry) {
        return { success: false, error: "WAITLIST_ENTRY_NOT_FOUND" };
    }

    const email = entry.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
        return { success: false, error: "USER_NOT_FOUND", details: "L'utilisateur associé n'a pas été trouvé." };
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/setup-password?uid=${user.id}`;
    const emailTemplate = generateOnboardingEmail(setupUrl);

    return { success: true, emailTemplate };
}

export async function onboardWaitlistUser(waitlistId: string) {
    const admin = await requireGlobalAdmin();
    await connectToDatabase();

    const entry = await Waitlist.findById(waitlistId);
    if (!entry) {
        return { success: false, error: "WAITLIST_ENTRY_NOT_FOUND" };
    }

    // 1. Prepare data
    const email = entry.email.toLowerCase().trim();
    // Simple slugification: lowercase, replace spaces/specials with dash
    const slug = entry.wifiZoneName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with -
        .replace(/-+/g, "-") // Collapse consecutive -
        .replace(/^-|-$/g, ""); // Trim -

    // 2. Pre-transaction checks
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
        return { success: false, error: "SLUG_ALREADY_EXISTS", details: `Le domaine '${slug}' est déjà utilisé par une autre zone.` };
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return { success: false, error: "USER_ALREADY_EXISTS_GLOBALLY", details: `L'email ${email} est déjà utilisé par un utilisateur existant.` };
    }

    // 3. Start ACID Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tenantId = uuidv4();
        const userId = uuidv4();
        const now = new Date().toISOString();

        // - Create Manager User
        await User.create([{
            id: userId,
            email: email,
            first_name: entry.fullName.split(' ')[0],
            last_name: entry.fullName.split(' ').slice(1).join(' ') || "Testeur",
            full_name: entry.fullName,
            active: true,
            created_at: now
        }], { session });

        // - Create Tenant
        await Tenant.create([{
            id: tenantId,
            name: entry.wifiZoneName,
            slug: slug,
            ownerId: userId,
            created_at: now
        }], { session });

        // - Create Membership
        await Membership.create([{
            id: uuidv4(),
            userId: userId,
            tenantId,
            role: 'manager',
            active: true,
            created_at: now
        }], { session });

        // - Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            user_id: admin.id,
            username: admin.name,
            action: 'ONBOARD_WAITLIST_USER',
            entity_type: 'Tenant',
            entity_id: tenantId,
            details: `Admin approved waitlist entry for ${email}. Created tenant ${slug}.`,
            timestamp: now
        }], { session });

        // - Mark waitlist entry as handled
        await Waitlist.findByIdAndUpdate(waitlistId, { isHandled: true }, { session });

        await session.commitTransaction();

        // 4. Generate Email Template
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const setupUrl = `${baseUrl}/setup-password?uid=${userId}`;
        const emailTemplate = generateOnboardingEmail(setupUrl);

        revalidatePath("/admin/waitlist");
        return { success: true, emailTemplate };

    } catch (error) {
        await session.abortTransaction();
        console.error("Waitlist onboarding transaction aborted:", error);
        throw error;
    } finally {
        session.endSession();
    }
}

