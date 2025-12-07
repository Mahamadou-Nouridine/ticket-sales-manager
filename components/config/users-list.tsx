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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createUser, toggleUserActive, updateUser } from "@/actions/users";
import { useRouter } from "next/navigation";
import { Plus, Power, PowerOff, Edit } from "lucide-react";

interface UsersListProps {
    users: User[];
}

export function UsersList({ users }: UsersListProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("user");

    // Edit state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editFullName, setEditFullName] = useState("");
    const [editRole, setEditRole] = useState("user");
    const [editPassword, setEditPassword] = useState(""); // Optional for edit

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createUser({ username, password, role, full_name: fullName });
            setIsOpen(false);
            setUsername("");
            setPassword("");
            setFullName("");
            setRole("user");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function onEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingUser) return;
        setIsLoading(true);
        try {
            await updateUser(editingUser.id, {
                username: editUsername,
                role: editRole,
                full_name: editFullName,
                password: editPassword || undefined,
            });
            setEditingUser(null);
            setEditUsername("");
            setEditFullName("");
            setEditRole("user");
            setEditPassword("");
            router.refresh();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(id: string, active: boolean) {
        await toggleUserActive(id, active);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvel Utilisateur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un Utilisateur</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom d'utilisateur</label>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom Complet</label>
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mot de passe</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rôle</label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Utilisateur</SelectItem>
                                        <SelectItem value="superuser">Superutilisateur</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                Créer
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier Utilisateur</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nom d'utilisateur</label>
                            <Input
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nom Complet</label>
                            <Input
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                required
                            />
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
                            <label className="text-sm font-medium">Rôle</label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Utilisateur</SelectItem>
                                    <SelectItem value="superuser">Superutilisateur</SelectItem>
                                </SelectContent>
                            </Select>
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
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Nom Complet</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Dernière Connexion</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.full_name}</TableCell>
                                <TableCell>
                                    {user.role === "superuser" ? (
                                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                            Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                            Utilisateur
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
                                <TableCell>{user.last_login || "-"}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingUser(user);
                                                setEditUsername(user.username);
                                                setEditFullName(user.full_name);
                                                setEditRole(user.role);
                                                setEditPassword("");
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(user.id, !user.active)}
                                            title={user.active ? "Désactiver" : "Activer"}
                                        >
                                            {user.active ? (
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
