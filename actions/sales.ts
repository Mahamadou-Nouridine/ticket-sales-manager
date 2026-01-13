"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateRow, deleteRow } from "@/lib/google-sheets";
import { Sale, CreateSaleInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { adjustInventory } from "@/actions/inventory";

export async function getSales() {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    const rows = await readSheet("Sales Records");
    // Column structure: id | salesman_name | ticket_type_name | quantity | date_de_prise | date_de_versement | verse | invoice_number | created_by | created_at | updated_at
    const sales: Sale[] = rows.slice(1).map((row) => ({
        id: row[0],
        salesman_name: row[1],
        ticket_type_name: row[2],
        quantity: parseInt(row[3]),
        date_de_prise: row[4],
        date_de_versement: row[5],
        verse: row[6] === "TRUE",
        invoice_number: row[7] || undefined,
        created_by: row[8],
        created_at: row[9],
        updated_at: row[10],
        salesman_id: "",
        ticket_type_id: "",
    }));

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email; // Using email as username

    if (isSuperuser) {
        return sales;
    }

    return sales.filter((sale) => sale.created_by === username);
}

export async function getSale(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const rows = await readSheet("Sales Records");
    const row = rows.find((row) => row[0] === id);

    if (!row) return null;

    const sale: Sale = {
        id: row[0],
        salesman_name: row[1],
        ticket_type_name: row[2],
        quantity: parseInt(row[3]),
        date_de_prise: row[4],
        date_de_versement: row[5],
        verse: row[6] === "TRUE",
        invoice_number: row[7] || undefined,
        created_by: row[8],
        created_at: row[9],
        updated_at: row[10],
        salesman_id: "",
        ticket_type_id: "",
    };

    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && sale.created_by !== username) {
        return null;
    }

    return sale;
}

export async function createSale(data: CreateSaleInput) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const username = (session.user as any).email;
    const newId = uuidv4();
    const now = new Date().toISOString();

    const row = [
        newId,
        data.salesman_name,
        data.ticket_type_name,
        data.quantity.toString(),
        data.date_de_prise,
        data.date_de_versement || "",
        data.verse ? "TRUE" : "FALSE",
        data.invoice_number || "",
        username,
        now,
        now,
    ];

    await appendRow("Sales Records", row);

    // Adjust inventory - find ticket type ID from inventory
    try {
        const inventoryRows = await readSheet("Inventory");
        const inventoryItem = inventoryRows.slice(1).find(r => r[2] === data.ticket_type_name);
        if (inventoryItem) {
            await adjustInventory(inventoryItem[1], -data.quantity, `Vente créée (${data.salesman_name})`);
        }
    } catch (error) {
        // Continue even if inventory adjustment fails
        console.error("Failed to adjust inventory:", error);
    }

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "CREATE",
        "SALE",
        newId,
        `Created sale for ${data.salesman_name}`,
        now,
    ]);

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, id: newId };
}

export async function updateSale(id: string, data: Partial<Sale>) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Sales Records");
    const rowIndex = rows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) throw new Error("Sale not found");

    const currentRow = rows[rowIndex];
    // Check permission
    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && currentRow[8] !== username) {
        throw new Error("Unauthorized");
    }

    const now = new Date().toISOString();

    // Track quantity change for inventory adjustment
    const oldQuantity = parseInt(currentRow[3]);
    const newQuantity = data.quantity !== undefined ? data.quantity : oldQuantity;
    const quantityDifference = newQuantity - oldQuantity;
    const oldTicketType = currentRow[2];
    const newTicketType = data.ticket_type_name || oldTicketType;

    // Construct new row preserving existing values if not updated
    const newRow = [
        id,
        data.salesman_name || currentRow[1],
        newTicketType,
        newQuantity.toString(),
        data.date_de_prise || currentRow[4],
        data.date_de_versement || currentRow[5],
        data.verse !== undefined ? (data.verse ? "TRUE" : "FALSE") : currentRow[6],
        data.invoice_number !== undefined ? data.invoice_number : currentRow[7],
        currentRow[8], // created_by
        currentRow[9], // created_at
        now, // updated_at
    ];

    await updateRow("Sales Records", rowIndex, newRow);

    // Smart inventory adjustment
    try {
        const inventoryRows = await readSheet("Inventory");

        // If ticket type changed, restore old type and decrease new type
        if (oldTicketType !== newTicketType) {
            // Restore old ticket type inventory
            const oldInventoryItem = inventoryRows.slice(1).find(r => r[2] === oldTicketType);
            if (oldInventoryItem) {
                await adjustInventory(oldInventoryItem[1], oldQuantity, `Vente modifiée (type changé)`);
            }

            // Decrease new ticket type inventory
            const newInventoryItem = inventoryRows.slice(1).find(r => r[2] === newTicketType);
            if (newInventoryItem) {
                await adjustInventory(newInventoryItem[1], -newQuantity, `Vente modifiée (nouveau type)`);
            }
        } else if (quantityDifference !== 0) {
            // Same ticket type, just quantity changed
            const inventoryItem = inventoryRows.slice(1).find(r => r[2] === newTicketType);
            if (inventoryItem) {
                // If quantity increased, decrease inventory (more sold)
                // If quantity decreased, increase inventory (less sold)
                await adjustInventory(inventoryItem[1], -quantityDifference, `Vente modifiée (quantité: ${oldQuantity} → ${newQuantity})`);
            }
        }
    } catch (error) {
        console.error("Failed to adjust inventory on sale update:", error);
    }

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "SALE",
        id,
        `Updated sale${quantityDifference !== 0 ? ` (qty: ${oldQuantity} → ${newQuantity})` : ''}`,
        now,
    ]);

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
    return { success: true };
}

export async function deleteSale(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const isSuperuser = (session.user as any).role === "superuser";
    if (!isSuperuser) throw new Error("Unauthorized");

    const rows = await readSheet("Sales Records");
    const rowIndex = rows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) throw new Error("Sale not found");

    const saleToDelete = rows[rowIndex];
    const ticketTypeName = saleToDelete[2];
    const quantity = parseInt(saleToDelete[3]);

    await deleteRow("Sales Records", rowIndex);

    // Restore inventory
    try {
        const inventoryRows = await readSheet("Inventory");
        const inventoryItem = inventoryRows.slice(1).find(r => r[2] === ticketTypeName);
        if (inventoryItem) {
            await adjustInventory(inventoryItem[1], quantity, `Vente supprimée`);
        }
    } catch (error) {
        console.error("Failed to restore inventory:", error);
    }

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "DELETE",
        "SALE",
        id,
        `Deleted sale`,
        new Date().toISOString(),
    ]);

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function toggleSalePayment(id: string, verse: boolean, invoiceNumber?: string, paymentDate?: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Sales Records");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("Sale not found");

    const currentRow = rows[rowIndex];
    // Check permission
    const isSuperuser = (session.user as any).role === "superuser";
    const username = (session.user as any).email;

    if (!isSuperuser && currentRow[8] !== username) {
        throw new Error("Unauthorized");
    }

    const newRow = [...currentRow];
    newRow[6] = verse ? "TRUE" : "FALSE";
    if (verse && paymentDate) {
        newRow[5] = paymentDate; // date_de_versement
    }
    if (verse && invoiceNumber) {
        newRow[7] = invoiceNumber; // invoice_number
    }
    newRow[10] = new Date().toISOString(); // updated_at

    await updateRow("Sales Records", rowIndex, newRow);

    // Audit Log
    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "SALE",
        id,
        `Toggled payment to ${verse}${invoiceNumber ? ` with invoice ${invoiceNumber}` : ''}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true };
}
