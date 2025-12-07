"use client";

import { useState } from "react";
import { Salesman } from "@/lib/types";
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
import { createSalesman, toggleSalesman, updateSalesman } from "@/actions/config";
import { useRouter } from "next/navigation";
import { Plus, Power, PowerOff, Edit } from "lucide-react";

interface SalesmenListProps {
    salesmen: Salesman[];
}

export function SalesmenList({ salesmen }: SalesmenListProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");

    // Edit state
    const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);
    const [editName, setEditName] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createSalesman({ name });
            setIsOpen(false);
            setName("");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function onEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingSalesman) return;
        setIsLoading(true);
        try {
            await updateSalesman(editingSalesman.id, { name: editName });
            setEditingSalesman(null);
            setEditName("");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(id: string, active: boolean) {
        await toggleSalesman(id, active);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouveau Vendeur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un Vendeur</DialogTitle>
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
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                Créer
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={!!editingSalesman} onOpenChange={(open) => !open && setEditingSalesman(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier Vendeur</DialogTitle>
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
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            Modifier
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salesmen.map((salesman) => (
                            <TableRow key={salesman.id}>
                                <TableCell>{salesman.name}</TableCell>
                                <TableCell>
                                    {salesman.active ? (
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
                                                setEditingSalesman(salesman);
                                                setEditName(salesman.name);
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(salesman.id, !salesman.active)}
                                            title={salesman.active ? "Désactiver" : "Activer"}
                                        >
                                            {salesman.active ? (
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
    );
}
