"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TicketType, User as UserType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createDemand } from "@/actions/demands";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DemandFormProps {
    ticketTypes: TicketType[];
    sellers: UserType[];
    onSuccess: () => void;
}

export function DemandForm({ ticketTypes, sellers, onSuccess }: DemandFormProps) {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role as "manager" | "seller";
    const userId = (session?.user as any)?.id as string;

    const [loading, setLoading] = useState(false);
    const [sellerId, setSellerId] = useState<string>(
        userRole === "manager" ? "" : userId
    );
    const [ticketTypeName, setTicketTypeName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        if (!ticketTypeName) {
            toast.error("Veuillez sélectionner un type de ticket");
            return;
        }

        if (userRole === "manager" && !sellerId) {
            toast.error("Veuillez sélectionner un vendeur");
            return;
        }

        setLoading(true);

        try {
            await createDemand({
                seller_id: sellerId,
                ticket_type_name: ticketTypeName,
                quantity: parseInt(quantity, 10),
                notes: notes || undefined,
            });
            
            toast.success("Demande soumise avec succès");
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la soumission");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {userRole === "manager" && (
                <div className="space-y-2">
                    <Label htmlFor="seller">Pour le Vendeur</Label>
                    <Select value={sellerId} onValueChange={setSellerId} required>
                        <SelectTrigger id="seller">
                            <SelectValue placeholder="Sélectionnez un vendeur" />
                        </SelectTrigger>
                        <SelectContent>
                            {sellers.map((seller) => (
                                <SelectItem key={seller.id} value={seller.id}>
                                    {seller.full_name || seller.username || seller.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="ticketType">Type de Ticket</Label>
                <Select value={ticketTypeName} onValueChange={setTicketTypeName} required>
                    <SelectTrigger id="ticketType">
                        <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                        {ticketTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                                {type.name} ({type.price} FCFA)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                    id="quantity"
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ex: 50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optionnel)</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Précisez le motif de la demande si nécessaire..."
                    rows={3}
                />
            </div>

            <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Soumettre la Demande
                </Button>
            </div>
        </form>
    );
}
