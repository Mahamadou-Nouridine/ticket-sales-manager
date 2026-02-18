"use client";

import React, { useState, useEffect } from "react";
import { getGlobalUsers, toggleUserStatusGlobally, toggleUserAdminStatus, getUserSetupLink } from "@/actions/admin";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, ShieldCheck, Mail, Phone, ShieldAlert, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [setupUrl, setSetupUrl] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const data = await getGlobalUsers();
            setUsers(data);
        } catch (error) {
            toast.error("Erreur lors du chargement des utilisateurs");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus(userId: string, currentStatus: boolean) {
        try {
            await toggleUserStatusGlobally(userId, !currentStatus);
            setUsers(users.map(u => u.id === userId ? { ...u, active: !currentStatus } : u));
            toast.success(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'} globalement`);
        } catch (error) {
            toast.error("Erreur lors de la modification du statut");
        }
    }

    async function handleToggleAdmin(userId: string, currentIsAdmin: boolean) {
        try {
            await toggleUserAdminStatus(userId, !currentIsAdmin);
            setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u));
            toast.success(`Statut administrateur ${!currentIsAdmin ? 'accordé' : 'retiré'}`);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la modification du statut admin");
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
                <p className="text-muted-foreground">Gestion globale de tous les comptes utilisateurs de la plateforme.</p>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom Complet</TableHead>
                            <TableHead>Email / Mobile</TableHead>
                            <TableHead>Global Admin</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Créé le</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Chargement...</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucun utilisateur trouvé.</TableCell>
                            </TableRow>
                        ) : users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="font-medium">{user.full_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Mail className="w-3 h-3" />
                                        {user.email}
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Phone className="w-3 h-3" />
                                            {user.phone}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {user.isAdmin && (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold w-fit">
                                            <ShieldCheck className="w-3 h-3" />
                                            Admin
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-semibold",
                                        user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {user.active ? "Actif" : "Suspendu"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn(user.isAdmin ? "text-purple-600 border-purple-200 bg-purple-50" : "text-gray-400")}
                                        onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                                        title={user.isAdmin ? "Retirer les droits Admin" : "Promouvoir Admin"}
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn(user.active ? "text-red-500" : "text-green-500")}
                                        onClick={() => handleToggleStatus(user.id, user.active)}
                                        disabled={user.isAdmin} // Prevent admin from disabling themselves or other admins for now
                                        title={user.active ? "Suspendre l'accès global" : "Réactiver l'accès"}
                                    >
                                        {user.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                    </Button>
                                    {!user.password_hash && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={async () => {
                                                try {
                                                    const res = await getUserSetupLink(user.id);
                                                    if (res.success) {
                                                        setSetupUrl(res.setupUrl!);
                                                    }
                                                } catch (error: any) {
                                                    toast.error(error.message);
                                                }
                                            }}
                                            title="Lien de configuration"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!setupUrl} onOpenChange={(open) => !open && setSetupUrl(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lien de configuration</DialogTitle>
                        <DialogDescription>
                            Cet utilisateur n'a pas encore configuré de mot de passe. Envoyez-lui ce lien pour qu'il puisse le faire.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 py-4">
                        <Input value={setupUrl || ""} readOnly />
                        <Button onClick={() => {
                            if (setupUrl) {
                                navigator.clipboard.writeText(setupUrl);
                                toast.success("Lien copié !");
                            }
                        }}>
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
