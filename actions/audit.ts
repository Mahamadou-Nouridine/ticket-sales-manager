"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet } from "@/lib/google-sheets";
import { AuditLog } from "@/lib/types";

export async function getAuditLogs() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    const logsRows = await readSheet("Audit Logs");
    const usersRows = await readSheet("Users");

    // Create a map of user_id to username
    const userMap = new Map<string, string>();
    usersRows.slice(1).forEach((row) => {
        userMap.set(row[0], row[1]); // id -> username
    });

    // Column structure: id | user_id | action | entity_type | entity_id | details | timestamp
    return logsRows.slice(1).map((row) => ({
        id: row[0],
        user_id: row[1],
        username: userMap.get(row[1]) || "Unknown User",
        action: row[2],
        entity_type: row[3],
        entity_id: row[4],
        details: row[5],
        timestamp: row[6],
    }));
}
