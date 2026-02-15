import { getSellers } from "@/actions/sellers";
import { SalesmenList } from "@/components/config/salesmen-list";

export default async function SalesmenPage() {
    const salesmen = await getSellers();

    return (
        <SalesmenList
            salesmen={salesmen}
            title="Vendeurs"
            description="Gérez vos vendeurs et leurs accès à l'organisation."
        />
    );
}
