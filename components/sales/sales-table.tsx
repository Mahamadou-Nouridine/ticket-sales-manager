"use client";

import { useState, useEffect } from "react";
import { Sale, TicketType, User as UserType } from "@/lib/types";
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
import { deleteSale } from "@/actions/sales";
import { getPaymentForSale } from "@/actions/payments";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SaleForm } from "./sale-form";
import { PaymentModal } from "./payment-modal";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Edit, Trash2, Plus, CheckCircle, XCircle, Clock, Loader2, DollarSign, FileText, AlertCircle, MoreHorizontal } from "lucide-react";


interface SalesTableProps {
    sales: Sale[];
    ticketTypes: TicketType[];
    resellers: UserType[];
    currency?: string;
    title?: string;
    description?: string;
}

export function SalesTable({ sales, ticketTypes, resellers, currency = 'FCFA', title, description }: SalesTableProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role as "manager" | "seller";
    const canDelete = userRole === "manager";

    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
    const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({});

    const filteredSales = sales.filter(
        (sale) =>
            (sale as any).seller_name.toLowerCase().includes(filter.toLowerCase()) ||
            sale.ticket_type_name.toLowerCase().includes(filter.toLowerCase())
    );

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    async function handleDelete(id: string) {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
            setLoadingActions({ ...loadingActions, [`delete-${id}`]: true });
            try {
                await deleteSale(id);
                router.refresh();
            } finally {
                setLoadingActions({ ...loadingActions, [`delete-${id}`]: false });
            }
        }
    }

    async function handleOpenPaymentModal(sale: Sale) {
        setLoadingPayments({ ...loadingPayments, [sale.id]: true });
        try {
            const payment = await getPaymentForSale(sale.id);
            setPaymentData(payment);
            setPaymentModalSale(sale);
        } catch (error) {
            console.error("Error loading payment:", error);
        } finally {
            setLoadingPayments({ ...loadingPayments, [sale.id]: false });
        }
    }

    function getStatusBadge(status: string) {
        const tooltip = userRole === "manager"
            ? {
                approved: "Paiement validé. La commande est clôturée.",
                pending: "Soumission en attente de votre revue.",
                rejected: "Paiement rejeté. Le vendeur doit corriger.",
                not_submitted: "Le vendeur n'a pas encore soumis de justificatif."
            }
            : {
                approved: "Paiement approuvé par le manager.",
                pending: "Reçu envoyé. En attente de validation.",
                rejected: "Paiement rejeté. Veuillez vérifier le motif et corriger.",
                not_submitted: "Veuillez soumettre votre reçu de paiement."
            };

        switch (status) {
            case "approved":
                return (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 cursor-pointer" title={(tooltip as any).approved}>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approuvé
                    </Badge>
                );
            case "pending":
                return (
                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 cursor-pointer" title={(tooltip as any).pending}>
                        <Clock className="mr-1 h-3 w-3" />
                        En attente
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 cursor-pointer" title={(tooltip as any).rejected}>
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejeté
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-muted-foreground border-dashed cursor-pointer" title={(tooltip as any).not_submitted}>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Non soumis
                    </Badge>
                );
        }
    }

    return (
        <div className="max-w-full overflow-x-hidden">
            <div className="space-y-4">
                <div>
                    <div>
                        {title && <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>}
                        {description && <p className="text-sm md:text-base text-muted-foreground">{description}</p>}
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="w-full sm:max-w-sm">
                            <Input
                                placeholder="Rechercher par vendeur ou type..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                            <PaginationControl
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={(value) => {
                                    setItemsPerPage(value);
                                    setCurrentPage(1);
                                }}
                            />
                            {userRole === "manager" && (
                                <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
                                    <Button onClick={() => setIsNewSaleOpen(true)} className="whitespace-nowrap">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nouvelle Commande
                                    </Button>
                                    <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>Nouvelle Commande</DialogTitle>
                                        </DialogHeader>
                                        <SaleForm
                                            ticketTypes={ticketTypes}
                                            resellers={resellers}
                                            onSuccess={() => {
                                                setIsNewSaleOpen(false);
                                                router.refresh();
                                            }}
                                        />
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop Title Space (already handled above but keeping structure clean) */}
                <div className="hidden md:block">
                </div>

                <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Modifier la Commande</DialogTitle>
                        </DialogHeader>
                        {editingSale && (
                            <SaleForm
                                ticketTypes={ticketTypes}
                                resellers={resellers}
                                initialData={editingSale}
                                onSuccess={() => {
                                    setEditingSale(null);
                                    router.refresh();
                                }}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {paymentModalSale && (
                    <PaymentModal
                        open={!!paymentModalSale}
                        onOpenChange={(open) => {
                            if (!open) {
                                setPaymentModalSale(null);
                                setPaymentData(null);
                            }
                        }}
                        sale={paymentModalSale}
                        payment={paymentData}
                        userRole={userRole}
                        onSuccess={() => {
                            router.refresh();
                        }}
                    />
                )}

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="sticky md:top-0 z-10 bg-background shadow-sm">
                                <TableRow>
                                    <TableHead>Vendeur</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantité</TableHead>
                                    <TableHead>Date Prise</TableHead>
                                    <TableHead>Statut Paiement</TableHead>
                                    {userRole === "manager" && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            Aucune commande trouvée.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSales.map((sale) => {
                                        // We'll need to fetch payment status for each sale
                                        // For now, we'll use a simple approach
                                        return (
                                            <TableRow key={sale.id}>
                                                <TableCell className="whitespace-nowrap">{(sale as any).seller_name}</TableCell>
                                                <TableCell className="whitespace-nowrap">{sale.ticket_type_name}</TableCell>
                                                <TableCell>{sale.quantity}</TableCell>
                                                <TableCell className="whitespace-nowrap">{sale.date_de_prise}</TableCell>
                                                <TableCell>
                                                    <div
                                                        onClick={() => handleOpenPaymentModal(sale)}
                                                        className="inline-block"
                                                    >
                                                        {loadingPayments[sale.id] ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : getStatusBadge((sale as any).payment_status)}
                                                    </div>
                                                </TableCell>
                                                {userRole === "manager" && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end space-x-1 sm:space-x-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingSale(sale)}
                                                                className="h-8 w-8"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            {canDelete && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(sale.id)}
                                                                    disabled={loadingActions[`delete-${sale.id}`]}
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                                )}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                        Affichage de {paginatedSales.length} sur {filteredSales.length} commande(s)
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
        </div>
    );
}
