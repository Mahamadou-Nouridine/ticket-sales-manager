import { getTicketTypes } from "@/actions/config";
import { TicketTypesList } from "@/components/config/ticket-types-list";

export default async function TicketTypesPage() {
    const ticketTypes = await getTicketTypes();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Types de Tickets</h2>
                <p className="text-muted-foreground">
                    Gérez les types de tickets disponibles.
                </p>
            </div>
            <TicketTypesList ticketTypes={ticketTypes} />
        </div>
    );
}
