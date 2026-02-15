import { getDashboardStats, getSales } from "@/actions/sales";
import { getRecentActivity } from "@/actions/audit";
import { getTenantSettings } from "@/actions/tenant_settings";
import { getTicketTypes } from "@/actions/config";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ActivityCard } from "@/components/dashboard/activity-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role as "manager" | "seller";

    // For sellers, we only want THEIR stats. For managers, all stats.
    const stats = await getDashboardStats(role === "seller" ? userId : undefined);
    const activities = await getRecentActivity(6);
    const tenantSettings = await getTenantSettings();
    const sales = await getSales();
    const ticketTypes = await getTicketTypes();

    const isSeller = role === "seller";

    return (
        <div className="max-w-full overflow-x-hidden">
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold tracking-tight">Tableau de Bord</h2>
                    <p className="text-muted-foreground">
                        Bienvenue dans votre espace {tenantSettings.name}, <span className="font-semibold text-foreground">{session?.user?.name}</span>
                    </p>
                </div>

                <StatsCards
                    totalSales={stats.totalSales}
                    paidRevenue={stats.paidRevenue}
                    unpaidRevenue={stats.unpaidRevenue}
                    submittedPayments={stats.submittedPayments}
                    currency={tenantSettings.currency}
                />

                <div className={`grid gap-8 ${isSeller ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-7"}`}>
                    {!isSeller && <ActivityCard activities={activities} />}

                    <div className={`${isSeller ? "w-full" : "lg:col-span-4"}`}>
                        <SalesChart
                            sales={sales}
                            ticketTypes={ticketTypes}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
