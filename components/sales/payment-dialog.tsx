"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (invoiceNumber: string, paymentDate: string) => Promise<void>;
}

export function PaymentDialog({ open, onOpenChange, onConfirm }: PaymentDialogProps) {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [isLoading, setIsLoading] = useState(false);

    async function handleConfirm() {
        if (!invoiceNumber.trim()) {
            alert("Veuillez saisir un numéro de reçu");
            return;
        }

        setIsLoading(true);
        try {
            await onConfirm(invoiceNumber, paymentDate);
            setInvoiceNumber("");
            setPaymentDate(new Date().toISOString().split("T")[0]);
            onOpenChange(false);
        } catch (error) {
            alert("Erreur lors de la validation du paiement");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Valider le Paiement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Numéro de Reçu</label>
                        <Input
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="Ex: INV-001"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date de Versement</label>
                        <Input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Annuler
                    </Button>
                    <Button onClick={handleConfirm} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
