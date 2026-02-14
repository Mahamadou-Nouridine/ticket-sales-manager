"use client";

import { useState } from "react";
import { TicketInventory, TicketType } from "@/lib/types";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { updateInventoryStock, setAlertThreshold, adjustInventory } from "@/actions/inventory";
import { useRouter } from "next/navigation";
import { Edit, AlertTriangle, Loader2, Plus, Minus } from "lucide-react";

interface InventoryTableProps {
    inventory: TicketInventory[];
    ticketTypes: TicketType[];
    canManage: boolean;
}

export function InventoryTable({ inventory, ticketTypes, canManage }: InventoryTableProps) {
    const router = useRouter();
    const [editingItem, setEditingItem] = useState<TicketInventory | null>(null);
    const [newStock, setNewStock] = useState("");
    const [newThreshold, setNewThreshold] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Adjustment dialog state
    const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
    const [selectedTicketType, setSelectedTicketType] = useState("");
    const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
    const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");

    async function handleUpdateStock(e: React.FormEvent) {
        e.preventDefault();
        if (!editingItem) return;
        setIsLoading(true);
        try {
            await updateInventoryStock(editingItem.ticket_type_id, parseInt(newStock));
            setEditingItem(null);
            router.refresh();
        } catch (error) {
            alert("Erreur lors de la mise à jour du stock");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUpdateThreshold(e: React.FormEvent) {
        e.preventDefault();
        if (!editingItem) return;
        setIsLoading(true);
        try {
            await setAlertThreshold(editingItem.ticket_type_id, parseInt(newThreshold));
            setEditingItem(null);
            router.refresh();
        } catch (error) {
            alert("Erreur lors de la mise à jour du seuil");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAdjustInventory(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTicketType || !adjustmentQuantity) return;

        setIsLoading(true);
        try {
            const quantity = parseInt(adjustmentQuantity);
            const change = adjustmentType === "add" ? quantity : -quantity;
            const reason = adjustmentType === "add" ? "Ajout manuel de stock" : "Retrait manuel de stock";

            await adjustInventory(selectedTicketType, change, reason);
            setIsAdjustDialogOpen(false);
            setSelectedTicketType("");
            setAdjustmentQuantity("");
            setAdjustmentType("add");
            router.refresh();
        } catch (error: any) {
            alert(error.message || "Erreur lors de l'ajustement du stock");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="flex justify-end">
                    <Button onClick={() => setIsAdjustDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajuster le Stock
                    </Button>
                </div>
            )}

            {/* Adjustment Dialog */}
            <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajuster le Stock</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdjustInventory} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type de Ticket</label>
                            <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ticketTypes.filter(t => t.active).map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type d'Ajustement</label>
                            <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="add">Ajouter au stock</SelectItem>
                                    <SelectItem value="remove">Retirer du stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantité</label>
                            <Input
                                type="number"
                                min="1"
                                value={adjustmentQuantity}
                                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                                placeholder="Entrer la quantité"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {adjustmentType === "add" ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                            Confirmer
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gérer l'Inventaire - {editingItem?.ticket_type_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <form onSubmit={handleUpdateStock} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Stock Actuel</label>
                                <Input
                                    type="number"
                                    value={newStock}
                                    onChange={(e) => setNewStock(e.target.value)}
                                    placeholder={editingItem?.current_stock.toString()}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Mettre à jour le Stock
                            </Button>
                        </form>
                        <form onSubmit={handleUpdateThreshold} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Seuil d'Alerte</label>
                                <Input
                                    type="number"
                                    value={newThreshold}
                                    onChange={(e) => setNewThreshold(e.target.value)}
                                    placeholder={editingItem?.alert_threshold.toString()}
                                    required
                                />
                            </div>
                            <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Mettre à jour le Seuil
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type de Ticket</TableHead>
                                <TableHead>Stock Actuel</TableHead>
                                <TableHead>Seuil d'Alerte</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Dernière MAJ</TableHead>
                                {canManage && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.map((item) => {
                                const isLowStock = item.current_stock <= item.alert_threshold;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {item.ticket_type_name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className={isLowStock ? "text-red-600 font-semibold" : ""}>
                                                {item.current_stock}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.alert_threshold}</TableCell>
                                        <TableCell>
                                            {isLowStock ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Stock Faible
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                    OK
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {new Date(item.last_updated).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setNewStock(item.current_stock.toString());
                                                        setNewThreshold(item.alert_threshold.toString());
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
