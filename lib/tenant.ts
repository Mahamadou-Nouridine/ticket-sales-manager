import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Membership } from "@/lib/models";
import connectToDatabase from "@/lib/db";

export async function requireTenantAccess() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized: No session");
    }

    const userId = session.user.id;
    // We expect tenantId to be in the session if the user has selected a workspace
    const tenantId = (session.user as any).tenantId;

    if (!tenantId) {
        throw new Error("Unauthorized: No tenant selected");
    }

    await connectToDatabase();

    // Verify membership exists and is active
    // We could rely on session claim, but for critical actions, a DB check is safer
    // tailored to the "Never trust tenantId from frontend" requirement.
    // However, since we are getting tenantId FROM SESSION (which is signed), we can trust it.
    // But let's do a quick check if we want to support instant revocation.
    // For now, trusting session is faster, but the prompt asked to "Valid membership".
    // "Verify Membership exists... Verify membership is active... Throw 403 if invalid"

    const membership = await Membership.findOne({
        userId,
        tenantId,
        active: true
    }).lean();

    if (!membership) {
        throw new Error("Forbidden: Invalid membership");
    }

    return {
        userId,
        tenantId,
        user: session.user,
        role: membership.role
    };
}
