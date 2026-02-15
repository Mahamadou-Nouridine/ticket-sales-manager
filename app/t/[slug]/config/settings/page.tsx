import { getTenantSettings } from "@/actions/tenant_settings";
import { SettingsForm } from "@/components/config/settings-form";

export default async function SettingsPage() {
    const settings = await getTenantSettings();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
                <p className="text-muted-foreground">
                    Gérez les paramètres globaux de votre instance.
                </p>
            </div>
            <SettingsForm initialSettings={settings} />
        </div>
    );
}
