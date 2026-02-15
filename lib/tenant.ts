import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Membership, User } from "@/lib/models"; // Added User import
import connectToDatabase from "@/lib/db";

export async function requireTenantAccess() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized: No session");
    }

    const userId = session.user.id;
    const tenantId = (session.user as any).tenantId;

    if (!tenantId) {
        throw new Error("Unauthorized: No tenant selected");
    }

    await connectToDatabase();

    // Verify membership exists and is active
    const membership = await Membership.findOne({
        userId,
        tenantId,
        active: true
    }).lean();

    if (!membership) {
        throw new Error("Forbidden: Invalid membership");
    }

    // Fetch fresh user data from DB
    const userData = await User.findOne({ id: userId }).lean();
    if (!userData) {
        throw new Error("User not found");
    }

    return {
        userId,
        tenantId,
        user: {
            ...session.user,
            ...userData,
            id: userId // Ensure ID is consistent
        },
        role: membership.role
    };
}
