"use server";

import connectToDatabase from "@/lib/db";
import { TicketInventory, TicketType, AuditLog } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { revalidateTenantPaths } from "@/lib/revalidate";
import mongoose from "mongoose";
import { requireTenantAccess } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getInventory() {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();
    // Using lean for performance
    const result = await TicketInventory.find({ tenantId }).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString()
    }));
}

export async function adjustInventory(ticketTypeId: string, quantityChange: number, reason: string) {
    const { tenantId, userId } = await requireTenantAccess();
    await connectToDatabase();
    const now = new Date().toISOString();

    // Check if inventory exists, if not create it
    let inventoryRecord = await TicketInventory.findOne({ ticket_type_id: ticketTypeId, tenantId });

    if (!inventoryRecord) {
        // Fetch ticket type name
        const ticketType = await TicketType.findOne({ id: ticketTypeId, tenantId });

        if (!ticketType) {
            throw new Error("Ticket type not found");
        }

        const ticketTypeName = ticketType.name;
        const initialStock = Math.max(0, quantityChange);

        inventoryRecord = await TicketInventory.create({
            id: uuidv4(),
            tenantId,
            ticket_type_id: ticketTypeId,
            ticket_type_name: ticketTypeName,
            current_stock: initialStock,
            alert_threshold: 50,
            last_updated: now,
        });

        await AuditLog.create({
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "CREATE",
            entity_type: "INVENTORY",
            entity_id: ticketTypeId,
            details: `Initialized inventory for ${ticketTypeName}: ${initialStock} (${reason})`,
            timestamp: now,
        });

        await revalidateTenantPaths(["/inventory"]);
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
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `${reason}: ${quantityChange > 0 ? '+' : ''}${quantityChange} (${currentStock} → ${newStock})`,
        timestamp: now,
    });

    await revalidateTenantPaths(["/inventory"]);
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
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();

    const exists = await TicketInventory.exists({ ticket_type_id: ticketTypeId, tenantId });
    if (exists) return { success: true };

    await TicketInventory.create({
        id: uuidv4(),
        tenantId,
        ticket_type_id: ticketTypeId,
        ticket_type_name: ticketTypeName,
        current_stock: 0,
        alert_threshold: 50,
        last_updated: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/inventory"]);
    return { success: true };
}

export async function updateInventoryStock(ticketTypeId: string, newStock: number) {
    const { tenantId, userId } = await requireTenantAccess();
    await connectToDatabase();

    const inventory = await TicketInventory.findOne({ ticket_type_id: ticketTypeId, tenantId });

    if (!inventory) {
        // If not found, maybe initialize? 
        // For now, throw error as it should exist if we are editing it
        throw new Error("Inventory record not found");
    }

    const oldStock = inventory.current_stock;
    inventory.current_stock = newStock;
    inventory.last_updated = new Date().toISOString();
    await inventory.save();

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `Manually updated stock: ${oldStock} → ${newStock}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/inventory"]);
    return { success: true };
}

export async function setAlertThreshold(ticketTypeId: string, newThreshold: number) {
    const { tenantId, userId } = await requireTenantAccess();
    await connectToDatabase();

    const inventory = await TicketInventory.findOne({ ticket_type_id: ticketTypeId, tenantId });
    if (!inventory) throw new Error("Inventory record not found");

    inventory.alert_threshold = newThreshold;
    inventory.last_updated = new Date().toISOString();
    await inventory.save();

    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "INVENTORY",
        entity_id: ticketTypeId,
        details: `Updated alert threshold to ${newThreshold}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/inventory"]);
    return { success: true };
}
