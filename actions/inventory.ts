"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateRow } from "@/lib/google-sheets";
import { TicketInventory } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function getInventory() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Inventory");
    // Column structure: id | ticket_type_id | ticket_type_name | current_stock | alert_threshold | last_updated
    return rows.slice(1).map((row) => ({
        id: row[0],
        ticket_type_id: row[1],
        ticket_type_name: row[2],
        current_stock: parseInt(row[3]) || 0,
        alert_threshold: parseInt(row[4]) || 50,
        last_updated: row[5],
    })) as TicketInventory[];
}

export async function updateInventoryStock(ticketTypeId: string, newStock: number) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Inventory");
    const rowIndex = rows.findIndex((row) => row[1] === ticketTypeId);

    if (rowIndex === -1) throw new Error("Inventory record not found");

    const currentRow = rows[rowIndex];
    const newRow = [
        currentRow[0], // id
        currentRow[1], // ticket_type_id
        currentRow[2], // ticket_type_name
        newStock.toString(),
        currentRow[4], // alert_threshold
        new Date().toISOString(),
    ];

    await updateRow("Inventory", rowIndex, newRow);

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "INVENTORY",
        ticketTypeId,
        `Updated stock to ${newStock} for ${currentRow[2]}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/inventory");
    return { success: true };
}

export async function setAlertThreshold(ticketTypeId: string, threshold: number) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Inventory");
    const rowIndex = rows.findIndex((row) => row[1] === ticketTypeId);

    if (rowIndex === -1) throw new Error("Inventory record not found");

    const currentRow = rows[rowIndex];
    const newRow = [
        currentRow[0], // id
        currentRow[1], // ticket_type_id
        currentRow[2], // ticket_type_name
        currentRow[3], // current_stock
        threshold.toString(),
        new Date().toISOString(),
    ];

    await updateRow("Inventory", rowIndex, newRow);

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "INVENTORY",
        ticketTypeId,
        `Set alert threshold to ${threshold} for ${currentRow[2]}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/inventory");
    return { success: true };
}

export async function adjustInventory(ticketTypeId: string, quantityChange: number, reason: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Inventory");
    const rowIndex = rows.findIndex((row) => row[1] === ticketTypeId);

    // If inventory record doesn't exist, create it
    if (rowIndex === -1) {
        // Fetch ticket type name
        const ticketTypesRows = await readSheet("Ticket Types");
        const ticketType = ticketTypesRows.slice(1).find(r => r[0] === ticketTypeId);

        if (!ticketType) {
            throw new Error("Ticket type not found");
        }

        const ticketTypeName = ticketType[1];
        const initialStock = Math.max(0, quantityChange); // Can't go negative on new record

        const newRow = [
            uuidv4(),
            ticketTypeId,
            ticketTypeName,
            initialStock.toString(),
            "50", // default alert threshold
            new Date().toISOString(),
        ];

        await appendRow("Inventory", newRow);

        // Audit Log
        await appendRow("Audit Logs", [
            uuidv4(),
            (session.user as any).id,
            "CREATE",
            "INVENTORY",
            ticketTypeId,
            `Initialized inventory for ${ticketTypeName}: ${initialStock} (${reason})`,
            new Date().toISOString(),
        ]);

        revalidatePath("/inventory");
        return { success: true, newStock: initialStock };
    }

    // Update existing record
    const currentRow = rows[rowIndex];
    const currentStock = parseInt(currentRow[3]) || 0;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) {
        throw new Error("Insufficient stock");
    }

    const newRow = [
        currentRow[0], // id
        currentRow[1], // ticket_type_id
        currentRow[2], // ticket_type_name
        newStock.toString(),
        currentRow[4], // alert_threshold
        new Date().toISOString(),
    ];

    await updateRow("Inventory", rowIndex, newRow);

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "INVENTORY",
        ticketTypeId,
        `${reason}: ${quantityChange > 0 ? '+' : ''}${quantityChange} (${currentStock} → ${newStock})`,
        new Date().toISOString(),
    ]);

    revalidatePath("/inventory");
    return { success: true, newStock };
}

export async function checkLowStock() {
    const inventory = await getInventory();
    return inventory.filter((item) => item.current_stock <= item.alert_threshold);
}

export async function initializeInventoryForTicketType(ticketTypeId: string, ticketTypeName: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Inventory");
    const exists = rows.slice(1).some((row) => row[1] === ticketTypeId);

    if (exists) return { success: true };

    const newRow = [
        uuidv4(),
        ticketTypeId,
        ticketTypeName,
        "0", // initial stock
        "50", // default alert threshold
        new Date().toISOString(),
    ];

    await appendRow("Inventory", newRow);
    revalidatePath("/inventory");
    return { success: true };
}
