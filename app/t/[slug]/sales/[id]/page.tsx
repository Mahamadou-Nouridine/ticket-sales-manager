import { getSale } from "@/actions/sales";
import { getTicketTypes, getSalesmen } from "@/actions/config";
import { SaleForm } from "@/components/sales/sale-form";
import { notFound } from "next/navigation";

interface EditSalePageProps {
    params: {
        id: string;
    };
}

export default async function EditSalePage({ params }: EditSalePageProps) {
    const sale = await getSale(params.id);
    const ticketTypes = await getTicketTypes();
    const salesmen = await getSalesmen();

    if (!sale) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Modifier la Vente</h2>
                <p className="text-muted-foreground">
                    Modifier les détails de la vente.
                </p>
            </div>
            <SaleForm
                ticketTypes={ticketTypes}
                salesmen={salesmen}
                initialData={sale}
            />
        </div>
    );
}
