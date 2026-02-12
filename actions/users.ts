"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User, AuditLog } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { hash } from "bcryptjs";

export async function getUsers() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const result = await User.find({}).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString(),
        password_hash: "" // Hide hash
    }));
}

export async function createUser(data: { username: string; password: string; role: string; full_name: string }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const newId = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = await hash(data.password, 10);

    await User.create({
        id: newId,
        username: data.username,
        password_hash: passwordHash,
        role: data.role,
        full_name: data.full_name,
        active: true,
        created_at: now,
        last_login: "",
    });

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "CREATE",
        entity_type: "USER",
        entity_id: newId,
        details: `Created user ${data.username}`,
        timestamp: now,
    });

    revalidatePath("/config/users");
    return { success: true };
}

export async function updateUser(id: string, data: { username: string; role: string; full_name: string; password?: string }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const updateData: any = {
        username: data.username,
        role: data.role,
        full_name: data.full_name,
    };

    if (data.password) {
        updateData.password_hash = await hash(data.password, 10);
    }

    const result = await User.findOneAndUpdate(
        { id },
        updateData,
        { new: true }
    );

    if (!result) throw new Error("User not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "USER",
        entity_id: id,
        details: `Updated user ${data.username}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/users");
    return { success: true };
}

export async function toggleUserActive(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "superuser") {
        throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const result = await User.findOneAndUpdate(
        { id },
        { active },
        { new: true }
    );

    if (!result) throw new Error("User not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "USER",
        entity_id: id,
        details: `Set active to ${active}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/users");
    return { success: true };
}
