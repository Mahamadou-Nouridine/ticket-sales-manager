"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenantAccess } from "@/lib/tenant";
import connectToDatabase from "@/lib/db";
import { AuditLog, User } from "@/lib/models";
import { AuditLog as AuditLogType } from "@/lib/types";

export async function getAuditLogs() {
    const { tenantId, role } = await requireTenantAccess();
    if (role !== "manager") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const logs = await AuditLog.find({ tenantId }).sort({ timestamp: -1 }).lean();

    // Get all users for this tenant to map names
    // We could use populate('user_id') if we set up a virtual, but user_id in AuditLog references User.id (Global UUID)
    // Let's just fetch all users that are members of this tenant to map names
    // Or just fetch all global users since we have the ID. 
    // Fetching all users is fine for now as we don't expect millions.
    // Better: Fetch users who are members of this tenant.

    // Actually, AuditLog.user_id is the acting user.
    const users = await User.find({}).lean();
    const userMap = new Map<string, string>();
    users.forEach((u: any) => {
        userMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email);
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
    }));
}

export async function getRecentActivity(limit = 10, userId?: string) {
    const { tenantId } = await requireTenantAccess();

    await connectToDatabase();

    const query: any = { tenantId };
    if (userId) {
        query.user_id = userId;
    }

    const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

    const users = await User.find({}).lean();
    const userMap = new Map<string, string>();
    users.forEach((u: any) => {
        userMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email);
    });

    return logs.map((doc: any) => ({
        id: doc.id,
        user_id: doc.user_id,
        username: userMap.get(doc.user_id) || "Utilisateur Inconnu",
        action: doc.action,
        entity_type: doc.entity_type,
        entity_id: doc.entity_id,
        details: doc.details,
        timestamp: doc.timestamp,
    }));
}
