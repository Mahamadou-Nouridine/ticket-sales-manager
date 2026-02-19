import React from "react";
import { getGlobalStats } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Receipt, AlertCircle } from "lucide-react";

export default async function AdminDashboardPage() {
    const stats = await getGlobalStats();

    const statCards = [
        { title: "Organisations", value: stats.totalTenants, icon: Building2, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-green-600", bg: "bg-green-100" },
        { title: "Commandes Totales", value: stats.totalSales, icon: Receipt, color: "text-purple-600", bg: "bg-purple-100" },
        { title: "Inscriptions liste d'attente", value: (stats as any).pendingWaitlist, icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord Global</h1>
                <p className="text-muted-foreground">Bienvenue dans l'interface d'administration de Vendora.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <div className={`p-2 rounded-full ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Vue d'ensemble</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Graphique des commandes à venir...
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Activités Récentes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Flux d'activité globale à venir...
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
