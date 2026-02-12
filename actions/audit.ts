"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { AuditLog, User } from "@/lib/models";
import { AuditLog as AuditLogType } from "@/lib/types";

export async function getAuditLogs() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    // Fetch logs and Populate user info manually or via populate if we set up refs
    // For now, let's fetch users to map names, or trust the log if we stored it?
    // The previous implementation fetched all users to map IDs to names.
    // Our AuditLog model stores user_id.

    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).lean();
    const users = await User.find({}).lean();

    const userMap = new Map<string, string>();
    users.forEach((u: any) => {
        userMap.set(u.id, u.username);
    });

    return logs.map((doc: any) => ({
        id: doc.id,
        user_id: doc.user_id,
        username: userMap.get(doc.user_id) || "Unknown User",
        action: doc.action,
        entity_type: doc.entity_type,
        entity_id: doc.entity_id,
        details: doc.details,
        timestamp: doc.timestamp,
    })) as any[];
}
