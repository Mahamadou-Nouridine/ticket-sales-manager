"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User as Salesman, User } from "@/lib/types";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { createUser, toggleUserStatus, updateUser } from "@/actions/users";
import { useRouter } from "next/navigation";
import { Plus, Power, PowerOff, Edit, Loader2, MoreHorizontal } from "lucide-react";


interface SalesmenListProps {
    salesmen: User[];
    title?: string;
    description?: string;
}

export function SalesmenList({ salesmen, title, description }: SalesmenListProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

    // Edit state
    const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);
    const [editEmail, setEditEmail] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editPassword, setEditPassword] = useState(""); // Optional for edit

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createUser({
                email,
                username: username || undefined,
                first_name: firstName,
                last_name: lastName,
                password: password,
                role: 'seller'
            });
            setIsOpen(false);
            setEmail("");
            setUsername("");
            setFirstName("");
            setLastName("");
            setPassword("");
            setPhone("");
            router.refresh();
            toast.success("Vendeur créé avec succès");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsLoading(false);
        }
    }

    async function onEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingSalesman) return;
        setIsLoading(true);
        try {
            await updateUser(editingSalesman.id, {
                email: editEmail,
                username: editUsername || undefined,
                first_name: editFirstName,
                last_name: editLastName,
                password: editPassword || undefined,
            });
            setEditingSalesman(null);
            setEditEmail("");
            setEditUsername("");
            setEditFirstName("");
            setEditLastName("");
            setEditPassword("");
            router.refresh();
            toast.success("Vendeur mis à jour");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(id: string, active: boolean) {
        setLoadingActions({ ...loadingActions, [`toggle-${id}`]: true });
        try {
            await toggleUserStatus(id, active);
            router.refresh();
            toast.success(active ? "Vendeur activé" : "Vendeur désactivé");
        } catch (error: any) {
            toast.error(error.message || "Erreur");
        } finally {
            setLoadingActions({ ...loadingActions, [`toggle-${id}`]: false });
        }
    }

    const displayedSalesmen = salesmen.slice(0, itemsPerPage);

    return (
        <div className="max-w-full overflow-x-hidden">
            <div className="space-y-4">
                <div>
                    <div>
                        {title && <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>}
                        {description && <p className="text-sm md:text-base text-muted-foreground">{description}</p>}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => setItemsPerPage(parseInt(value))}
                        >
                            <SelectTrigger className="w-[120px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 / page</SelectItem>
                                <SelectItem value="20">20 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                                <SelectItem value="100">100 / page</SelectItem>
                            </SelectContent>
                        </Select>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="whitespace-nowrap">
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Nouveau Vendeur</span>
                                    <span className="sm:hidden">Nouveau</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Ajouter un Vendeur</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@exemple.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nom d&apos;utilisateur (optionnel)</label>
                                        <Input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Ex: jean.dupon"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Prénom</label>
                                            <Input
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Ex: Jean"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Nom</label>
                                            <Input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Ex: Dupont"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Mot de passe</label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 6 caractères"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Créer
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Desktop Title Space handled above */}
                <div className="hidden md:block">
                </div>

                <Dialog open={!!editingSalesman} onOpenChange={(open) => !open && setEditingSalesman(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier Vendeur</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onEditSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom d&apos;utilisateur (optionnel)</label>
                                <Input
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Prénom</label>
                                    <Input
                                        value={editFirstName}
                                        onChange={(e) => setEditFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nom</label>
                                    <Input
                                        value={editLastName}
                                        onChange={(e) => setEditLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nouveau mot de passe (optionnel)</label>
                                <Input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Laisser vide pour ne pas changer"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Modifier
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="sticky md:top-0 z-10 bg-background shadow-sm">
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedSalesmen.map((salesman) => (
                                    <TableRow key={salesman.id}>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{salesman.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{salesman.email}</span>
                                            </div>
                                        </TableCell>
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
                                            <div className="flex justify-end space-x-1 sm:space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingSalesman(salesman);
                                                        setEditEmail(salesman.email);
                                                        setEditUsername(salesman.username || "");
                                                        setEditFirstName(salesman.first_name);
                                                        setEditLastName(salesman.last_name);
                                                        setEditPassword("");
                                                    }}
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggle(salesman.id, !salesman.active)}
                                                    disabled={loadingActions[`toggle-${salesman.id}`]}
                                                    title={salesman.active ? "Désactiver" : "Activer"}
                                                    className="h-8 w-8"
                                                >
                                                    {loadingActions[`toggle-${salesman.id}`] ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : salesman.active ? (
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
        </div>
    );
}
