"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTenantSettings } from "@/actions/tenant_settings";
import { toast } from "sonner";
import { Loader2, Plus, X, Mail, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getManagers } from "@/actions/users";

interface SettingsFormProps {
    initialSettings: {
        name: string;
        currency: string;
        notificationEmails: string[];
    };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [name, setName] = useState(initialSettings.name);
    const [currency, setCurrency] = useState(initialSettings.currency);
    const [notificationEmails, setNotificationEmails] = useState<string[]>(initialSettings.notificationEmails || []);
    const [newEmail, setNewEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [managers, setManagers] = useState<any[]>([]);
    const [fetchingManagers, setFetchingManagers] = useState(true);

    useEffect(() => {
        async function loadManagers() {
            try {
                const data = await getManagers();
                setManagers(data);
            } catch (error) {
                console.error("Failed to load managers:", error);
            } finally {
                setFetchingManagers(false);
            }
        }
        loadManagers();
    }, []);

    const addEmail = (emailToAdd?: string) => {
        const email = emailToAdd || newEmail;
        if (!email) return;
        if (!email.includes("@")) {
            toast.error("Veuillez entrer une adresse email valide");
            return;
        }
        if (notificationEmails.includes(email)) {
            toast.error("Cette adresse est déjà dans la liste");
            return;
        }
        setNotificationEmails([...notificationEmails, email]);
        if (!emailToAdd) setNewEmail("");
    };

    const removeEmail = (emailToRemove: string) => {
        setNotificationEmails(notificationEmails.filter(email => email !== emailToRemove));
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await updateTenantSettings({ name, currency, notificationEmails });
            if (result.success) {
                toast.success("Paramètres mis à jour avec succès");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuration Générale</CardTitle>
                    <CardDescription>
                        Ces paramètres s'appliquent à tous les utilisateurs du tenant.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de l'Organisation</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Ma Société de Commandes"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">Devise par défaut</Label>
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
                        <p className="text-sm text-muted-foreground">
                            Cette devise sera utilisée pour tous les prix et rapports.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications Managers</CardTitle>
                    <CardDescription>
                        Liste des emails des managers qui recevront une notification à chaque fois qu'un vendeur soumet une vente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="email@exemple.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="pl-9"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addEmail();
                                    }
                                }}
                            />
                        </div>
                        <Button type="button" variant="secondary" onClick={() => addEmail()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            Sélectionner un manager existant
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {fetchingManagers ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : managers.length > 0 ? (
                                managers.filter(m => !notificationEmails.includes(m.email)).map((manager) => (
                                    <Button
                                        key={manager.id}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs border-dashed hover:border-blue-500 hover:text-blue-600 transition-all bg-gray-50/50"
                                        onClick={() => addEmail(manager.email)}
                                    >
                                        <UserPlus className="mr-1.5 h-3 w-3" />
                                        {manager.full_name}
                                    </Button>
                                ))
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic">Aucun autre manager disponible.</p>
                            )}
                            {managers.length > 0 && managers.every(m => notificationEmails.includes(m.email)) && (
                                <p className="text-[10px] text-muted-foreground italic">Tous les managers sont déjà ajoutés.</p>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Destinataires configurés</Label>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {notificationEmails.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Aucun email configuré pour les notifications.</p>
                        ) : (
                            notificationEmails.map((email) => (
                                <Badge key={email} variant="secondary" className="px-3 py-1 text-sm font-medium flex items-center gap-2 pr-1 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors">
                                    {email}
                                    <button
                                        type="button"
                                        onClick={() => removeEmail(email)}
                                        className="rounded-full p-0.5 hover:bg-blue-200 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                </Button>
            </div>
        </form>
    );
}
