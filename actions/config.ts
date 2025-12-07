"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateRow } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function getTicketTypes() {
    const rows = await readSheet("Ticket Types");
    return rows.slice(1).map((row) => ({
        id: row[0],
        name: row[1],
        price: parseFloat(row[2]),
        active: row[3] === "TRUE",
        created_at: row[4],
    }));
}

export async function getSalesmen() {
    const rows = await readSheet("Salesmen");
    return rows.slice(1).map((row) => ({
        id: row[0],
        name: row[1],
        active: row[2] === "TRUE",
        created_at: row[3],
    }));
}

export async function createTicketType(data: { name: string; price: number }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const newId = uuidv4();
    const now = new Date().toISOString();

    await appendRow("Ticket Types", [
        newId,
        data.name,
        data.price.toString(),
        "TRUE",
        now,
    ]);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "CREATE",
        "TICKET_TYPE",
        newId,
        `Created ticket type ${data.name}`,
        now,
    ]);

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function createSalesman(data: { name: string }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const newId = uuidv4();
    const now = new Date().toISOString();

    await appendRow("Salesmen", [
        newId,
        data.name,
        "TRUE",
        now,
    ]);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "CREATE",
        "SALESMAN",
        newId,
        `Created salesman ${data.name}`,
        now,
    ]);

    revalidatePath("/config/salesmen");
    return { success: true };
}

export async function toggleTicketType(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Ticket Types");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("Not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[3] = active ? "TRUE" : "FALSE";

    await updateRow("Ticket Types", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "TICKET_TYPE",
        id,
        `Set active to ${active}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function toggleSalesman(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Salesmen");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("Not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[2] = active ? "TRUE" : "FALSE";

    await updateRow("Salesmen", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "SALESMAN",
        id,
        `Set active to ${active}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/salesmen");
    return { success: true };
}

export async function updateTicketType(id: string, data: { name: string; price: number }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Ticket Types");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("Not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[1] = data.name;
    newRow[2] = data.price.toString();

    await updateRow("Ticket Types", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "TICKET_TYPE",
        id,
        `Updated ticket type ${data.name}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function updateSalesman(id: string, data: { name: string }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const rows = await readSheet("Salesmen");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("Not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[1] = data.name;

    await updateRow("Salesmen", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "SALESMAN",
        id,
        `Updated salesman ${data.name}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/salesmen");
    return { success: true };
}
