import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface StatsCardsProps {
    totalSales: number;
    paidRevenue: number;
    unpaidRevenue: number;
    submittedPayments: number;
    currency?: string;
}

export function StatsCards({
    totalSales,
    paidRevenue,
    unpaidRevenue,
    submittedPayments,
    currency = 'FCFA'
}: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Commandes Totales</CardTitle>
                    <Ticket className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalSales}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Tickets vendus au total
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recettes Validées</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-green-600">{formatCurrency(paidRevenue, currency)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Montant encaissé et vérifié
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reste à Encaisser</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{formatCurrency(unpaidRevenue, currency)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Dû par les vendeurs
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vérifications</CardTitle>
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{submittedPayments}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Paiements en attente de revue
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
