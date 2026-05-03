"use client";

import { useEffect, useState } from "react";
import { Demand, TicketType, User as UserType } from "@/lib/types";
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
import { reviewDemand, withdrawDemand } from "@/actions/demands";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DemandForm } from "./demand-form";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, XCircle, Clock, Loader2, AlertCircle, FileText, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DemandsTableProps {
    demands: Demand[];
    ticketTypes: TicketType[];
    sellers: UserType[];
}

export function DemandsTable({ demands, ticketTypes, sellers }: DemandsTableProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role as "manager" | "seller";

    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isNewDemandOpen, setIsNewDemandOpen] = useState(false);

    // For review modal
    const [reviewingDemand, setReviewingDemand] = useState<Demand | null>(null);
    const [viewingDemand, setViewingDemand] = useState<Demand | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

    const searchParams = useSearchParams();
    const viewId = searchParams.get('view');

    // Auto-open modal if view query param is present
    useEffect(() => {
        if (viewId) {
            const demandToView = demands.find(d => d.id === viewId);
            if (demandToView && !viewingDemand) {
                setViewingDemand(demandToView);
            }
        }
    }, [viewId, demands]);

    const filteredDemands = demands.filter(
        (demand) =>
            (demand as any).seller_name.toLowerCase().includes(filter.toLowerCase()) ||
            demand.ticket_type_name.toLowerCase().includes(filter.toLowerCase())
    );

    const totalPages = Math.ceil(filteredDemands.length / itemsPerPage);
    const paginatedDemands = filteredDemands.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    async function handleReview(id: string, status: 'approved' | 'rejected') {
        if (status === 'rejected' && !rejectionReason) {
            toast.error("Veuillez fournir un motif de rejet");
            return;
        }

        const confirmMsg = status === 'approved'
            ? "Approuver cette demande créera automatiquement la commande et déduira le stock. Continuer ?"
            : "Êtes-vous sûr de vouloir rejeter cette demande ?";

        if (confirm(confirmMsg)) {
            setLoadingActions({ ...loadingActions, [id]: true });
            try {
                await reviewDemand(id, status, status === 'rejected' ? rejectionReason : undefined);
                toast.success(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès`);
                setReviewingDemand(null);
                setRejectionReason("");
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Erreur lors de la mise à jour");
            } finally {
                setLoadingActions({ ...loadingActions, [id]: false });
            }
        }
    }

    async function handleWithdraw(id: string) {
        if (confirm("Êtes-vous sûr de vouloir annuler cette demande ?")) {
            setLoadingActions({ ...loadingActions, [id]: true });
            try {
                await withdrawDemand(id);
                toast.success("Demande annulée avec succès");
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Erreur lors de l'annulation");
            } finally {
                setLoadingActions({ ...loadingActions, [id]: false });
            }
        }
    }

    function getStatusBadge(status: string, reason?: string) {
        switch (status) {
            case "approved":
                return (
                    <Badge className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approuvée
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="destructive" title={reason}>
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejetée
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                        <Ban className="mr-1 h-3 w-3" />
                        Annulée
                    </Badge>
                );
            case "pending":
            default:
                return (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                        <Clock className="mr-1 h-3 w-3" />
                        En attente
                    </Badge>
                );
        }
    }

    return (
        <div className="max-w-full overflow-x-hidden">
            <div className="space-y-4">
                <div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Demandes de Tickets</h2>
                        <p className="text-sm md:text-base text-muted-foreground">
                            {userRole === 'manager'
                                ? "Gérez les demandes de tickets des vendeurs."
                                : "Faites vos demandes de tickets et suivez leur statut."}
                        </p>
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

                            <Dialog open={isNewDemandOpen} onOpenChange={setIsNewDemandOpen}>
                                <Button onClick={() => setIsNewDemandOpen(true)} className="whitespace-nowrap bg-fuchsia-600 hover:bg-fuchsia-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle Demande
                                </Button>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>Nouvelle Demande de Tickets</DialogTitle>
                                    </DialogHeader>
                                    <DemandForm
                                        ticketTypes={ticketTypes}
                                        sellers={sellers}
                                        onSuccess={() => {
                                            setIsNewDemandOpen(false);
                                            router.refresh();
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                <Dialog open={!!reviewingDemand} onOpenChange={(open) => {
                    if (!open) {
                        setReviewingDemand(null);
                        setRejectionReason("");
                    }
                }}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Rejeter la demande</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Motif du rejet (obligatoire)</Label>
                                <Textarea
                                    placeholder="Expliquez pourquoi cette demande est rejetée..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setReviewingDemand(null)}>Annuler</Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => reviewingDemand && handleReview(reviewingDemand.id, 'rejected')}
                                    disabled={!rejectionReason.trim() || loadingActions[reviewingDemand?.id || '']}
                                >
                                    {loadingActions[reviewingDemand?.id || ''] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmer le Rejet
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!viewingDemand} onOpenChange={(open) => !open && setViewingDemand(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Détails de la demande</DialogTitle>
                        </DialogHeader>
                        {viewingDemand && (
                            <div className="space-y-4 pt-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground">ID Demande</p>
                                        <p className="font-medium font-mono text-xs">{viewingDemand.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date de création</p>
                                        <p className="font-medium">
                                            {new Date(viewingDemand.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Vendeur</p>
                                        <p className="font-medium">{(viewingDemand as any).seller_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Statut</p>
                                        <div className="font-medium mt-1">
                                            {getStatusBadge(viewingDemand.status, viewingDemand.rejection_reason)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Type de Ticket</p>
                                        <p className="font-medium">{viewingDemand.ticket_type_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Quantité</p>
                                        <p className="font-medium">{viewingDemand.quantity}</p>
                                    </div>
                                </div>

                                {viewingDemand.notes && (
                                    <div className="bg-gray-50 p-3 rounded-md border">
                                        <p className="text-muted-foreground mb-1">Notes / Motif:</p>
                                        <p>{viewingDemand.notes}</p>
                                    </div>
                                )}

                                {viewingDemand.status === 'rejected' && viewingDemand.rejection_reason && (
                                    <div className="bg-red-50 p-3 rounded-md border border-red-100">
                                        <p className="text-red-700 font-medium mb-1">Motif de rejet:</p>
                                        <p className="text-red-600">{viewingDemand.rejection_reason}</p>
                                    </div>
                                )}

                                {viewingDemand.status === 'approved' && viewingDemand.reviewed_at && (
                                    <div className="bg-green-50 p-3 rounded-md border border-green-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-green-800 font-medium mb-1">Approuvée le:</p>
                                            <p className="text-green-700">{new Date(viewingDemand.reviewed_at).toLocaleString('fr-FR')}</p>
                                        </div>
                                        {viewingDemand.created_sale_id && (
                                            <Link href={`./sales?view=${viewingDemand.created_sale_id}`}>
                                                <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 text-green-700 border-green-200">
                                                    Voir la Commande
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="sticky md:top-0 z-10 bg-background shadow-sm">
                                <TableRow>
                                    {userRole === 'manager' && <TableHead>Vendeur</TableHead>}
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantité</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedDemands.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={userRole === 'manager' ? 7 : 6} className="text-center h-32 text-muted-foreground">
                                            <FileText className="mx-auto h-8 w-8 opacity-20 mb-2" />
                                            Aucune demande trouvée.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedDemands.map((demand) => (
                                        <TableRow key={demand.id}>
                                            {userRole === 'manager' && (
                                                <TableCell className="whitespace-nowrap font-medium">
                                                    {(demand as any).seller_name}
                                                </TableCell>
                                            )}
                                            <TableCell className="whitespace-nowrap">{demand.ticket_type_name}</TableCell>
                                            <TableCell className="font-semibold">{demand.quantity}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {new Date(demand.created_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(demand.status, demand.rejection_reason)}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={demand.notes || demand.rejection_reason}>
                                                {demand.status === 'rejected' && demand.rejection_reason ? (
                                                    <span className="text-red-600 font-medium">Motif: {demand.rejection_reason}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">{demand.notes || "-"}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setViewingDemand(demand)}
                                                        className="h-8 w-8 p-0"
                                                        title="Voir les détails"
                                                    >
                                                        <Eye className="h-4 w-4 text-blue-600" />
                                                    </Button>

                                                    {userRole === "manager" && demand.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() => handleReview(demand.id, 'approved')}
                                                                disabled={loadingActions[demand.id]}
                                                                className="bg-green-600 hover:bg-green-700 h-8"
                                                            >
                                                                {loadingActions[demand.id] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                )}
                                                                <span className="hidden sm:inline ml-1">Approuver</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setReviewingDemand(demand)}
                                                                disabled={loadingActions[demand.id]}
                                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                <span className="hidden sm:inline ml-1">Rejeter</span>
                                                            </Button>
                                                        </>
                                                    )}

                                                    {demand.status === 'pending' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleWithdraw(demand.id)}
                                                            disabled={loadingActions[demand.id]}
                                                            className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                            title="Annuler la demande"
                                                        >
                                                            {loadingActions[demand.id] ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Ban className="h-4 w-4" />
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
                        Affichage de {paginatedDemands.length} sur {filteredDemands.length} demande(s)
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
