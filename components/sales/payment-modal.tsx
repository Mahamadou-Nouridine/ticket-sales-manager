"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPayment, approvePayment, rejectPayment, markSaleAsPaid, cancelPayment } from "@/actions/payments";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Save, Edit3, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sale: any;
    payment: any | null;
    userRole: "manager" | "seller";
    currency?: string;
    onSuccess: () => void;
}

export function PaymentModal({ open, onOpenChange, sale, payment, userRole, currency = 'FCFA', onSuccess }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [receiptId, setReceiptId] = useState(payment?.receipt_id || "");
    const [amount, setAmount] = useState(payment?.amount || (sale?.quantity * sale?.ticket_type_price) || 0);
    const [notes, setNotes] = useState(payment?.notes || "");
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [isEditing, setIsEditing] = useState(!!payment && userRole === "seller" && payment.status !== "approved");

    const handleSellerSubmit = async () => {
        if (!receiptId.trim()) {
            toast.error("Veuillez entrer un numéro de reçu");
            return;
        }

        setLoading(true);
        try {
            await submitPayment(sale.id, receiptId, amount, notes);
            toast.success("Paiement soumis avec succès");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la soumission");
        } finally {
            setLoading(false);
        }
    };

    const handleManagerDirectPayment = async () => {
        if (!receiptId.trim()) {
            toast.error("Veuillez entrer un numéro de reçu");
            return;
        }

        setLoading(true);
        try {
            await markSaleAsPaid(sale.id, receiptId);
            toast.success("Commande marquée comme payée");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setLoading(true);
        try {
            await approvePayment(payment.id);
            toast.success("Paiement approuvé");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'approbation");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("Veuillez entrer une raison de rejet");
            return;
        }

        setLoading(true);
        try {
            await rejectPayment(payment.id, rejectionReason);
            toast.error("Paiement rejeté");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors du rejet");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Voulez-vous vraiment annuler cette soumission ?")) return;

        setLoading(true);
        try {
            await cancelPayment(payment.id);
            toast.success("Soumission annulée");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'annulation");
        } finally {
            setLoading(false);
        }
    };

    // Seller Mode: Submit payment
    if (userRole === "seller" && !payment && !sale.verse) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Soumettre un Paiement</DialogTitle>
                        <DialogDescription>
                            Commande: {(sale as any).seller_name} - {sale.ticket_type_name} (x{sale.quantity})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="receipt">Numéro de Reçu *</Label>
                            <Input
                                id="receipt"
                                value={receiptId}
                                onChange={(e) => setReceiptId(e.target.value)}
                                placeholder="Ex: REC-2024-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Montant ({currency}) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Informations supplémentaires..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Annuler
                        </Button>
                        <Button onClick={handleSellerSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Soumettre le Paiement
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Manager Mode: Direct Payment (no submission exists)
    if (userRole === "manager" && !payment && !sale.verse) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Marquer comme Payé</DialogTitle>
                        <DialogDescription>
                            Commande: {(sale as any).seller_name} - {sale.ticket_type_name} (x{sale.quantity})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="receipt">Numéro de Reçu *</Label>
                            <Input
                                id="receipt"
                                value={receiptId}
                                onChange={(e) => setReceiptId(e.target.value)}
                                placeholder="Ex: REC-2024-001"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Cette action marquera immédiatement la commande comme payée.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Annuler
                        </Button>
                        <Button onClick={handleManagerDirectPayment} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Marquer comme Payé
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Manager Mode: Approve/Reject submission
    if (userRole === "manager" && payment) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détails du Paiement</DialogTitle>
                        <DialogDescription>
                            Commande: {(sale as any).seller_name} - {sale.ticket_type_name} (x{sale.quantity})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Numéro de Reçu</Label>
                                <p className="font-medium">{payment.receipt_id}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Montant</Label>
                                <p className="font-medium">{formatCurrency(payment.amount, currency)}</p>
                            </div>
                        </div>
                        {payment.notes && (
                            <div>
                                <Label className="text-muted-foreground">Notes</Label>
                                <p className="text-sm">{payment.notes}</p>
                            </div>
                        )}
                        <div>
                            <Label className="text-muted-foreground">Soumis le</Label>
                            <p className="text-sm">{new Date(payment.submitted_at).toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-muted-foreground">Statut:</Label>
                            {payment.status === "pending" && (
                                <span className="flex items-center gap-1 text-yellow-600">
                                    <Clock className="h-4 w-4" />
                                    En attente
                                </span>
                            )}
                            {payment.status === "approved" && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    Approuvé
                                </span>
                            )}
                            {payment.status === "rejected" && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <XCircle className="h-4 w-4" />
                                    Rejeté
                                </span>
                            )}
                        </div>
                        {payment.status === "rejected" && payment.rejection_reason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                                <Label className="text-red-900">Raison du rejet</Label>
                                <p className="text-sm text-red-700">{payment.rejection_reason}</p>
                            </div>
                        )}
                        {payment.status === "approved" && payment.approved_at && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded">
                                <Label className="text-green-900">Approuvé le</Label>
                                <p className="text-sm text-green-700">
                                    {new Date(payment.approved_at).toLocaleString('fr-FR')}
                                </p>
                            </div>
                        )}

                        {payment.status === "pending" && !showRejectForm && (
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => setShowRejectForm(true)}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Rejeter
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Approuver
                                </Button>
                            </div>
                        )}

                        {showRejectForm && (
                            <div className="space-y-3 pt-2 border-t">
                                <Label htmlFor="rejection">Raison du rejet *</Label>
                                <Textarea
                                    id="rejection"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Expliquez pourquoi ce paiement est rejeté..."
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowRejectForm(false);
                                            setRejectionReason("");
                                        }}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleReject}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirmer le Rejet
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    {payment.status !== "pending" && (
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Fermer
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        );
    }

    // Sale already paid
    if (sale.verse) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Paiement Effectué</DialogTitle>
                        <DialogDescription>
                            Commande: {(sale as any).seller_name} - {sale.ticket_type_name} (x{sale.quantity})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Cette commande a été payée</span>
                        </div>
                        {sale.invoice_number && (
                            <div>
                                <Label className="text-muted-foreground">Numéro de Reçu</Label>
                                <p className="font-medium">{sale.invoice_number}</p>
                            </div>
                        )}
                        {sale.date_de_versement && (
                            <div>
                                <Label className="text-muted-foreground">Date de Paiement</Label>
                                <p className="text-sm">{new Date(sale.date_de_versement).toLocaleString('fr-FR')}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Seller Mode: View/Edit submission
    if (userRole === "seller" && payment) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Modifier la Soumission" : "Détails de la Soumission"}</DialogTitle>
                        <DialogDescription>
                            Commande: {(sale as any).seller_name} - {sale.ticket_type_name} (x{sale.quantity})
                        </DialogDescription>
                    </DialogHeader>

                    {payment.status === "rejected" && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-900">Soumission Rejetée</p>
                                <p className="text-sm text-red-700">{payment.rejection_reason || "Aucune raison fournie."}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="receipt">Numéro de Reçu *</Label>
                            <Input
                                id="receipt"
                                value={receiptId}
                                onChange={(e) => setReceiptId(e.target.value)}
                                disabled={!isEditing}
                                placeholder="Ex: REC-2024-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Montant ({currency}) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={!isEditing}
                                placeholder="Informations supplémentaires..."
                                rows={3}
                            />
                        </div>

                        {!isEditing && (
                            <div className="flex items-center gap-2 pt-2">
                                <Label className="text-muted-foreground">Statut:</Label>
                                {payment.status === "pending" && (
                                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                                        <Clock className="mr-1 h-3 w-3" />
                                        En attente d'approbation
                                    </Badge>
                                )}
                                {payment.status === "approved" && (
                                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Approuvé
                                    </Badge>
                                )}
                                {payment.status === "rejected" && (
                                    <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Rejeté
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 border-t pt-4">
                        <div className="flex-1 w-full sm:w-auto">
                            {payment.status !== "approved" && (
                                <Button
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Annuler la soumission
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Fermer
                            </Button>
                            {payment.status !== "approved" && (
                                isEditing ? (
                                    <Button
                                        onClick={handleSellerSubmit}
                                        disabled={loading}
                                        variant={payment.status === "rejected" ? "destructive" : "default"}
                                        className="w-full sm:w-auto"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        {payment.status === "rejected" ? "Soumettre à nouveau" : "Enregistrer"}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        disabled={loading}
                                        className="w-full sm:w-auto"
                                    >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        Corriger
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Default: Return null if no conditions met
    return null;
}
