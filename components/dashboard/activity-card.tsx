import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, User, CreditCard, Ticket, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityItem {
    id: string;
    username: string;
    action: string;
    entity_type: string;
    details: string;
    timestamp: string;
}

interface ActivityCardProps {
    activities: ActivityItem[];
}

export function ActivityCard({ activities }: ActivityCardProps) {
    const getIcon = (type: string, action: string) => {
        if (action === "APPROVE") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (action === "REJECT") return <XCircle className="h-4 w-4 text-red-500" />;
        if (type === "PAYMENT") return <CreditCard className="h-4 w-4 text-blue-500" />;
        if (type === "SALE") return <Ticket className="h-4 w-4 text-purple-500" />;
        return <Activity className="h-4 w-4 text-gray-400" />;
    };

    const getActionLabel = (action: string, type: string, details: string) => {
        if (action === "CREATE" && type === "SALE") {
            const match = details.match(/Created sale of (\d+)/);
            const count = match ? match[1] : "";
            return `a enregistré une commande ${count ? `de ${count} tickets` : ""}`;
        }
        if (action === "CREATE" && type === "PAYMENT") return "a transmis un nouveau versement";
        if (action === "APPROVE") return "a validé votre versement";
        if (action === "REJECT") return "a refusé votre versement";
        if (action === "UPDATE" && details.includes("marked as paid")) return "a marqué une commande comme payée";
        if (action === "DELETE" && type === "PAYMENT") return "a annulé une transmission";
        return action.toLowerCase();
    };

    return (
        <Card className="col-span-1 lg:col-span-3 border-none shadow-md bg-white/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Flux d'Activité
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mb-4 opacity-10" />
                            <p className="text-sm font-medium">Aucun mouvement récent</p>
                        </div>
                    ) : (
                        activities.map((item) => (
                            <div key={item.id} className="flex items-start group">
                                <div className="mt-1 mr-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                    {getIcon(item.entity_type, item.action)}
                                </div>
                                <div className="flex-1 space-y-0.5">
                                    <p className="text-sm">
                                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {item.username}
                                        </span>{" "}
                                        <span className="text-gray-500">{getActionLabel(item.action, item.entity_type, item.details)}</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter opacity-80">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
