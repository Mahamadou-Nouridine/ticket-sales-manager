"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { TicketType, Salesman, AuditLog } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function getTicketTypes() {
    await connectToDatabase();
    const result = await TicketType.find({}).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString(),
        price: Number(doc.price) // Ensure number
    }));
}

export async function getSalesmen() {
    await connectToDatabase();
    const result = await Salesman.find({}).lean();
    return result.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString()
    }));
}

export async function createTicketType(data: { name: string; price: number }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();
    const newId = uuidv4();
    const now = new Date().toISOString();

    await TicketType.create({
        id: newId,
        name: data.name,
        price: data.price,
        active: true,
        created_at: now,
    });

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "CREATE",
        entity_type: "TICKET_TYPE",
        entity_id: newId,
        details: `Created ticket type ${data.name}`,
        timestamp: now,
    });

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function createSalesman(data: { name: string }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();
    const newId = uuidv4();
    const now = new Date().toISOString();

    await Salesman.create({
        id: newId,
        name: data.name,
        active: true,
        created_at: now,
    });

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "CREATE",
        entity_type: "SALESMAN",
        entity_id: newId,
        details: `Created salesman ${data.name}`,
        timestamp: now,
    });

    revalidatePath("/config/salesmen");
    return { success: true };
}

export async function toggleTicketType(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();

    // We update by our custom 'id' field, not _id
    const result = await TicketType.findOneAndUpdate({ id }, { active }, { new: true });

    if (!result) throw new Error("Not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "TICKET_TYPE",
        entity_id: id,
        details: `Set active to ${active}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function toggleSalesman(id: string, active: boolean) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();

    const result = await Salesman.findOneAndUpdate({ id }, { active }, { new: true });

    if (!result) throw new Error("Not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "SALESMAN",
        entity_id: id,
        details: `Set active to ${active}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/salesmen");
    return { success: true };
}

export async function updateTicketType(id: string, data: { name: string; price: number }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

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

    revalidatePath("/config/ticket-types");
    return { success: true };
}

export async function updateSalesman(id: string, data: { name: string }) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await connectToDatabase();

    const result = await Salesman.findOneAndUpdate(
        { id },
        { name: data.name },
        { new: true }
    );

    if (!result) throw new Error("Not found");

    await AuditLog.create({
        id: uuidv4(),
        user_id: (session.user as any).id,
        action: "UPDATE",
        entity_type: "SALESMAN",
        entity_id: id,
        details: `Updated salesman ${data.name}`,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/config/salesmen");
    return { success: true };
}
