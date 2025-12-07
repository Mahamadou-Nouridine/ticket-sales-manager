import { getTicketTypes, getSalesmen } from "@/actions/config";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
    const ticketTypes = await getTicketTypes();
    const salesmen = await getSalesmen();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Nouvelle Vente</h2>
                <p className="text-muted-foreground">
                    Enregistrer une nouvelle vente de tickets.
                </p>
            </div>
            <SaleForm ticketTypes={ticketTypes} salesmen={salesmen} />
        </div>
    );
}
