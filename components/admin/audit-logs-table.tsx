"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AuditLogsTableProps {
    logs: AuditLog[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const filteredLogs = logs.filter(
        (log) =>
            log.action.toLowerCase().includes(filter.toLowerCase()) ||
            log.entity_type.toLowerCase().includes(filter.toLowerCase()) ||
            log.details.toLowerCase().includes(filter.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Input
                    placeholder="Rechercher dans les logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
                <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                    }}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Horodatage</TableHead>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Détails</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        Aucun log trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {log.username || log.user_id}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.action === "CREATE"
                                                    ? "bg-green-100 text-green-800"
                                                    : log.action === "UPDATE"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {log.action}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{log.entity_type}</TableCell>
                                        <TableCell>{log.details}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                    Affichage de {paginatedLogs.length} sur {filteredLogs.length} log(s)
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Précédent
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} sur {totalPages || 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        Suivant
                    </Button>
                </div>
            </div>
        </div>
    );
}
