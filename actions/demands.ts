"use server";

import connectToDatabase from "@/lib/db";
import { requireTenantAccess } from "@/lib/tenant";
import { Demand, TicketType, AuditLog, Tenant, User, TicketInventory, Sale, Membership } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { sendDemandNotification } from "@/lib/mail";

export async function getDemands() {
    const { tenantId, user, role } = await requireTenantAccess();
    await connectToDatabase();

    const query: any = { tenantId };
    
    // Only managers and owners can see all demands
    if (role !== "owner" && role !== "manager") {
        query.seller_id = user.id;
    }

    const demands = await Demand.find(query).sort({ created_at: -1 }).lean();

    // Map seller names
    const memberships = await Membership.find({ tenantId }).populate('user').lean();
    const sellerMap = new Map();

    memberships.forEach((m: any) => {
        const u = m.user;
        if (u) {
            const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.full_name || u.username || u.email;
            sellerMap.set(u.id, displayName);
        }
    });

    return demands.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString(),
        seller_name: sellerMap.get(doc.seller_id) || "Inconnu",
    }));
}

export async function createDemand(data: {
    seller_id: string; // The selected seller (manager can select, seller it will be themselves)
    ticket_type_name: string;
    quantity: number;
    notes?: string;
}) {
    const { tenantId, user, role, userId } = await requireTenantAccess();
    await connectToDatabase();

    // Determine actual seller ID. Sellers can only create for themselves.
    let sellerId = data.seller_id;
    if (role === "seller" && sellerId !== userId) {
        sellerId = userId; // Force seller to their own ID
    }

    const ticketType = await TicketType.findOne({ name: data.ticket_type_name, tenantId });
    if (!ticketType) {
        throw new Error(`Ticket Type '${data.ticket_type_name}' not found.`);
    }

    const demandId = uuidv4();
    const now = new Date().toISOString();

    await Demand.create({
        id: demandId,
        tenantId,
        seller_id: sellerId,
        ticket_type_id: ticketType.id,
        ticket_type_name: ticketType.name,
        quantity: data.quantity,
        notes: data.notes,
        status: "pending",
        created_at: now,
    });

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "CREATE",
        entity_type: "DEMAND",
        entity_id: demandId,
        details: `Created demand for ${data.quantity} ${data.ticket_type_name} tickets`,
        timestamp: now,
    });

    await revalidateTenantPaths(["/demands", "/dashboard"]);

    // Send Notification to Managers
    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    if (tenant) {
        let recipientEmails: string[] = [];

        // Check new structured notification preferences
        if (tenant.notificationRecipients && tenant.notificationRecipients.length > 0) {
            recipientEmails = tenant.notificationRecipients
                .filter((r: any) => r.notifications && r.notifications.new_demand)
                .map((r: any) => r.email);
        } else if (tenant.notificationEmails && tenant.notificationEmails.length > 0) {
            // Fallback to legacy
            recipientEmails = tenant.notificationEmails;
        } else if (tenant.ownerId) {
            // Fallback to owner
            const owner = await User.findOne({ id: tenant.ownerId }).select('email').lean();
            if (owner?.email) {
                recipientEmails = [owner.email];
            }
        }

        if (recipientEmails.length > 0) {
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            
            // Get actual seller name for email
            const seller = await User.findOne({ id: sellerId }).lean();
            const sellerName = seller ? (seller.full_name || seller.username || seller.email) : "Un vendeur";

            sendDemandNotification(recipientEmails, {
                sellerName,
                ticketTypeName: data.ticket_type_name,
                quantity: data.quantity,
                tenantName: tenant.name,
                dashboardUrl: `${baseUrl}/t/${tenant.slug}/demands`
            }).catch(err => console.error("Async demand notification failed:", err));
        }
    }

    return { success: true };
}

export async function reviewDemand(
    demandId: string,
    status: 'approved' | 'rejected',
    reason?: string
) {
    const { tenantId, user, role, userId } = await requireTenantAccess();
    
    if (role !== "owner" && role !== "manager") {
        throw new Error("Unauthorized: Only managers can review demands");
    }

    await connectToDatabase();
    
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const demand = await Demand.findOne({ id: demandId, tenantId }).session(dbSession);
        if (!demand) throw new Error("Demand not found");

        if (demand.status !== "pending") {
            throw new Error(`Demand is already ${demand.status}`);
        }

        demand.status = status;
        demand.reviewed_by = userId;
        demand.reviewed_at = new Date().toISOString();

        if (status === "rejected") {
            demand.rejection_reason = reason;
        } else if (status === "approved") {
            // Proceed to create the sale
            let inventoryItem = await TicketInventory.findOne({
                ticket_type_id: demand.ticket_type_id,
                tenantId
            }).session(dbSession);

            if (!inventoryItem) {
                inventoryItem = new TicketInventory({
                    id: uuidv4(),
                    tenantId: tenantId,
                    ticket_type_id: demand.ticket_type_id,
                    ticket_type_name: demand.ticket_type_name,
                    current_stock: 0,
                    alert_threshold: 50,
                    last_updated: new Date().toISOString()
                });
                await inventoryItem.save({ session: dbSession });
            }

            if (inventoryItem.current_stock < demand.quantity) {
                throw new Error(`Stock insuffisant. Disponible: ${inventoryItem.current_stock}, Requis: ${demand.quantity}`);
            }

            // Deduct stock
            inventoryItem.current_stock -= demand.quantity;
            inventoryItem.last_updated = new Date().toISOString();
            await inventoryItem.save({ session: dbSession });

            const saleId = uuidv4();
            const now = new Date().toISOString();

            // Create the Sale
            await Sale.create([{
                id: saleId,
                tenantId,
                seller_id: demand.seller_id,
                ticket_type_name: demand.ticket_type_name,
                quantity: demand.quantity,
                date_de_prise: new Date().toISOString().split('T')[0],
                verse: false,
                created_by: user.username || user.email || "Unknown",
                created_at: now,
                updated_at: now,
                ticket_type_id: demand.ticket_type_id,
            }], { session: dbSession });

            demand.created_sale_id = saleId;

            // Audit log for sale creation
            await AuditLog.create([{
                id: uuidv4(),
                tenantId,
                user_id: userId,
                action: "CREATE",
                entity_type: "SALE",
                entity_id: saleId,
                details: `Created sale of ${demand.quantity} ${demand.ticket_type_name} tickets (from approved demand)`,
                timestamp: now,
            }], { session: dbSession });
        }

        await demand.save({ session: dbSession });

        // Audit log for demand review
        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: status.toUpperCase(),
            entity_type: "DEMAND",
            entity_id: demandId,
            details: `Demand ${status}${reason ? ' - Reason: ' + reason : ''}`,
            timestamp: new Date().toISOString(),
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        await revalidateTenantPaths(["/demands", "/sales", "/dashboard", "/inventory"]);
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}
