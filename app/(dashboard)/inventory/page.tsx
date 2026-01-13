import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInventory } from "@/actions/inventory";
import { getTicketTypes } from "@/actions/config";
import { InventoryTable } from "@/components/inventory/inventory-table";

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const inventory = await getInventory();
    const ticketTypes = await getTicketTypes();
    const isSuperuser = (session.user as any).role === "superuser";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Inventaire des Tickets</h1>
                <p className="text-muted-foreground">
                    {isSuperuser
                        ? "Gérez le stock de tickets disponibles"
                        : "Consultez le stock de tickets disponibles"}
                </p>
            </div>
            <InventoryTable inventory={inventory} ticketTypes={ticketTypes} isSuperuser={isSuperuser} />
        </div>
    );
}
