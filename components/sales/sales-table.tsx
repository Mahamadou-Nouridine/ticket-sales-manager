"use client";

import { useState } from "react";
import { Sale, TicketType, Salesman } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { deleteSale, toggleSalePayment } from "@/actions/sales";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Plus, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SaleForm } from "./sale-form";
import { PaymentDialog } from "./payment-dialog";
import { PaginationControl } from "@/components/ui/pagination-control";

interface SalesTableProps {
    sales: Sale[];
    ticketTypes: TicketType[];
    salesmen: Salesman[];
}

export function SalesTable({ sales, ticketTypes, salesmen }: SalesTableProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const canDelete = (session?.user as any)?.role === "owner";

    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [paymentSaleId, setPaymentSaleId] = useState<string | null>(null);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

    const filteredSales = sales.filter(
        (sale) =>
            sale.salesman_name.toLowerCase().includes(filter.toLowerCase()) ||
            sale.ticket_type_name.toLowerCase().includes(filter.toLowerCase())
    );

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    async function handleDelete(id: string) {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) {
            setLoadingActions({ ...loadingActions, [`delete-${id}`]: true });
            try {
                await deleteSale(id);
                router.refresh();
            } finally {
                setLoadingActions({ ...loadingActions, [`delete-${id}`]: false });
            }
        }
    }

    async function handleTogglePayment(id: string, verse: boolean) {
        if (verse) {
            // Open payment dialog
            setPaymentSaleId(id);
        } else {
            // Unmark as paid
            setLoadingActions({ ...loadingActions, [`payment-${id}`]: true });
            try {
                await toggleSalePayment(id, false);
                router.refresh();
            } finally {
                setLoadingActions({ ...loadingActions, [`payment-${id}`]: false });
            }
        }
    }

    async function handlePaymentConfirm(invoiceNumber: string, paymentDate: string) {
        if (!paymentSaleId) return;
        setLoadingActions({ ...loadingActions, [`payment-${paymentSaleId}`]: true });
        try {
            await toggleSalePayment(paymentSaleId, true, invoiceNumber, paymentDate);
            router.refresh();
        } finally {
            setLoadingActions({ ...loadingActions, [`payment-${paymentSaleId}`]: false });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Input
                    placeholder="Rechercher par vendeur ou type..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
                <div className="flex items-center gap-2">
                    <PaginationControl
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(value) => {
                            setItemsPerPage(value);
                            setCurrentPage(1);
                        }}
                    />
                    <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nouvelle Vente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Nouvelle Vente</DialogTitle>
                            </DialogHeader>
                            <SaleForm
                                ticketTypes={ticketTypes}
                                salesmen={salesmen}
                                onSuccess={() => {
                                    setIsNewSaleOpen(false);
                                    router.refresh();
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Modifier la Vente</DialogTitle>
                    </DialogHeader>
                    {editingSale && (
                        <SaleForm
                            ticketTypes={ticketTypes}
                            salesmen={salesmen}
                            initialData={editingSale}
                            onSuccess={() => {
                                setEditingSale(null);
                                router.refresh();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <PaymentDialog
                open={!!paymentSaleId}
                onOpenChange={(open) => !open && setPaymentSaleId(null)}
                onConfirm={handlePaymentConfirm}
            />

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendeur</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quantité</TableHead>
                                <TableHead>Date Prise</TableHead>
                                <TableHead>Versé</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        Aucune vente trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="whitespace-nowrap">{sale.salesman_name}</TableCell>
                                        <TableCell className="whitespace-nowrap">{sale.ticket_type_name}</TableCell>
                                        <TableCell>{sale.quantity}</TableCell>
                                        <TableCell className="whitespace-nowrap">{sale.date_de_prise}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={sale.verse ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                                                onClick={() => handleTogglePayment(sale.id, !sale.verse)}
                                                disabled={loadingActions[`payment-${sale.id}`]}
                                                title={sale.verse ? "Marquer comme non versé" : "Marquer comme versé"}
                                            >
                                                {loadingActions[`payment-${sale.id}`] ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : sale.verse ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <CheckCircle className="h-4 w-4" /> Oui
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1">
                                                        <XCircle className="h-4 w-4" /> Non
                                                    </span>
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingSale(sale)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(sale.id)}
                                                        disabled={loadingActions[`delete-${sale.id}`]}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        {loadingActions[`delete-${sale.id}`] ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                    Affichage de {paginatedSales.length} sur {filteredSales.length} vente(s)
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
