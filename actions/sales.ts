"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { requireTenantAccess } from "@/lib/tenant";
import { Sale, TicketInventory, AuditLog, TicketType, User as UserModel, Membership, SalePayment } from "@/lib/models";
import { Sale as SaleType, CreateSaleInput } from "@/lib/types";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export async function getSales() {
    const { tenantId, user } = await requireTenantAccess();
    await connectToDatabase();

    const role = user.role;
    const userId = user.id;

    // Owners and managers see all sales in their tenant
    // Regular users see only their own sales
    let query: any = { tenantId };

    if (role !== "owner" && role !== "manager") {
        query.seller_id = userId;
    }

    // Sort by created_at desc (most recent first)
    const sales = await Sale.find(query).sort({ created_at: -1 }).lean();

    // Get all memberships for this tenant to fetch accurate seller info
    const memberships = await Membership.find({ tenantId }).populate('user').lean();
    const sellerMap = new Map();

    memberships.forEach((m: any) => {
        const u = m.user;
        if (u) {
            const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.full_name || u.username || u.email;
            sellerMap.set(u.id, displayName);
        }
    });

    // Get all pending/rejected payments for these sales to determine status
    const payments = await SalePayment.find({ tenantId, sale_id: { $in: sales.map(s => s.id) } }).lean();
    const paymentMap = new Map();
    payments.forEach(p => {
        paymentMap.set(p.sale_id, p);
    });

    return sales.map((doc: any) => {
        const payment = paymentMap.get(doc.id);
        let status = "not_submitted";
        if (doc.verse) {
            status = "approved";
        } else if (payment) {
            status = payment.status; // pending or rejected
        }

        return {
            ...doc,
            _id: doc._id.toString(),
            seller_name: sellerMap.get(doc.seller_id) || "Inconnu",
            payment_status: status,
            payment_details: payment ? { ...payment, _id: payment._id.toString() } : null
        };
    }) as any[];
}

export async function getSaleById(saleId: string) {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();

    const sale = await Sale.findOne({ id: saleId, tenantId }).lean();
    if (!sale) return null;

    return {
        ...sale,
        _id: sale._id.toString()
    } as SaleType;
}

