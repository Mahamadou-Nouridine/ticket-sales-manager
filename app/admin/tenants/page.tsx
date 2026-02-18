"use client";

import React, { useState, useEffect } from "react";
import { getAllTenants, toggleTenantStatus, createOrganizationByAdmin } from "@/actions/admin";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Building2, Plus, Power, PowerOff, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [setupUrl, setSetupUrl] = useState<string | null>(null);
    const [isCreatingDialogControlled, setIsCreatingDialogControlled] = useState(false);

    // Form states
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [managerName, setManagerName] = useState("");
    const [managerEmail, setManagerEmail] = useState("");

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        try {
            const data = await getAllTenants();
            setTenants(data);
        } catch (error) {
            toast.error("Erreur lors du chargement des organisations");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus(tenantId: string, currentStatus: boolean) {
        try {
            await toggleTenantStatus(tenantId, !currentStatus);
            setTenants(tenants.map(t => t.id === tenantId ? { ...t, active: !currentStatus } : t));
            toast.success(`Organisation ${!currentStatus ? 'activée' : 'désactivée'}`);
        } catch (error) {
            toast.error("Erreur lors de la modification du statut");
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        try {
            const result = await createOrganizationByAdmin({ name, slug, managerName, managerEmail });
            if (result.success) {
                toast.success("Organisation créée avec succès");
                setSetupUrl(result.setupUrl!);
                loadTenants();
            } else if (result.error === "SLUG_ALREADY_EXISTS") {
                toast.error("Ce slug est déjà utilisé par une autre organisation");
            } else if (result.error === "USER_ALREADY_EXISTS_GLOBALLY") {
                toast.error("Un utilisateur avec cet email existe déjà. Veuillez utiliser un email unique pour le manager.");
            }
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsCreating(false);
        }
    }

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success("Lien copié !");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organisations</h1>
                    <p className="text-muted-foreground">Gérez tous les espaces de travail de la plateforme.</p>
                </div>
                <Dialog
                    open={!!setupUrl || isCreatingDialogControlled}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSetupUrl(null);
                            setIsCreatingDialogControlled(false);
                            setName("");
                            setSlug("");
                            setManagerName("");
                            setManagerEmail("");
                        } else {
                            setIsCreatingDialogControlled(true);
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsCreatingDialogControlled(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle Organisation
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Créer une organisation</DialogTitle>
                            <DialogDescription>
                                Créez un nouvel espace de travail et désignez un manager.
                            </DialogDescription>
                        </DialogHeader>

                        {!setupUrl ? (
                            <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Nom de l'organisation</label>
                                    <Input value={name} onChange={(e) => {
                                        setName(e.target.value);
                                        if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                                    }} placeholder="ex: Ma Boutique" required />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Slug (URL)</label>
                                    <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="ma-boutique" required />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Nom du Manager</label>
                                    <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Jean Dupont" required />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email du Manager</label>
                                    <Input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="jean@example.com" required />
                                </div>
                                <Button type="submit" className="w-full" disabled={isCreating}>
                                    {isCreating ? "Création..." : "Créer l'organisation"}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-4 pt-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                                    L'organisation a été créée. Envoyez ce lien au manager pour qu'il configure son mot de passe.
                                </div>
                                <div className="flex gap-2">
                                    <Input value={setupUrl} readOnly />
                                    <Button onClick={() => copyToClipboard(setupUrl)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button className="w-full" variant="outline" onClick={() => setSetupUrl(null)}>
                                    Terminer
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Date Création</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Chargement...</TableCell>
                            </TableRow>
                        ) : tenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucune organisation trouvée.</TableCell>
                            </TableRow>
                        ) : tenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.name}</TableCell>
                                <TableCell className="font-mono text-xs">{tenant.slug}</TableCell>
                                <TableCell className="capitalize">{tenant.plan}</TableCell>
                                <TableCell>
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-semibold",
                                        tenant.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {tenant.active ? "Actif" : "Désactivé"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs">{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn(tenant.active ? "text-red-500" : "text-green-500")}
                                        onClick={() => handleToggleStatus(tenant.id, tenant.active)}
                                        title={tenant.active ? "Désactiver" : "Activer"}
                                    >
                                        {tenant.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                    </Button>
                                    <Button variant="outline" size="icon" asChild>
                                        <Link href={`/t/${tenant.slug}/dashboard`} target="_blank">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
