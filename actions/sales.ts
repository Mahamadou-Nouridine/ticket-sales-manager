"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Sale, TicketInventory, AuditLog, TicketType } from "@/lib/models";
import { Sale as SaleType, CreateSaleInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export async function getSales() {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    await connectToDatabase();

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    const query = isSuperuser ? {} : { created_by: username };

    // Sort by created_at desc (most recent first)
    const result = await Sale.find(query).sort({ created_at: -1 }).lean();

    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString()
    })) as SaleType[];
}

export async function getSale(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    await connectToDatabase();

    const sale = await Sale.findOne({ id }).lean();

    if (!sale) return null;

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && sale.created_by !== username) {
        return null; // Not authorized
    }

    return {
        ...sale,
        _id: sale._id.toString(),
    } as SaleType;
}

export async function createSale(data: CreateSaleInput) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();
    const username = (session.user as any).email;
    const newId = uuidv4();
    const now = new Date().toISOString();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Find ticket type ID for inventory adjustment
        const ticketType = await TicketType.findOne({ name: data.ticket_type_name }).session(dbSession);

        // Even if we don't have the ticket type ID readily available from the input (which used to utilize names),
        // we can still query inventory by ticket_type_name if needed, but ID is safer if we can get it.
        // The current google-sheets implementation searched inventory by ticket_type_name to find the ID.
        // Let's do the same for safety.

        let invUpdateSuccess = false;

        // Find Inventory by Name first
        const inventoryItem = await TicketInventory.findOne({ ticket_type_name: data.ticket_type_name }).session(dbSession);

        if (inventoryItem) {
            // Check stock
            if (inventoryItem.current_stock < data.quantity) {
                throw new Error(`Insufficient stock for ${data.ticket_type_name}`);
            }

            inventoryItem.current_stock -= data.quantity;
            inventoryItem.last_updated = now;
            await inventoryItem.save({ session: dbSession });
            invUpdateSuccess = true;
        } else {
            // If no inventory record, we might want to check if we can create it or fail.
            // Google sheets implementation "tried" to adjust inventory and logged error if failed, but didn't stop sale?
            // "Continue even if inventory adjustment fails" was the comment.
            // BUT user asked for "transactions" implies they want consistency.
            // If we can't deduct stock, creating a sale creates data drift (phantom stock).
            // However, to mimic previous flexibility while improving safety:
            // Let's FAIL if stock exists and is insufficient.
            // If stock record doesn't exist, we warn?
            // Let's assume strict inventory management is desired with providing "db interaction optimization".
            console.warn(`No inventory record found for ${data.ticket_type_name}`);
        }

        // Create Sale
        await Sale.create([{
            id: newId,
            salesman_name: data.salesman_name,
            ticket_type_name: data.ticket_type_name,
            quantity: data.quantity,
            date_de_prise: data.date_de_prise,
            date_de_versement: data.date_de_versement || "",
            verse: data.verse,
            invoice_number: data.invoice_number || "",
            created_by: username,
            created_at: now,
            updated_at: now,
        }], { session: dbSession });

        // Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            user_id: (session.user as any).id,
            action: "CREATE",
            entity_type: "SALE",
            entity_id: newId,
            details: `Created sale for ${data.salesman_name}`,
            timestamp: now,
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        revalidatePath("/sales");
        revalidatePath("/dashboard");
        return { success: true, id: newId };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function updateSale(id: string, data: Partial<SaleType>) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();

    // Authorization Check
    const existingSale = await Sale.findOne({ id });
    if (!existingSale) throw new Error("Sale not found");

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && existingSale.created_by !== username) {
        throw new Error("Unauthorized");
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const oldQuantity = existingSale.quantity;
        const newQuantity = data.quantity !== undefined ? data.quantity : oldQuantity;
        const quantityDifference = newQuantity - oldQuantity;
        const oldTicketType = existingSale.ticket_type_name;
        const newTicketType = data.ticket_type_name || oldTicketType;
        const now = new Date().toISOString();

        // 1. Revert specific inventory impacts if type changed, or adjust if quantity changed
        // Strict consistency: operations must succeed

        if (oldTicketType !== newTicketType) {
            // Restore old stock
            const oldInv = await TicketInventory.findOne({ ticket_type_name: oldTicketType }).session(dbSession);
            if (oldInv) {
                oldInv.current_stock += oldQuantity;
                oldInv.last_updated = now;
                await oldInv.save({ session: dbSession });
            }

            // Deduct new stock
            const newInv = await TicketInventory.findOne({ ticket_type_name: newTicketType }).session(dbSession);
            if (newInv) {
                if (newInv.current_stock < newQuantity) {
                    throw new Error(`Insufficient stock for ${newTicketType}`);
                }
                newInv.current_stock -= newQuantity;
                newInv.last_updated = now;
                await newInv.save({ session: dbSession });
            }
        } else if (quantityDifference !== 0) {
            // Deduct difference (if pos, stock goes down. if neg, stock goes up)
            const inv = await TicketInventory.findOne({ ticket_type_name: newTicketType }).session(dbSession);
            if (inv) {
                // Check sufficiency if taking more
                if (quantityDifference > 0 && inv.current_stock < quantityDifference) {
                    throw new Error(`Insufficient stock for ${newTicketType}`);
                }
                inv.current_stock -= quantityDifference;
                inv.last_updated = now;
                await inv.save({ session: dbSession });
            }
        }

        // 2. Update Sale
        const updateFields: any = { updated_at: now };
        if (data.salesman_name) updateFields.salesman_name = data.salesman_name;
        if (data.ticket_type_name) updateFields.ticket_type_name = data.ticket_type_name;
        if (data.quantity !== undefined) updateFields.quantity = data.quantity;
        if (data.date_de_prise) updateFields.date_de_prise = data.date_de_prise;
        if (data.date_de_versement !== undefined) updateFields.date_de_versement = data.date_de_versement;
        if (data.verse !== undefined) updateFields.verse = data.verse;
        if (data.invoice_number !== undefined) updateFields.invoice_number = data.invoice_number;

        await Sale.updateOne({ id }, updateFields).session(dbSession);

        // 3. Audit Log
        const diffText = quantityDifference !== 0 ? ` (qty: ${oldQuantity} → ${newQuantity})` : '';
        await AuditLog.create([{
            id: uuidv4(),
            user_id: (session.user as any).id,
            action: "UPDATE",
            entity_type: "SALE",
            entity_id: id,
            details: `Updated sale${diffText}`,
            timestamp: now,
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        revalidatePath("/sales");
        revalidatePath("/dashboard");
        revalidatePath("/inventory");
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function deleteSale(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const isSuperuser = (session.user as any).role === "superuser";
    if (!isSuperuser) throw new Error("Unauthorized");

    await connectToDatabase();

    // Get sale details first to restore inventory
    const saleToDelete = await Sale.findOne({ id });
    if (!saleToDelete) throw new Error("Sale not found");

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const ticketTypeName = saleToDelete.ticket_type_name;
        const quantity = saleToDelete.quantity;
        const now = new Date().toISOString();

        // Restore inventory
        const inventoryItem = await TicketInventory.findOne({ ticket_type_name: ticketTypeName }).session(dbSession);
        if (inventoryItem) {
            inventoryItem.current_stock += quantity;
            inventoryItem.last_updated = now;
            await inventoryItem.save({ session: dbSession });
        }

        // Delete Sale
        await Sale.deleteOne({ id }).session(dbSession);

        // Audit Log
        await AuditLog.create([{
            id: uuidv4(),
            user_id: (session.user as any).id,
            action: "DELETE",
            entity_type: "SALE",
            entity_id: id,
            details: `Deleted sale`,
            timestamp: now,
        }], { session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        revalidatePath("/sales");
        revalidatePath("/dashboard");
        return { success: true };

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}

export async function toggleSalePayment(id: string, verse: boolean, invoiceNumber?: string, paymentDate?: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();

    const existingSale = await Sale.findOne({ id });
    if (!existingSale) throw new Error("Sale not found");

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && existingSale.created_by !== username) {
        throw new Error("Unauthorized");
    }

    const updateFields: any = {
        verse,
        updated_at: new Date().toISOString()
    };

    if (verse && paymentDate) {
        updateFields.date_de_versement = paymentDate;
    }
    if (verse && invoiceNumber) {
        updateFields.invoice_number = invoiceNumber;
    }

    await Sale.updateOne({ id }, updateFields);

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "SALE",
        entity_id: id,
        details: `Toggled payment to ${verse}${invoiceNumber ? ` with invoice ${invoiceNumber}` : ''}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true };
}