export async function createSale(data: {
    seller_id: string;
    ticket_type_name: string;
    quantity: number;
    date_de_prise: string;
    sale_id?: string; // Optional ID if provided by frontend or auto-generated
}) {
    const { tenantId, userId, user, role } = await requireTenantAccess();
    await connectToDatabase();

    // ONLY owners and managers can create sales
    if (role !== "owner" && role !== "manager") {
        throw new Error("Unauthorized: Only managers and owners can create sales");
    }

    let sellerId = data.seller_id;

    // Start Transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    console.log("Creating Sale. TenantID:", tenantId);

    try {
        const ticketType = await TicketType.findOne({ name: data.ticket_type_name, tenantId }).session(dbSession);
        if (!ticketType) {
            throw new Error(`Ticket Type '${data.ticket_type_name}' not found.`);
        }

        let inventoryItem = await TicketInventory.findOne({
            ticket_type_id: ticketType.id,
            tenantId
        }).session(dbSession);

        if (!inventoryItem) {
            inventoryItem = new TicketInventory({
                id: uuidv4(),
                tenantId: tenantId,
                ticket_type_id: ticketType.id,
                ticket_type_name: ticketType.name,
                current_stock: 0,
                alert_threshold: 50,
                last_updated: new Date().toISOString()
            });
            await inventoryItem.save({ session: dbSession });
        }

        if (inventoryItem.current_stock < data.quantity) {
            throw new Error(`Stock insuffisant. Disponible: ${inventoryItem.current_stock}, Requis: ${data.quantity}`);
        }

        inventoryItem.current_stock -= data.quantity;
        inventoryItem.last_updated = new Date().toISOString();
        await inventoryItem.save({ session: dbSession });

        const saleId = data.sale_id || uuidv4();
        const now = new Date().toISOString();

        await Sale.create([{
            id: saleId,
            tenantId,
            seller_id: sellerId,
            ticket_type_name: data.ticket_type_name,
            quantity: data.quantity,
            date_de_prise: data.date_de_prise,
            verse: false,
            created_by: user.username || user.email || "Unknown",
            created_at: now,
            updated_at: now,
            ticket_type_id: ticketType.id,
        }], { session: dbSession });

        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "CREATE",
            entity_type: "SALE",
            entity_id: saleId,
            details: `Created sale of ${data.quantity} ${data.ticket_type_name} tickets for seller ${data.seller_id}`,
            timestamp: now,
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        await revalidateTenantPaths(["/sales", "/dashboard", "/inventory"]);
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function updateSale(id: string, data: Partial<SaleType>) {
    const { tenantId, userId, role, user } = await requireTenantAccess();
    await connectToDatabase();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const existingSale = await Sale.findOne({ id, tenantId }).session(dbSession);
        if (!existingSale) throw new Error("Sale not found");

        if (role === 'seller') {
            if (existingSale.seller_id !== userId) {
                throw new Error("Unauthorized to update this sale");
            }
        }

        const updateFields: any = { updated_at: new Date().toISOString() };
        if (data.seller_id) updateFields.seller_id = data.seller_id;
        if (data.date_de_prise) updateFields.date_de_prise = data.date_de_prise;
        if (data.date_de_versement !== undefined) updateFields.date_de_versement = data.date_de_versement;
        if (data.invoice_number !== undefined) updateFields.invoice_number = data.invoice_number;

        const oldQuantity = existingSale.quantity;
        const newQuantity = data.quantity !== undefined ? data.quantity : oldQuantity;

        const oldTicketTypeName = existingSale.ticket_type_name;
        const newTicketTypeName = data.ticket_type_name || oldTicketTypeName;

        const quantityDifference = newQuantity - oldQuantity;

        if (oldTicketTypeName !== newTicketTypeName) {
            const oldTicketType = await TicketType.findOne({ name: oldTicketTypeName, tenantId }).session(dbSession);
            if (oldTicketType) {
                const oldInv = await TicketInventory.findOne({ ticket_type_id: oldTicketType.id, tenantId }).session(dbSession);
                if (oldInv) {
                    oldInv.current_stock += oldQuantity;
                    await oldInv.save({ session: dbSession });
                }
            }

            const newTicketType = await TicketType.findOne({ name: newTicketTypeName, tenantId }).session(dbSession);
            if (!newTicketType) throw new Error(`New Ticket Type ${newTicketTypeName} not found`);

            const newInv = await TicketInventory.findOne({ ticket_type_id: newTicketType.id, tenantId }).session(dbSession);
            if (!newInv) throw new Error(`Inventory for ${newTicketTypeName} not found`);

            if (newInv.current_stock < newQuantity) throw new Error(`Insufficient stock for new type`);

            newInv.current_stock -= newQuantity;
            await newInv.save({ session: dbSession });

            updateFields.ticket_type_name = newTicketTypeName;
            updateFields.ticket_type_id = newTicketType.id;
            updateFields.quantity = newQuantity;

        } else if (quantityDifference !== 0) {
            const ticketType = await TicketType.findOne({ name: oldTicketTypeName, tenantId }).session(dbSession);
            if (!ticketType) throw new Error("Ticket Type not found for inventory adjustment");

            const inv = await TicketInventory.findOne({ ticket_type_id: ticketType.id, tenantId }).session(dbSession);
            if (!inv) throw new Error("Inventory not found");

            if (quantityDifference > 0 && inv.current_stock < quantityDifference) {
                throw new Error("Insufficient stock for update");
            }

            inv.current_stock -= quantityDifference;
            await inv.save({ session: dbSession });
            updateFields.quantity = newQuantity;
        }

        await Sale.updateOne({ id, tenantId }, updateFields).session(dbSession);

        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "UPDATE",
            entity_type: "SALE",
            entity_id: id,
            details: `Updated sale details`,
            timestamp: new Date().toISOString(),
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        await revalidateTenantPaths(["/sales", "/dashboard", "/inventory"]);
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function deleteSale(id: string) {
    const { tenantId, userId, role } = await requireTenantAccess();
    await connectToDatabase();

    if (role !== 'owner' && role !== 'manager') {
        throw new Error("Unauthorized to delete sales");
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const sale = await Sale.findOne({ id, tenantId }).session(dbSession);
        if (!sale) throw new Error("Sale not found");

        let ticketTypeId = sale.ticket_type_id;
        if (!ticketTypeId) {
            const tt = await TicketType.findOne({ name: sale.ticket_type_name, tenantId }).session(dbSession);
            ticketTypeId = tt?.id;
        }

        if (ticketTypeId) {
            const inventoryItem = await TicketInventory.findOne({ ticket_type_id: ticketTypeId, tenantId }).session(dbSession);
            if (inventoryItem) {
                inventoryItem.current_stock += sale.quantity;
                inventoryItem.last_updated = new Date().toISOString();
                await inventoryItem.save({ session: dbSession });
            }
        }

        await Sale.deleteOne({ id, tenantId }).session(dbSession);

        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "DELETE",
            entity_type: "SALE",
            entity_id: id,
            details: `Deleted sale: ${sale.quantity} ${sale.ticket_type_name}`,
            timestamp: new Date().toISOString(),
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        await revalidateTenantPaths(["/sales", "/dashboard", "/inventory"]);
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function toggleSalePayment(id: string) {
    const { tenantId, userId, role, user } = await requireTenantAccess();
    await connectToDatabase();

    const sale = await Sale.findOne({ id, tenantId });
    if (!sale) throw new Error("Sale not found");

    if (role === 'seller') {
        if (sale.seller_id !== userId) {
            throw new Error("Unauthorized to toggle payment for this sale");
        }
    }

    sale.verse = !sale.verse;
    if (sale.verse) {
        sale.date_de_versement = new Date().toISOString().split('T')[0];
    } else {
        sale.date_de_versement = undefined;
    }

    await sale.save();

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "SALE",
        entity_id: id,
        details: `Toggled payment status to ${sale.verse ? "Paid" : "Unpaid"}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales", "/dashboard"]);
    return { success: true };
}

export async function getDashboardStats(userId?: string) {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();

    const query: any = { tenantId };
    if (userId) {
        query.seller_id = userId;
    }

    const sales = await Sale.find(query).lean();
    const ticketTypes = await TicketType.find({ tenantId }).lean();
    const priceMap = new Map(ticketTypes.map((t) => [t.name, t.price]));

    const stats = {
        totalSales: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        submittedPayments: 0,
        chartData: [] as { name: string, revenue: number }[],
    };

    const payments = await SalePayment.find({ tenantId }).lean();
    const paymentMap = new Map(payments.map(p => [p.sale_id, p]));

    const last7Days: Record<string, number> = {};
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7Days[dateStr] = 0;
    }

    sales.forEach((sale: any) => {
        const price = priceMap.get(sale.ticket_type_name) || 0;
        const revenue = sale.quantity * price;
        stats.totalSales += sale.quantity;

        const payment = paymentMap.get(sale.id);

        if (sale.verse) {
            stats.paidRevenue += revenue;
        } else {
            stats.unpaidRevenue += revenue;
            if (payment && payment.status === "pending") {
                stats.submittedPayments++;
            }
        }

        const date = sale.date_de_prise;
        if (last7Days[date] !== undefined) {
            last7Days[date] += revenue;
        }
    });

    stats.chartData = Object.entries(last7Days).map(([date, revenue]) => {
        const d = new Date(date);
        return {
            name: dayNames[d.getDay()],
            revenue,
        };
    });

    return stats;
}
