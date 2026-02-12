"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { TicketInventory, TicketType, AuditLog } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function getInventory() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();
    // Using lean for performance
    const result = await TicketInventory.find({}).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString()
    }));
}

export async function updateInventoryStock(ticketTypeId: string, newStock: number) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const now = new Date().toISOString();

    const inventoryRecord = await TicketInventory.findOneAndUpdate(
        { ticket_type_id: ticketTypeId },
        {
            current_stock: newStock,
            last_updated: now
        },
        { new: true }
    );

    if (!inventoryRecord) throw new Error("Inventory record not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `Updated stock to ${newStock} for ${inventoryRecord.ticket_type_name}`,
        timestamp: now,
    });

    revalidatePath("/inventory");
    return { success: true };
}

export async function setAlertThreshold(ticketTypeId: string, threshold: number) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const now = new Date().toISOString();

    const inventoryRecord = await TicketInventory.findOneAndUpdate(
        { ticket_type_id: ticketTypeId },
        {
            alert_threshold: threshold,
            last_updated: now
        },
        { new: true }
    );

    if (!inventoryRecord) throw new Error("Inventory record not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `Set alert threshold to ${threshold} for ${inventoryRecord.ticket_type_name}`,
        timestamp: now,
    });

    revalidatePath("/inventory");
    return { success: true };
}

export async function adjustInventory(ticketTypeId: string, quantityChange: number, reason: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();
    const now = new Date().toISOString();

    // Check if inventory exists, if not create it
    let inventoryRecord = await TicketInventory.findOne({ ticket_type_id: ticketTypeId });

    if (!inventoryRecord) {
        // Fetch ticket type name
        const ticketType = await TicketType.findOne({ id: ticketTypeId });

        if (!ticketType) {
            throw new Error("Ticket type not found");
        }

        const ticketTypeName = ticketType.name;
        const initialStock = Math.max(0, quantityChange);

        inventoryRecord = await TicketInventory.create({
            id: uuidv4(),
            ticket_type_id: ticketTypeId,
            ticket_type_name: ticketTypeName,
            current_stock: initialStock,
            alert_threshold: 50,
            last_updated: now,
        });

        await AuditLog.create({
            id: uuidv4(),
            user_id: (session.user as any).id,
            action: "CREATE",
            entity_type: "INVENTORY",
            entity_id: ticketTypeId,
            details: `Initialized inventory for ${ticketTypeName}: ${initialStock} (${reason})`,
            timestamp: now,
        });

        revalidatePath("/inventory");
        return { success: true, newStock: initialStock };
    }

    const currentStock = inventoryRecord.current_stock;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) {
        throw new Error("Insufficient stock");
    }

    inventoryRecord.current_stock = newStock;
    inventoryRecord.last_updated = now;
    await inventoryRecord.save();

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `${reason}: ${quantityChange > 0 ? '+' : ''}${quantityChange} (${currentStock} → ${newStock})`,
        timestamp: now,
    });

    revalidatePath("/inventory");
    return { success: true, newStock };
}

export async function checkLowStock() {
    await connectToDatabase();
    // Use aggregation or simple filter in JS
    const inventory = await TicketInventory.find({}).lean();
    return inventory.filter((item: any) => item.current_stock <= item.alert_threshold)
        .map((doc: any) => ({
            ...doc,
            _id: doc._id.toString()
        }));
}

export async function initializeInventoryForTicketType(ticketTypeId: string, ticketTypeName: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const exists = await TicketInventory.exists({ ticket_type_id: ticketTypeId });
    if (exists) return { success: true };

    await TicketInventory.create({
        id: uuidv4(),
        ticket_type_id: ticketTypeId,
        ticket_type_name: ticketTypeName,
        current_stock: 0,
        alert_threshold: 50,
        last_updated: new Date().toISOString(),
    });

    revalidatePath("/inventory");
    return { success: true };
}
