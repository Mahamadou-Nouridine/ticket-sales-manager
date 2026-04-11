"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getOrganizationStats, updateOrganization, deleteOrganization, getTenantDetails } from "@/actions/tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, Save, Users, Ticket, BarChart3, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function TenantManagePage({ params }: { params: Promise<{ slug: string }> }) {
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();
    const resolvedParams = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [currency, setCurrency] = useState("FCFA");
    const [originalSlug, setOriginalSlug] = useState("");
    const [role, setRole] = useState("");
    const [isOwner, setIsOwner] = useState(false);

    const tenantId = (session?.user as any)?.tenantId;

    useEffect(() => {
        if (!tenantId) return;

        async function loadData() {
            try {
                // Fetch details and verify role
                const details = await getTenantDetails(tenantId);

                if (details.role !== 'manager') {
                    // Redirect non-managers
                    router.push(`/t/${resolvedParams.slug}/dashboard`);
                    toast.error("Accès non autorisé");
                    return;
                }

                // If manager, fetch stats
                const statsData = await getOrganizationStats(tenantId);

                setStats(statsData);
                setName(details.name);
                setSlug(details.slug);
                setCurrency(details.currency);
                setOriginalSlug(details.slug);
                setRole(details.role);
                setIsOwner(details.isOwner);
            } catch (error) {
                console.error("Failed to load details", error);
                toast.error("Erreur lors du chargement des données");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [tenantId, session, router, resolvedParams.slug]);

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await updateOrganization(tenantId, { name, slug, currency });
            toast.success("Organisation mise à jour");

            if (slug !== originalSlug) {
                // If slug changed, we need to redirect
                router.push(`/t/${slug}/admin/manage`);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteOrganization(tenantId);
            toast.success("Organisation supprimée");
            await updateSession({ tenantId: null }); // Clear tenant from session
            router.push("/select-tenant");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la suppression");
            setDeleting(false);
        }
    }

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    // Double check just in case, though useEffect handles redirect
    if (role !== 'manager') {
        return null;
    }

    return (
        <div className="space-y-8 p-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gérer l'organisation</h1>
                <p className="text-muted-foreground">
                    Modifiez les paramètres de votre organisation et visualisez les statistiques.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membres</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.members || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commandes Totales</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.sales || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.revenue?.toLocaleString()} FCFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Types de Tickets</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.ticketTypes || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Détails de l'organisation</CardTitle>
                        <CardDescription>
                            Modifiez le nom et l'URL de votre espace de travail.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nom de l'organisation"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug (URL)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md border">
                                        vendora.app/t/
                                    </span>
                                    <Input
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                        placeholder="slug"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Attention : changer l'URL invalidera les anciens liens.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Devise par défaut</label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir une devise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FCFA">FCFA (Franc CFA)</SelectItem>
                                        <SelectItem value="€">EUR (€)</SelectItem>
                                        <SelectItem value="$">USD ($)</SelectItem>
                                        <SelectItem value="DZD">DZD (Dinar Algérien)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Cette devise sera utilisée pour tous les prix et rapports.
                                </p>
                            </div>

                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {isOwner && (
                    <Card className="border-red-200 bg-red-50/50">
                        <CardHeader>
                            <CardTitle className="text-red-600">Zone de danger</CardTitle>
                            <CardDescription className="text-red-700/70">
                                Supprimer définitivement cette organisation et toutes ses données.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-red-600/80 mb-4 leading-relaxed">
                                Cette action est irréversible. Elle supprimera définitivement :
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Tous les membres et invitations</li>
                                    <li>Tout l'historique des commandes et des paiements</li>
                                    <li>Tous les types de tickets et l'inventaire</li>
                                    <li>Tous les journaux d'activité</li>
                                </ul>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full sm:w-auto">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer l'organisation
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-red-200">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-600">Êtes-vous absolument sûr ?</DialogTitle>
                                        <DialogDescription>
                                            Cette action ne peut pas être annulée. Cela supprimera définitivement
                                            l'organisation <strong>{name}</strong> et toutes les données associées.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="destructive"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="w-full"
                                        >
                                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Oui, supprimer définitivement
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
