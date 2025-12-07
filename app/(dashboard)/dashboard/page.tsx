import { getSales } from "@/actions/sales";
import { getTicketTypes } from "@/actions/config";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const sales = await getSales();
    const ticketTypes = await getTicketTypes();

    // Calculate stats
    const totalSales = sales.reduce((acc, sale) => acc + sale.quantity, 0);

    const pendingPayments = sales.filter((sale) => !sale.verse).length;

    // Calculate revenue
    // We need to map ticket type name to price.
    const priceMap = new Map(ticketTypes.map((t) => [t.name, t.price]));

    const totalRevenue = sales.reduce((acc, sale) => {
        const price = priceMap.get(sale.ticket_type_name) || 0;
        return acc + (sale.quantity * price);
    }, 0);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Tableau de Bord</h2>
                <p className="text-muted-foreground">
                    Bienvenue, {session?.user?.name || "Utilisateur"}
                </p>
            </div>

            <StatsCards
                totalSales={totalSales}
                totalRevenue={totalRevenue}
                pendingPayments={pendingPayments}
            />

            {/* Add Recent Sales or Charts here */}
        </div>
    );
}
