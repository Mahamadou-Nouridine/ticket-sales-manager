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

    const rows = await readSheet("Audit Logs");
    // Column structure: id | user_id | action | entity_type | entity_id | details | timestamp
    return rows.slice(1).map((row) => ({
        id: row[0],
        user_id: row[1],
        action: row[2],
        entity_type: row[3],
        entity_id: row[4],
        details: row[5],
        timestamp: row[6],
    })) as AuditLog[];
}
