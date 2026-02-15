import { getSales } from "@/actions/sales";
import { getTicketTypes } from "@/actions/config";
import { getSellers } from "@/actions/sellers";
import { getTenantSettings } from "@/actions/tenant_settings";
import { SalesTable } from "@/components/sales/sales-table";

export default async function SalesPage() {
    const sales = await getSales();
    const ticketTypes = await getTicketTypes();
    const resellers = await getSellers();
    const tenantSettings = await getTenantSettings();

    return (
        <SalesTable
            sales={sales}
            ticketTypes={ticketTypes}
            resellers={resellers as any[]}
            currency={tenantSettings.currency}
            title="Ventes"
            description="Gérez vos ventes de tickets ici."
        />
    );
}
