"use server";

import connectToDatabase from "@/lib/db";
import { User, Tenant, Membership, AuditLog, Waitlist } from "@/lib/models";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import transporter from "@/lib/mail";

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
    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
            <div style="background-color: #2563eb; padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Bienvenue sur Vendora !</h1>
            </div>
            <div style="padding: 40px 30px; line-height: 1.6;">
                <p style="font-size: 16px; margin-bottom: 24px;">Bonjour,</p>
                <p style="font-size: 16px; margin-bottom: 24px;">Félicitations ! Vous avez été sélectionné pour rejoindre la phase de test exclusive de <strong>Vendora</strong>. Vous faites désormais partie des premiers utilisateurs qui vont nous aider à façonner le futur de la gestion de Wifi-Zone.</p>
                
                <h3 style="color: #2563eb; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">1. Configurez votre compte</h3>
                <p style="font-size: 15px; margin-bottom: 24px;">Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et accéder instantanément à votre tableau de bord.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${setupUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Activer mon compte</a>
                </div>

                <h3 style="color: #2563eb; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">2. Maîtrisez l'outil en 5 minutes</h3>
                <p style="font-size: 15px; margin-bottom: 24px;">Consultez notre documentation officielle pour comprendre le fonctionnement (Zonage, Ventes, Rapports) : <br/>
                <a href="https://vendora-waitlist.vercel.app/docs" style="color: #2563eb; text-decoration: underline;">vendora-waitlist.vercel.app/docs</a></p>

                <h3 style="color: #2563eb; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">3. Rejoignez la communauté</h3>
                <p style="font-size: 15px; margin-bottom: 24px;">Intégrez notre groupe WhatsApp privé pour échanger avec les autres testeurs et nous faire part de vos retours en direct : <br/>
                <a href="https://chat.whatsapp.com/FplCypHbZIu45AhwWhdaHk" style="color: #2563eb; text-decoration: underline;">Rejoindre le groupe WhatsApp</a></p>

                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 40px; border-left: 4px solid #2563eb;">
                    <p style="font-size: 14px; margin: 0; color: #64748b;">Si vous rencontrez le moindre problème, posez simplement votre question sur le groupe WhatsApp.</p>
                </div>

                <p style="font-size: 16px; margin-top: 40px; font-weight: 600;">Bienvenue dans l'aventure !</p>
                <p style="font-size: 15px; color: #64748b;">L'équipe Vendora</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Vendora. Tous droits réservés.</p>
            </div>
        </div>
    `;
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

async function ensureUniqueSlug(base: string) {
    let candidate = base;
    let attempt = 0;
    // loop until we find a slug that's not used
    while (await Tenant.findOne({ slug: candidate }).select("slug")) {
        attempt++;
        const suffix = Math.random().toString(36).slice(2, 6);
        candidate = `${base}-${suffix}`;
        if (attempt > 10) {
            // last resort: append timestamp
            candidate = `${base}-${Date.now()}`;
        }
    }
    return candidate;
}

export async function onboardWaitlistUser(waitlistId: string, options?: { sendEmail?: boolean; adminContext?: { id: string; name: string } }) {
    let admin;
    if (options?.adminContext) {
        admin = options.adminContext;
    } else {
        admin = await requireGlobalAdmin();
    }

    await connectToDatabase();

    const entry = await Waitlist.findById(waitlistId);
    if (!entry) {
        return { success: false, error: "WAITLIST_ENTRY_NOT_FOUND" };
    }

    // 1. Prepare data
    const email = entry.email.toLowerCase().trim();
    const baseSlug = entry.wifiZoneName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with -
        .replace(/-+/g, "-") // Collapse consecutive -
        .replace(/^-|-$/g, ""); // Trim -

    // 2. Pre-transaction checks
    const finalSlug = await ensureUniqueSlug(baseSlug);

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
            slug: finalSlug,
            ownerId: userId,
            notificationEmails: [email],
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
            details: `Waitlist entry approved for ${email}. Created tenant ${finalSlug}.`,
            timestamp: now
        }], { session });

        // - Mark waitlist entry as handled
        await Waitlist.findByIdAndUpdate(waitlistId, { isHandled: true }, { session });

        await session.commitTransaction();

        // 4. Generate Email Template
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const setupUrl = `${baseUrl}/setup-password?uid=${userId}`;
        const emailTemplate = generateOnboardingEmail(setupUrl);

        // 5. Send email if requested
        let emailSent = false;
        if (options?.sendEmail) {
            try {
                const mailOptions = {
                    from: process.env.MAIL_SENDER,
                    to: email,
                    subject: "Bienvenue sur Vendora ! - Accès au test exclusif",
                    html: emailTemplate,
                };
                const info = await transporter.sendMail(mailOptions);
                emailSent = !!info.messageId;
            } catch (mailError) {
                console.error("Failed to send onboarding email automatically:", mailError);
                // We don't fail the whole process if email fails, but we could return the status
            }
        }

        revalidatePath("/admin/waitlist");
        return { success: true, emailTemplate, emailSent };

    } catch (error) {
        await session.abortTransaction();
        console.error("Waitlist onboarding transaction aborted:", error);
        throw error;
    } finally {
        session.endSession();
    }
}

