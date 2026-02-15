import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenantAccess } from "@/lib/tenant";

export default async function AccountPage() {
    const { user } = await requireTenantAccess();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Mon Compte</h2>
                <p className="text-muted-foreground">
                    Gérez vos informations personnelles et votre mot de passe.
                </p>
            </div>

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Profil</CardTitle>
                        <CardDescription>
                            Mettez à jour votre nom, email et téléphone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm
                            key={`${user.id}-${user.first_name}-${user.last_name}-${user.email}`}
                            user={user}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sécurité</CardTitle>
                        <CardDescription>
                            Changez votre mot de passe.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PasswordForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
