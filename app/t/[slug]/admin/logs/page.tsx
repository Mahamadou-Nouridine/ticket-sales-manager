import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/actions/audit";
import { AuditLogsTable } from "@/components/admin/audit-logs-table";

export default async function AuditLogsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const isOwner = role === "owner";
    const isManager = role === "manager";
    const canManageResults = isOwner || isManager;

    if (!session || !canManageResults) {
        redirect("/dashboard");
    }

    const logs = await getAuditLogs();

    return (
        <AuditLogsTable
            logs={logs}
            title="Logs d'Activité"
            description="Historique de toutes les actions effectuées dans le système"
        />
    );
}
