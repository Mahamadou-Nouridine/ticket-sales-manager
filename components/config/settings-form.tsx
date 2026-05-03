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
import { NotificationRecipient } from "@/lib/types";

interface SettingsFormProps {
    initialSettings: {
        name: string;
        currency: string;
        notificationRecipients?: NotificationRecipient[];
    };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [name, setName] = useState(initialSettings.name);
    const [currency, setCurrency] = useState(initialSettings.currency);
    const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>(
        initialSettings.notificationRecipients || []
    );
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
        if (notificationRecipients.some(r => r.email === email)) {
            toast.error("Cette adresse est déjà dans la liste");
            return;
        }
        setNotificationRecipients([...notificationRecipients, {
            email,
            notifications: { sale_submission: true, new_demand: true }
        }]);
        if (!emailToAdd) setNewEmail("");
    };

    const removeEmail = (emailToRemove: string) => {
        setNotificationRecipients(notificationRecipients.filter(r => r.email !== emailToRemove));
    };

    const toggleNotification = (email: string, key: 'sale_submission' | 'new_demand') => {
        setNotificationRecipients(prev => prev.map(r => 
            r.email === email 
                ? { ...r, notifications: { ...r.notifications, [key]: !r.notifications[key] } }
                : r
        ));
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await updateTenantSettings({ name, currency, notificationRecipients });
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
                                managers.filter(m => !notificationRecipients.some(r => r.email === m.email)).map((manager) => (
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
                            {managers.length > 0 && managers.every(m => notificationRecipients.some(r => r.email === m.email)) && (
                                <p className="text-[10px] text-muted-foreground italic">Tous les managers sont déjà ajoutés.</p>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Destinataires configurés</Label>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        {notificationRecipients.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Aucun email configuré pour les notifications.</p>
                        ) : (
                            notificationRecipients.map((recipient) => (
                                <div key={recipient.email} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">{recipient.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={recipient.notifications.sale_submission}
                                                onChange={() => toggleNotification(recipient.email, 'sale_submission')}
                                                className="rounded border-gray-300"
                                            />
                                            Ventes
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={recipient.notifications.new_demand}
                                                onChange={() => toggleNotification(recipient.email, 'new_demand')}
                                                className="rounded border-gray-300"
                                            />
                                            Demandes
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeEmail(recipient.email)}
                                            className="text-red-500 hover:text-red-700 ml-2"
                                            title="Retirer"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
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
