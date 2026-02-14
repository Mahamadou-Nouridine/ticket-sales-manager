import { getSales } from "@/actions/sales";
import { getTicketTypes, getSalesmen } from "@/actions/config";
import { getInventory } from "@/actions/inventory";
import { ReportsView } from "@/components/reports/reports-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
    const session = await getServerSession(authOptions);

    const role = (session?.user as any)?.role;
    const canViewReports = role === "owner" || role === "manager";

    if (!canViewReports) {
        redirect("/dashboard");
    }

    const sales = await getSales();
    const ticketTypes = await getTicketTypes();
    const salesmen = await getSalesmen();
    const inventory = await getInventory();

    return (
        <div className="flex flex-col gap-6 h-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Rapports</h2>
                <p className="text-muted-foreground">
                    Analyse des ventes, performances et inventaire avec filtres personnalisables.
                </p>
            </div>
            <ReportsView sales={sales} ticketTypes={ticketTypes} salesmen={salesmen} inventory={inventory} />
        </div>
    );
}
