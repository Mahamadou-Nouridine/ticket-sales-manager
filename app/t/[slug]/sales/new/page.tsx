import { getTicketTypes } from "@/actions/config";
import { getSellers } from "@/actions/sellers";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
    const ticketTypes = await getTicketTypes();
    const sellers = await getSellers();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Nouvelle Vente</h2>
                <p className="text-muted-foreground">
                    Enregistrer une nouvelle vente de tickets.
                </p>
            </div>
            <SaleForm ticketTypes={ticketTypes} resellers={sellers as any[]} />
        </div>
    );
}
