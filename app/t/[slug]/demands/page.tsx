import { requireTenantAccess } from "@/lib/tenant";
import { getDemands } from "@/actions/demands";
import { getTicketTypes } from "@/actions/config";
import { getSellers } from "@/actions/users";
import { DemandsTable } from "@/components/demands/demands-table";

export default async function DemandsPage() {
    const { tenantId, user, role } = await requireTenantAccess();

    // Fetch demands, ticket types, and sellers
    const [demands, ticketTypes, sellers] = await Promise.all([
        getDemands(),
        getTicketTypes(),
        getSellers() // We might need this for managers creating demands for sellers
    ]);

    const activeTicketTypes = ticketTypes.filter((t: any) => t.active);

    return (
        <div className="space-y-6">
            <DemandsTable
                demands={demands}
                ticketTypes={activeTicketTypes}
                sellers={sellers}
            />
        </div>
    );
}
