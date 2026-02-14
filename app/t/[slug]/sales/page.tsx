import { getSales } from "@/actions/sales";
import { getTicketTypes, getSalesmen } from "@/actions/config";
import { SalesTable } from "@/components/sales/sales-table";

export default async function SalesPage() {
    const sales = await getSales();
    const ticketTypes = await getTicketTypes();
    const salesmen = await getSalesmen();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Ventes</h2>
                <p className="text-muted-foreground">
                    Gérez vos ventes de tickets ici.
                </p>
            </div>
            <SalesTable sales={sales} ticketTypes={ticketTypes} salesmen={salesmen} />
        </div>
    );
}
