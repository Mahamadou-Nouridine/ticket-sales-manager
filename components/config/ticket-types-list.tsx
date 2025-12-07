"use client";

import { useState } from "react";
import { TicketType } from "@/lib/types";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createTicketType, toggleTicketType, updateTicketType } from "@/actions/config";
import { useRouter } from "next/navigation";
import { Plus, Power, PowerOff, Edit } from "lucide-react";

interface TicketTypesListProps {
    ticketTypes: TicketType[];
}

export function TicketTypesList({ ticketTypes }: TicketTypesListProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");

    // Edit state
    const [editingType, setEditingType] = useState<TicketType | null>(null);
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createTicketType({ name, price: parseFloat(price) });
            setIsOpen(false);
            setName("");
            setPrice("");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function onEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingType) return;
        setIsLoading(true);
        try {
            await updateTicketType(editingType.id, { name: editName, price: parseFloat(editPrice) });
            setEditingType(null);
            setEditName("");
            setEditPrice("");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(id: string, active: boolean) {
        await toggleTicketType(id, active);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouveau Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un Type de Ticket</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prix (FCFA)</label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                Créer
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier Type de Ticket</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nom</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prix (FCFA)</label>
                            <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            Modifier
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Prix</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ticketTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="whitespace-nowrap">{type.name}</TableCell>
                                    <TableCell className="whitespace-nowrap">{type.price} FCFA</TableCell>
                                    <TableCell>
                                        {type.active ? (
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                Actif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                Inactif
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingType(type);
                                                    setEditName(type.name);
                                                    setEditPrice(type.price.toString());
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggle(type.id, !type.active)}
                                                title={type.active ? "Désactiver" : "Activer"}
                                            >
                                                {type.active ? (
                                                    <Power className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <PowerOff className="h-4 w-4 text-gray-400" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
