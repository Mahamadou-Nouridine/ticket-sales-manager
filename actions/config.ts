"use server";

import connectToDatabase from "@/lib/db";
import { TicketType, AuditLog, TicketInventory } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { requireTenantAccess } from "@/lib/tenant";

// --- Ticket Types ---

export async function getTicketTypes() {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();
    // Filter by tenantId
    const result = await TicketType.find({ tenantId }).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString(),
        price: Number(doc.price) // Ensure number
    }));
}

export async function createTicketType(name: string, price: number) {
    const { tenantId, userId } = await requireTenantAccess();
    await connectToDatabase();

    const newTicketType = {
        id: uuidv4(),
        tenantId,
        name,
        price,
        active: true,
        created_at: new Date().toISOString(),
    };

    await TicketType.create(newTicketType);

    console.log("Creating TicketInventory for Type. TenantID:", tenantId);

    // Initialize Inventory
    await TicketInventory.create({
        id: uuidv4(),
        tenantId,
        ticket_type_id: newTicketType.id,
        ticket_type_name: newTicketType.name,
        current_stock: 0,
        alert_threshold: 50,
        last_updated: new Date().toISOString(),
    });

    // Audit Log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "CREATE",
        entity_type: "TICKET_TYPE",
        entity_id: newTicketType.id,
        details: `Created ticket type: ${name} (${price})`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/config/ticket-types"]);
    return { success: true };
}

export async function toggleTicketType(id: string) {
    const { tenantId, userId } = await requireTenantAccess();
    await connectToDatabase();

    const ticketType = await TicketType.findOne({ id, tenantId });
    if (!ticketType) throw new Error("Ticket Type not found");

    ticketType.active = !ticketType.active;
    await ticketType.save();

    // Audit Log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "TICKET_TYPE",
        entity_id: id,
        details: `Toggled ticket type ${ticketType.name} to ${ticketType.active ? "Active" : "Inactive"}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config");
    return { success: true };
}

export async function updateTicketType(id: string, data: { name: string; price: number }) {

    await connectToDatabase();

    const result = await TicketType.findOneAndUpdate(
        { id },
        { name: data.name, price: data.price },
        { new: true }
    );

    if (!result) throw new Error("Not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "TICKET_TYPE",
        entity_id: id,
        details: `Updated ticket type ${data.name}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/config/ticket-types"]);
    return { success: true };
}
