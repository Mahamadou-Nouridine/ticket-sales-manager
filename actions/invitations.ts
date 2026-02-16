"use server";

import { Invitation, User, Tenant, Membership, AuditLog } from "@/lib/models";
import { requireTenantAccess } from "@/lib/tenant";
import { v4 as uuidv4 } from "uuid";
import connectToDatabase from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Send invitation to existing user
 */
export async function sendInvitation(data: {
    email: string;
    role: 'manager' | 'seller';
}) {
    const { tenantId, userId, role: senderRole } = await requireTenantAccess();

    if (senderRole !== 'manager') {
        throw new Error("Seuls les managers peuvent envoyer des invitations");
    }

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
        userId: user.id,
        tenantId
    });
    if (existingMembership) {
        return { error: "USER_ALREADY_MEMBER" };
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
        tenantId,
        invitedUserId: user.id,
        status: 'pending'
    });
    if (existingInvitation) {
        return { error: "INVITATION_ALREADY_SENT" };
    }

    const now = new Date().toISOString();
    await Invitation.create({
        id: uuidv4(),
        tenantId,
        invitedUserId: user.id,
        invitedBy: userId,
        role: data.role,
        status: 'pending',
        created_at: now
    });

    // Audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "CREATE",
        entity_type: "INVITATION",
        entity_id: user.id,
        details: `Invited ${data.email} as ${data.role}`,
        timestamp: now
    });

    return {
        success: true,
        message: `Invitation envoyée à ${data.email}`
    };
}

/**
 * Get my pending invitations
 */
export async function getMyInvitations() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const userId = (session.user as any).id;

    const invitations = await Invitation.find({
        invitedUserId: userId,
        status: 'pending'
    }).lean();

    // Populate tenant and inviter info
    const result = await Promise.all(
        invitations.map(async (inv: any) => {
            const tenant = await Tenant.findOne({ id: inv.tenantId }).lean();
            const inviter = await User.findOne({ id: inv.invitedBy }).lean();

            return {
                id: inv.id,
                tenantId: inv.tenantId,
                tenantName: tenant?.name || 'Organisation inconnue',
                inviterName: inviter?.full_name || 'Utilisateur inconnu',
                role: inv.role,
                created_at: inv.created_at
            };
        })
    );

    return result;
}

/**
 * Accept invitation
 */
export async function acceptInvitation(invitationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const userId = (session.user as any).id;

    const invitation = await Invitation.findOne({
        id: invitationId,
        invitedUserId: userId,
        status: 'pending'
    });

    if (!invitation) {
        throw new Error("Invitation non trouvée ou déjà traitée");
    }

    const now = new Date().toISOString();

    // Create membership
    await Membership.create({
        id: uuidv4(),
        userId: userId,
        tenantId: invitation.tenantId,
        role: invitation.role,
        active: true,
        created_at: now
    });

    // Update invitation status
    invitation.status = 'accepted';
    invitation.responded_at = now;
    await invitation.save();

    // Audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId: invitation.tenantId,
        user_id: userId,
        action: "ACCEPT",
        entity_type: "INVITATION",
        entity_id: invitationId,
        details: `Accepted invitation to join organization`,
        timestamp: now
    });

    revalidatePath("/");
    return { success: true };
}

/**
 * Decline invitation
 */
export async function declineInvitation(invitationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Non authentifié");

    await connectToDatabase();
    const userId = (session.user as any).id;

    const invitation = await Invitation.findOne({
        id: invitationId,
        invitedUserId: userId,
        status: 'pending'
    });

    if (!invitation) {
        throw new Error("Invitation non trouvée ou déjà traitée");
    }

    const now = new Date().toISOString();
    invitation.status = 'declined';
    invitation.responded_at = now;
    await invitation.save();

    revalidatePath("/");
    return { success: true };
}
