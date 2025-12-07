"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateRow } from "@/lib/google-sheets";
import { User } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { hash } from "bcryptjs";

export async function getUsers() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Users");
    return rows.slice(1).map((row) => ({
        id: row[0],
        username: row[1],
        password_hash: "", // Don't expose hash
        role: row[3] as "superuser" | "user",
        full_name: row[4],
        active: row[5] === "TRUE",
        created_at: row[6],
        last_login: row[7],
    }));
}

export async function createUser(data: { username: string; password: string; role: string; full_name: string }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const newId = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = await hash(data.password, 10);

    await appendRow("Users", [
        newId,
        data.username,
        passwordHash,
        data.role,
        data.full_name,
        "TRUE",
        now,
        "",
    ]);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "CREATE",
        "USER",
        newId,
        `Created user ${data.username}`,
        now,
    ]);

    revalidatePath("/config/users");
    return { success: true };
}

export async function updateUser(id: string, data: { username: string; role: string; full_name: string; password?: string }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Users");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("User not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[1] = data.username;
    newRow[3] = data.role;
    newRow[4] = data.full_name;

    if (data.password) {
        newRow[2] = await hash(data.password, 10);
    }

    await updateRow("Users", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "USER",
        id,
        `Updated user ${data.username}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/users");
    return { success: true };
}

export async function toggleUserActive(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const rows = await readSheet("Users");
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error("User not found");

    const currentRow = rows[rowIndex];
    const newRow = [...currentRow];
    newRow[5] = active ? "TRUE" : "FALSE";

    await updateRow("Users", rowIndex, newRow);

    await appendRow("Audit Logs", [
        uuidv4(),
        (session.user as any).id,
        "UPDATE",
        "USER",
        id,
        `Set active to ${active}`,
        new Date().toISOString(),
    ]);

    revalidatePath("/config/users");
    return { success: true };
}
