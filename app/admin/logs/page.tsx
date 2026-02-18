"use client";

import React, { useState, useEffect } from "react";
import { getGlobalLogs } from "@/actions/admin";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Shield, User, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        try {
            const data = await getGlobalLogs();
            setLogs(data);
        } catch (error) {
            console.error("Erreur logs:", error);
        } finally {
            setLoading(false);
        }
    }

    const getIcon = (action: string) => {
        if (action.includes("TENANT")) return <Building2 className="w-3 h-3" />;
        if (action.includes("USER")) return <User className="w-3 h-3" />;
        return <Shield className="w-3 h-3" />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Logs d'activité</h1>
                <p className="text-muted-foreground">Historique des actions administratives globales.</p>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Horodatage</TableHead>
                            <TableHead>Administrateur</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entité</TableHead>
                            <TableHead>Détails</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Chargement...</TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Aucun log trouvé.</TableCell>
                            </TableRow>
                        ) : logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell className="font-medium text-sm">{log.username}</TableCell>
                                <TableCell>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase w-fit">
                                        {getIcon(log.action)}
                                        {log.action}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">{log.entity_type}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{log.entity_id}</div>
                                </TableCell>
                                <TableCell className="text-sm">{log.details}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
