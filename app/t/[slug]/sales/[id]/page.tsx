import { getSaleById } from "@/actions/sales";
import { getTicketTypes } from "@/actions/config";
import { getSellers } from "@/actions/sellers";
import { SaleForm } from "@/components/sales/sale-form";
import { notFound } from "next/navigation";

interface EditSalePageProps {
    params: {
        id: string;
    };
}

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const sale = await getSaleById(id);
    const ticketTypes = await getTicketTypes();
    const sellers = await getSellers();

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
                resellers={sellers as any[]}
                initialData={sale}
            />
        </div>
    );
}
