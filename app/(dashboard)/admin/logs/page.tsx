import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/actions/audit";
import { AuditLogsTable } from "@/components/admin/audit-logs-table";

export default async function AuditLogsPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "superuser") {
        redirect("/dashboard");
    }

    const logs = await getAuditLogs();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Logs d'Activité</h1>
                <p className="text-muted-foreground">
                    Historique de toutes les actions effectuées dans le système
                </p>
            </div>
            <AuditLogsTable logs={logs} />
        </div>
    );
}
