import connectToDatabase from "@/lib/db";
import { requireTenantAccess } from "@/lib/tenant";
import { Membership } from "@/lib/models";

/**
 * Get all sellers (users with seller role) for the current tenant
 */
export async function getSellers() {
    const { tenantId, role, user } = await requireTenantAccess();

    // If user is a seller, they only need to see themselves for the sale form
    // If they are a manager/owner, they see everyone.
    // However, to avoid complexity in the frontend, let's just fetch all sellers for the tenant.
    // Listing names of colleagues in the same tenant is generally acceptable.

    await connectToDatabase();

    // Fetch memberships with role 'seller' and populate user info
    const memberships = await Membership.find({ tenantId, role: 'seller', active: true })
        .populate('user')
        .lean();

    return memberships.map((m: any) => {
        const u = m.user;
        if (!u) return null;
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            full_name: u.full_name,
            role: m.role,
            active: m.active
        };
    }).filter(Boolean);
}
