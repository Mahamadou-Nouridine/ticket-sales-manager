"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { requireTenantAccess } from "@/lib/tenant";
import { Sale, TicketInventory, AuditLog, TicketType } from "@/lib/models";
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
        query.created_by = userId;
    }

    // Sort by created_at desc (most recent first)
    const result = await Sale.find(query).sort({ created_at: -1 }).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString()
    })) as SaleType[];
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
    salesman_name: string;
    ticket_type_name: string;
    quantity: number;
    date_de_prise: string;
    sale_id?: string; // Optional ID if provided by frontend or auto-generated
}) {
    const { tenantId, userId, user } = await requireTenantAccess();
    await connectToDatabase();

    // Start Transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    console.log("Creating Sale. TenantID:", tenantId);

    try {
        // 1. Check Inventory
        // We need to find the Ticket Type ID to find the Inventory
        // Assuming ticket_type_name is unique per tenant or we should have passed ID. 
        // The previous code used name. Let's stick to name but it's risky. 
        // Better to lookup TicketType by name & tenantId first.

        const ticketType = await TicketType.findOne({ name: data.ticket_type_name, tenantId }).session(dbSession);
        if (!ticketType) {
            throw new Error(`Ticket Type '${data.ticket_type_name}' not found.`);
        }

        let inventoryItem = await TicketInventory.findOne({
            ticket_type_id: ticketType.id,
            tenantId
        }).session(dbSession);

        if (!inventoryItem) {
            // Graceful handling: Auto-initialize inventory if missing
            // This shouldn't happen if createTicketType is fixed, but for existing data migration safety:
            inventoryItem = new TicketInventory({
                id: uuidv4(),
                tenantId: tenantId, // Explicit assignment
                ticket_type_id: ticketType.id,
                ticket_type_name: ticketType.name,
                current_stock: 0,
                alert_threshold: 50,
                last_updated: new Date().toISOString()
            });
            console.log("Auto-creating inventory with tenantId:", tenantId);
            await inventoryItem.save({ session: dbSession });
        }

        if (inventoryItem.current_stock < data.quantity) {
            throw new Error(`Stock insuffisant. Disponible: ${inventoryItem.current_stock}, Requis: ${data.quantity}`);
        }

        // 2. Deduct Inventory
        inventoryItem.current_stock -= data.quantity;
        inventoryItem.last_updated = new Date().toISOString();
        await inventoryItem.save({ session: dbSession });

        // 3. Create Sale
        const saleId = data.sale_id || uuidv4();
        const now = new Date().toISOString();

        await Sale.create([{
            id: saleId,
            tenantId,
            salesman_name: data.salesman_name,
            ticket_type_name: data.ticket_type_name,
            quantity: data.quantity,
            date_de_prise: data.date_de_prise,
            verse: false,
            created_by: user.name || user.email || "Unknown",
            created_at: now,
            updated_at: now,
            ticket_type_id: ticketType.id,
            // salesman_id? We only have name from input. 
        }], { session: dbSession });

        // 4. Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "CREATE",
            entity_type: "SALE",
            entity_id: saleId,
            details: `Created sale of ${data.quantity} ${data.ticket_type_name} tickets for ${data.salesman_name}`,
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

        // Authorization check: Superusers (owner/manager) can update all, sellers can only update their own.
        if (role === 'seller') {
            const username = user.username || user.email;
            if (existingSale.created_by !== username) {
                throw new Error("Unauthorized to update this sale");
            }
        }

        const updateFields: any = { updated_at: new Date().toISOString() };
        if (data.salesman_name) updateFields.salesman_name = data.salesman_name;
        if (data.date_de_prise) updateFields.date_de_prise = data.date_de_prise;
        if (data.date_de_versement !== undefined) updateFields.date_de_versement = data.date_de_versement;
        if (data.invoice_number !== undefined) updateFields.invoice_number = data.invoice_number;

        // Handle sensitive updates (Quantity or Ticket Type)
        // If these change, we must revert old inventory and apply new

        const oldQuantity = existingSale.quantity;
        const newQuantity = data.quantity !== undefined ? data.quantity : oldQuantity;

        const oldTicketTypeName = existingSale.ticket_type_name;
        const newTicketTypeName = data.ticket_type_name || oldTicketTypeName;

        const quantityDifference = newQuantity - oldQuantity;

        if (oldTicketTypeName !== newTicketTypeName) {
            // Complex case: Type changed. 
            // 1. Revert old stock
            const oldTicketType = await TicketType.findOne({ name: oldTicketTypeName, tenantId }).session(dbSession);
            if (oldTicketType) {
                const oldInv = await TicketInventory.findOne({ ticket_type_id: oldTicketType.id, tenantId }).session(dbSession);
                if (oldInv) {
                    oldInv.current_stock += oldQuantity;
                    await oldInv.save({ session: dbSession });
                }
            }

            // 2. Deduct new stock
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
            // Same type, just quantity change
            const ticketType = await TicketType.findOne({ name: oldTicketTypeName, tenantId }).session(dbSession);
            if (!ticketType) throw new Error("Ticket Type not found for inventory adjustment");

            const inv = await TicketInventory.findOne({ ticket_type_id: ticketType.id, tenantId }).session(dbSession);
            if (!inv) throw new Error("Inventory not found");

            // If adding more sales (diff > 0), check stock
            if (quantityDifference > 0 && inv.current_stock < quantityDifference) {
                throw new Error("Insufficient stock for update");
            }

            inv.current_stock -= quantityDifference; // If diff is negative (returned), we add to stock (minus negative = plus)
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

    // Only superusers (owner/manager) can delete sales
    if (role !== 'owner' && role !== 'manager') {
        throw new Error("Unauthorized to delete sales");
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const sale = await Sale.findOne({ id, tenantId }).session(dbSession);
        if (!sale) throw new Error("Sale not found");

        // Restore inventory
        // Lookup ticket type by name to get ID (or use stored ID if we had it, strictly we stored ticket_type_id in createSale)
        // Let's try to search by ticket_type_id first if available, else name

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

    // Authorization check: Superusers (owner/manager) can toggle all, sellers can only toggle their own.
    if (role === 'seller') {
        const username = user.username || user.email;
        if (sale.created_by !== username) {
            throw new Error("Unauthorized to toggle payment for this sale");
        }
    }

    sale.verse = !sale.verse;
    // Update date_de_versement if paid
    if (sale.verse) {
        sale.date_de_versement = new Date().toISOString().split('T')[0];
    } else {
        sale.date_de_versement = undefined;
    }

    await sale.save();

    // Audit Log (Optional for toggle, but good practice)
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
