"use client";

import { toast } from "sonner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSale, updateSale } from "@/actions/sales";
import { TicketType, User as UserType, Sale } from "@/lib/types";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SaleFormProps {
    ticketTypes: TicketType[];
    resellers: UserType[];
    initialData?: Sale;
    currency?: string;
    onSuccess?: () => void;
}

export function SaleForm({ ticketTypes, resellers, initialData, currency = 'FCFA', onSuccess }: SaleFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role as "manager" | "seller";
    const currentUserId = (session?.user as any)?.id;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sellerId, setSellerId] = useState(initialData?.seller_id || (userRole === "seller" ? currentUserId : ""));
    const [ticketTypeName, setTicketTypeName] = useState(initialData?.ticket_type_name || "");
    const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
    const [datePrise, setDatePrise] = useState(initialData?.date_de_prise || new Date().toISOString().split("T")[0]);
    const [dateVersement, setDateVersement] = useState(initialData?.date_de_versement || "");
    const [verse, setVerse] = useState(initialData?.verse || false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const data = {
                seller_id: sellerId,
                ticket_type_name: ticketTypeName,
                quantity: parseInt(quantity),
                date_de_prise: datePrise,
                date_de_versement: dateVersement,
                verse,
                ticket_type_id: "", // Not used in sheet
            } as any;

            if (initialData) {
                await updateSale(initialData.id, data);
                toast.success("Commande modifiée avec succès");
            } else {
                await createSale(data);
                toast.success("Commande enregistrée avec succès");
            }

            if (onSuccess) {
                onSuccess();
            } else {
                router.push("/sales");
            }
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Une erreur est survenue lors de la création/modification de la commande");
            setError(error.message || "Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <label className="text-sm font-medium">Vendeur</label>
                <Select
                    value={sellerId}
                    onValueChange={setSellerId}
                    disabled={userRole === "seller"}
                    required
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un vendeur" />
                    </SelectTrigger>
                    <SelectContent>
                        {resellers.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                                {[seller.first_name, seller.last_name].filter(Boolean).join(' ') || seller.full_name || seller.username || seller.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Type de Ticket</label>
                <Select value={ticketTypeName} onValueChange={setTicketTypeName} required>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                        {ticketTypes.filter(t => t.active).map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                                {t.name} ({formatCurrency(t.price, currency)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Quantité</label>
                <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min="1"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Date de Prise</label>
                    <Input
                        type="date"
                        value={datePrise}
                        onChange={(e) => setDatePrise(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Date de Versement</label>
                    <Input
                        type="date"
                        value={dateVersement}
                        onChange={(e) => setDateVersement(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="verse"
                    checked={verse}
                    onCheckedChange={(checked) => setVerse(checked as boolean)}
                    disabled={userRole === "seller"}
                />
                <label
                    htmlFor="verse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Versé (Approuvé par manager)
                </label>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex justify-end space-x-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                >
                    Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Modifier" : "Créer"}
                </Button>
            </div>
        </form>
    );
}
