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
import { sendInvitation } from "@/actions/invitations";
import { useRouter, useParams } from "next/navigation";
import { Plus, Power, PowerOff, Edit, Loader2, MoreHorizontal, Wand2, Mail, Link, Copy } from "lucide-react";
import { getPasswordSetupUrl } from "@/actions/users";


interface SalesmenListProps {
    salesmen: User[];
    title?: string;
    description?: string;
}

export function SalesmenList({ salesmen, title, description }: SalesmenListProps) {
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Invitation state
    const [showInviteConfirm, setShowInviteConfirm] = useState(false);
    const [existingUserEmail, setExistingUserEmail] = useState("");
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
            const result = await createUser({
                email,
                username: username || undefined,
                first_name: firstName,
                last_name: lastName || "",
                role: 'seller'
            });

            if (result.error) {
                if (result.error === "USER_EXISTS") {
                    setExistingUserEmail(email);
                    setShowInviteConfirm(true);
                    return;
                }
                if (result.error === "USER_ALREADY_MEMBER") {
                    toast.error("Cet utilisateur est déjà membre");
                    return;
                }
                toast.error("Erreur lors de la création");
                return;
            }

            setIsOpen(false);
            resetForm();
            router.refresh();
            toast.success("Vendeur créé avec succès");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSendInvitation() {
        setIsLoading(true);
        try {
            const result = await sendInvitation({ email: existingUserEmail, role: 'seller' });
            if (result.error) {
                toast.error(result.error || "Erreur lors de l'envoi");
                return;
            }
            toast.success("Invitation envoyée avec succès");
            setIsOpen(false);
            setShowInviteConfirm(false);
            resetForm();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'envoi de l'invitation");
        } finally {
            setIsLoading(false);
        }
    }

    function resetForm() {
        setEmail("");
        setUsername("");
        setFirstName("");
        setLastName("");
        setPassword("");
        setPhone("");
        setShowInviteConfirm(false);
        setExistingUserEmail("");
    }

    const suggestUsername = (first: string, last: string) => {
        if (!first && !last) return;
        const base = `${first.toLowerCase()}.${last.toLowerCase()}`.replace(/\s+/g, '');
        const suggestion = slug ? `${base}.${slug}` : base;
        setUsername(suggestion);
    };

    const suggestEditUsername = (first: string, last: string) => {
        if (!first && !last) return;
        const base = `${first.toLowerCase()}.${last.toLowerCase()}`.replace(/\s+/g, '');
        const suggestion = slug ? `${base}.${slug}` : base;
        setEditUsername(suggestion);
    };

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
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Nom d&apos;utilisateur (optionnel)</label>
                                            {(firstName || lastName) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-primary"
                                                    onClick={() => suggestUsername(firstName, lastName)}
                                                >
                                                    <Wand2 className="mr-1 h-3 w-3" />
                                                    Suggérer
                                                </Button>
                                            )}
                                        </div>
                                        <Input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Ex: jean.dupont.org"
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
                                            <label className="text-sm font-medium">Nom (optionnel)</label>
                                            <Input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Ex: Dupont"
                                            />
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                        <p className="text-xs text-yellow-800">
                                            Le vendeur n'a pas de mot de passe à la création. Vous pourrez lui envoyer un lien de configuration après l'avoir ajouté.
                                        </p>
                                    </div>

                                    {showInviteConfirm && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-blue-900">
                                                        Utilisateur existant
                                                    </h4>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        L'utilisateur <strong>{existingUserEmail}</strong> existe déjà.
                                                        Voulez-vous lui envoyer une invitation à rejoindre votre organisation
                                                        en tant que <strong>Vendeur</strong> ?
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={handleSendInvitation}
                                                    disabled={isLoading}
                                                    className="flex-1"
                                                >
                                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Envoyer l'invitation
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowInviteConfirm(false);
                                                        setExistingUserEmail("");
                                                    }}
                                                >
                                                    Annuler
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full" disabled={isLoading || showInviteConfirm}>
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
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Nom d&apos;utilisateur (optionnel)</label>
                                    {(editFirstName || editLastName) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs text-primary"
                                            onClick={() => suggestEditUsername(editFirstName, editLastName)}
                                        >
                                            <Wand2 className="mr-1 h-3 w-3" />
                                            Suggérer
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    placeholder="Ex: jean.dupont.org"
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
                                    <label className="text-sm font-medium">Nom (optionnel)</label>
                                    <Input
                                        value={editLastName}
                                        onChange={(e) => setEditLastName(e.target.value)}
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

                                                {/* Setup Link Button */}
                                                {!salesman.password_hash && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Copier le lien de configuration"
                                                        onClick={async () => {
                                                            const res = await getPasswordSetupUrl(salesman.id);
                                                            if (res.success && res.url) {
                                                                navigator.clipboard.writeText(res.url);
                                                                toast.success("Lien de configuration copié !");
                                                            } else {
                                                                toast.error(res.error || "Erreur");
                                                            }
                                                        }}
                                                        className="h-8 w-8 text-blue-600"
                                                    >
                                                        <Link className="h-4 w-4" />
                                                    </Button>
                                                )}
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
