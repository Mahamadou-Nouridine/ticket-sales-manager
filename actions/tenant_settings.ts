"use server";

import connectToDatabase from "@/lib/db";
import { Tenant, AuditLog } from "@/lib/models";
import { requireTenantAccess } from "@/lib/tenant";
import { v4 as uuidv4 } from "uuid";
import { revalidateTenantPaths } from "@/lib/revalidate";

/**
 * Update tenant settings (Manager only)
 */
export async function updateTenantSettings(data: { currency?: string; name?: string; notificationRecipients?: any[] }) {
    const { tenantId, role, userId } = await requireTenantAccess();

    if (role !== 'owner' && role !== 'manager') {
        throw new Error("Unauthorized: Only managers can update settings");
    }

    await connectToDatabase();

    const tenant = await Tenant.findOne({ id: tenantId });
    if (!tenant) throw new Error("Tenant not found");

    const updates: any = {};
    if (data.currency) updates.currency = data.currency;
    if (data.name) updates.name = data.name;
    if (data.notificationRecipients) updates.notificationRecipients = data.notificationRecipients;

    await Tenant.updateOne({ id: tenantId }, updates);

    // Audit Log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "TENANT_SETTINGS",
        entity_id: tenantId,
        details: `Updated settings: ${JSON.stringify(updates)}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/config", "/sales", "/dashboard"]);
    return { success: true };
}

/**
 * Get tenant settings
 */
export async function getTenantSettings() {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();

    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    if (!tenant) throw new Error("Tenant not found");

    let recipients = tenant.notificationRecipients || [];
    if (recipients.length === 0 && tenant.notificationEmails && tenant.notificationEmails.length > 0) {
        recipients = tenant.notificationEmails.map((email: string) => ({
            email,
            notifications: {
                sale_submission: true,
                new_demand: true
            }
        }));
    }

    return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        currency: tenant.currency || 'FCFA',
        plan: tenant.plan,
        active: tenant.active,
        notificationRecipients: recipients
    };
}
