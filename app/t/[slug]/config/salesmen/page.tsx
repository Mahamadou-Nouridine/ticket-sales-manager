import { getSalesmen } from "@/actions/config";
import { SalesmenList } from "@/components/config/salesmen-list";

export default async function SalesmenPage() {
    const salesmen = await getSalesmen();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Vendeurs</h2>
                <p className="text-muted-foreground">
                    Gérez les vendeurs.
                </p>
            </div>
            <SalesmenList salesmen={salesmen} />
        </div>
    );
}
