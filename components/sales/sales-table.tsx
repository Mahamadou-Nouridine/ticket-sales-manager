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
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
import { Edit, Trash2, Plus, CheckCircle, XCircle, Clock, Loader2, DollarSign, FileText, AlertCircle, MoreHorizontal, Eye } from "lucide-react";


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
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);
    const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
    const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({});

    const searchParams = useSearchParams();
    const viewId = searchParams.get('view');

    // Auto-open modal if view query param is present
    useEffect(() => {
        if (viewId) {
            const saleToView = sales.find(s => s.id === viewId);
            if (saleToView && !viewingSale) {
                setViewingSale(saleToView);
            }
        }
    }, [viewId, sales]);

    const trimmedFilter = filter.trim();
    const q = trimmedFilter.toLowerCase();

    // For each sale, figure out *which* field(s) matched the search query so we can show it to the user.
    function getMatchCriteria(sale: Sale): string[] {
        if (!q) return [];
        const receiptId = sale.invoice_number || (sale as any).payment_details?.receipt_id || "";
        const matches: string[] = [];
        if ((sale as any).seller_name.toLowerCase().includes(q)) matches.push("Vendeur");
        if (sale.ticket_type_name.toLowerCase().includes(q)) matches.push("Type");
        if (receiptId.toLowerCase().includes(q)) matches.push("N° de Reçu");
        return matches;
    }

    const filteredSales = q
        ? sales.filter((sale) => getMatchCriteria(sale).length > 0)
        : sales;

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
                                placeholder="Rechercher par vendeur, type ou n° de reçu..."
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

                <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Détails de la Commande</DialogTitle>
                        </DialogHeader>
                        {viewingSale && (
                            <div className="space-y-4 pt-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground">ID Commande</p>
                                        <p className="font-medium font-mono text-xs">{viewingSale.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date de prise</p>
                                        <p className="font-medium">{viewingSale.date_de_prise}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Vendeur</p>
                                        <p className="font-medium">{(viewingSale as any).seller_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Statut Paiement</p>
                                        <div className="mt-1">
                                            {getStatusBadge((viewingSale as any).payment_status)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Type de Ticket</p>
                                        <p className="font-medium">{viewingSale.ticket_type_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Quantité</p>
                                        <p className="font-medium">{viewingSale.quantity}</p>
                                    </div>
                                    {(viewingSale.invoice_number || (viewingSale as any).payment_details?.receipt_id) && (
                                        <div>
                                            <p className="text-muted-foreground">N° de Reçu</p>
                                            <p className="font-medium font-mono">{viewingSale.invoice_number || (viewingSale as any).payment_details?.receipt_id}</p>
                                        </div>
                                    )}
                                </div>
                                
                                {viewingSale.demand_id && (
                                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex justify-between items-center mt-4">
                                        <div>
                                            <p className="text-blue-800 font-medium mb-1">Issue d'une demande</p>
                                            <p className="text-blue-700 text-xs">Cette commande a été générée automatiquement à partir d'une demande approuvée.</p>
                                        </div>
                                        <Link href={`./demands?view=${viewingSale.demand_id}`}>
                                            <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 text-blue-700 border-blue-200">
                                                Voir la Demande
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
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
                                    {!!q && <TableHead>Trouvé via</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={q ? 7 : 6} className="text-center">
                                            Aucune commande trouvée.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSales.map((sale) => {
                                        const matchCriteria = getMatchCriteria(sale);
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
                                                {!!q && (
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {matchCriteria.map((c) => (
                                                                <Badge key={c} variant="outline" className="text-xs font-normal text-muted-foreground">
                                                                    {c}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end space-x-1 sm:space-x-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewingSale(sale)}
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            title="Voir les détails"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {userRole === "manager" && (
                                                            <>
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
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
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
