"use client";

import { useState } from "react";
import { User } from "@/lib/types";
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
import { Plus, Power, PowerOff, Edit, Shield, Loader2, Wand2, Mail, Link, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getPasswordSetupUrl } from "@/actions/users";


interface UsersListProps {
    users: User[];
    title?: string;
    description?: string;
}

export function UsersList({ users, title, description }: UsersListProps) {
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<"manager" | "seller">("seller");

    // Invitation state
    const [showInviteConfirm, setShowInviteConfirm] = useState(false);
    const [existingUserEmail, setExistingUserEmail] = useState("");

    // Edit state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editRole, setEditRole] = useState<"manager" | "seller">("seller");
    const [editPassword, setEditPassword] = useState(""); // Optional for edit

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await createUser({
                username: username || undefined,
                email,
                role,
                first_name: firstName,
                last_name: lastName || ""
            });

            if (result.error) {
                if (result.error === "USER_EXISTS") {
                    setExistingUserEmail(email);
                    setShowInviteConfirm(true);
                    return;
                }
                if (result.error === "USER_ALREADY_MEMBER") {
                    toast.error("Cet utilisateur est déjà membre de cette organisation");
                    return;
                }
                if (result.error === "USERNAME_TAKEN") {
                    toast.error(`Le nom d'utilisateur "${result.username}" est déjà utilisé.`);
                    return;
                }
                toast.error("Une erreur est survenue");
                return;
            }

            setIsOpen(false);
            resetForm();
            router.refresh();
            toast.success("Utilisateur créé avec succès");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSendInvitation() {
        setIsLoading(true);
        try {
            const result = await sendInvitation({ email: existingUserEmail, role });
            if (result.error) {
                if (result.error === "USER_ALREADY_MEMBER") {
                    toast.error("Cet utilisateur est déjà membre");
                } else if (result.error === "INVITATION_ALREADY_SENT") {
                    toast.error("Une invitation est déjà en cours");
                } else {
                    toast.error("Erreur lors de l'envoi");
                }
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
        setUsername("");
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setPhone("");
        setRole("seller");
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
        if (!editingUser) return;
        setIsLoading(true);
        try {
            await updateUser(editingUser.id, {
                username: editUsername || undefined,
                email: editEmail,
                role: editRole,
                first_name: editFirstName,
                last_name: editLastName,
                password: editPassword || undefined,
            });
            setEditingUser(null);
            setEditUsername("");
            setEditEmail("");
            setEditFirstName("");
            setEditLastName("");
            setEditPhone("");
            setEditRole("seller");
            setEditPassword("");
            router.refresh();
            toast.success("Utilisateur mis à jour");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(id: string, active: boolean) {
        setLoadingActions({ ...loadingActions, [`toggle-${id}`]: true });
        try {
            const result = await toggleUserStatus(id, active);
            if (result.error === "LAST_MANAGER_PROTECTION") {
                toast.error("Impossible de désactiver le dernier manager de l'organisation");
                return;
            }
            router.refresh();
        } finally {
            setLoadingActions({ ...loadingActions, [`toggle-${id}`]: false });
        }
    }

    const displayedUsers = users.slice(0, itemsPerPage);

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
                                    <span className="hidden sm:inline">Nouvel Utilisateur</span>
                                    <span className="sm:hidden">Nouveau</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Ajouter un Utilisateur</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Ex: jean.dupont@exemple.com"
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
                                            L'utilisateur n'a pas de mot de passe à la création. Vous pourrez lui envoyer un lien de configuration après l'avoir ajouté.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Téléphone (optionnel)</label>
                                        <Input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+33 6 12 34 56 78"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Rôle</label>
                                        <Select value={role} onValueChange={(v) => setRole(v as "manager" | "seller")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="seller">Vendeur</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                        en tant que <strong>{role === 'manager' ? 'Manager' : 'Vendeur'}</strong> ?
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

                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier Utilisateur</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onEditSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    required
                                    disabled // Prevent email change here for safety
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Téléphone (optionnel)</label>
                                <Input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="+33 6 12 34 56 78"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rôle</label>
                                <Select value={editRole} onValueChange={(v) => setEditRole(v as "manager" | "seller")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="seller">Vendeur</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                    <TableHead>Utilisateur</TableHead>
                                    <TableHead>Nom Complet</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Date de Création</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                                        <TableCell className="whitespace-nowrap">{user.full_name}</TableCell>
                                        <TableCell>
                                            {user.role === "manager" ? (
                                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                                    Manager
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                    Vendeur
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.active ? (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                    Actif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                    Inactif
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{user.created_at || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-1 sm:space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setEditUsername(user.username || "");
                                                        setEditEmail(user.email);
                                                        setEditFirstName(user.first_name || "");
                                                        setEditLastName(user.last_name || "");
                                                        setEditPhone(user.phone || ""); // Added this line back
                                                        setEditRole(user.role as "manager" | "seller");
                                                        setEditPassword(""); // Added this line back
                                                    }}
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggle(user.id, !user.active)}
                                                    disabled={loadingActions[`toggle-${user.id}`]}
                                                    title={user.active ? "Désactiver" : "Activer"}
                                                    className="h-8 w-8"
                                                >
                                                    {loadingActions[`toggle-${user.id}`] ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : user.active ? (
                                                        <Power className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <PowerOff className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </Button>

                                                {/* Setup Link Button */}
                                                {!user.password_hash && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Copier le lien de configuration"
                                                        onClick={async () => {
                                                            const res = await getPasswordSetupUrl(user.id);
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
