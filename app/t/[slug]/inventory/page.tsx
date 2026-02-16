import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInventory } from "@/actions/inventory";
import { getTicketTypes } from "@/actions/config";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Inventaire",
    description: "Gérez votre stock de tickets",
};

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const inventory = await getInventory();
    const ticketTypes = await getTicketTypes();
    const role = (session.user as any).role;

    if (role !== "owner" && role !== "manager") {
        redirect(`/t/${(session.user as any).tenantSlug}/dashboard`);
    }

    const canManageInventory = true; // If they are here, they can manage it (or at least view it as manager)

    return (
        <InventoryTable
            inventory={inventory}
            ticketTypes={ticketTypes}
            canManage={canManageInventory}
            title="Inventaire des Tickets"
            description={canManageInventory ? "Gérez le stock de tickets disponibles" : "Consultez le stock de tickets disponibles"}
        />
    );
}
