import { getSales } from "@/actions/sales";
import { getTicketTypes } from "@/actions/config";
import { ReportsView } from "@/components/reports/reports-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
    const session = await getServerSession(authOptions);

    if ((session?.user as any)?.role !== "superuser") {
        redirect("/dashboard");
    }

    const sales = await getSales();
    const ticketTypes = await getTicketTypes();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Rapports</h2>
                <p className="text-muted-foreground">
                    Analyse des ventes et performances.
                </p>
            </div>
            <ReportsView sales={sales} ticketTypes={ticketTypes} />
        </div>
    );
}
