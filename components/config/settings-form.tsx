"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTenantSettings } from "@/actions/tenant_settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SettingsFormProps {
    initialSettings: {
        name: string;
        currency: string;
    };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [name, setName] = useState(initialSettings.name);
    const [currency, setCurrency] = useState(initialSettings.currency);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await updateTenantSettings({ name, currency });
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
                            placeholder="Ex: Ma Société de Ventes"
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

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                </Button>
            </div>
        </form>
    );
}
