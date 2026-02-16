"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getMyTenants } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { CreateOrgDialog } from "@/components/layout/create-org-dialog";

export default function SelectTenantPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session, update } = useSession();
    const router = useRouter();

    const roleMap = {
        "seller": "Vendeur",
        "manager": "Manager",
    }

    const [hasAttemptedAutoRedirect, setHasAttemptedAutoRedirect] = useState(false);

    useEffect(() => {
        async function loadTenants() {
            if (hasAttemptedAutoRedirect) return;

            try {
                const data = await getMyTenants();
                console.log("Select-tenant - Tenants loaded:", data);
                setTenants(data);

                // Automatic redirection logic
                const lastSlug = localStorage.getItem("lastTenantSlug");
                const currentTenantId = (session?.user as any).tenantId;

                if (lastSlug && !currentTenantId) {
                    const lastTenant = data.find((t: any) => t.slug === lastSlug);
                    if (lastTenant) {
                        setHasAttemptedAutoRedirect(true);
                        handleSelect(lastTenant.id);
                        return;
                    }
                }

                // If only one, select it
                if (data.length === 1 && !currentTenantId) {
                    setHasAttemptedAutoRedirect(true);
                    handleSelect(data?.[0]?.id);
                }
            } catch (error) {
                console.error("Failed to load tenants", error);
            } finally {
                setLoading(false);
            }
        }

        if (session && !hasAttemptedAutoRedirect) {
            loadTenants();
        }
    }, [session, hasAttemptedAutoRedirect]);

    const handleSelect = async (tenantId: string) => {
        // Find the selected tenant to get its slug
        const selectedTenant = tenants.find((t: any) => t.id === tenantId);
        if (!selectedTenant) return;

        // Save for persistence
        localStorage.setItem("lastTenantSlug", selectedTenant.slug);

        // Trigger session update. 
        // Our jwt callback will verify this tenantId against the DB.
        await update({ tenantId });

        // Redirect to tenant-specific dashboard
        router.push(`/t/${selectedTenant.slug}/dashboard`);
        router.refresh();
    };

    if (loading) return <div className="flex justify-center p-10">Chargement des espaces de travail...</div>;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Sélectionner un Espace de Travail</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Choisissez l'organisation que vous souhaitez accéder.
                    </p>
                </div>

                <div className="space-y-3">
                    {tenants.map((tenant) => (
                        <button
                            key={tenant.id}
                            onClick={() => handleSelect(tenant.id)}
                            className="flex items-center justify-between w-full p-4 text-left transition-colors border rounded-lg hover:bg-gray-50 hover:border-blue-500 group"
                        >
                            <div>
                                <div className="font-medium text-gray-900 group-hover:text-blue-600">{tenant.name}</div>
                                <div className="text-xs text-gray-500 capitalize">{roleMap[tenant.role as keyof typeof roleMap] || tenant.role}</div>
                            </div>
                            <span className="text-gray-400 group-hover:text-blue-500">→</span>
                        </button>
                    ))}

                    {tenants.length === 0 && (
                        <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-dashed">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">
                                Aucune organisation
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Vous n'êtes membre d'aucune organisation. Créez-en une pour commencer.
                            </p>
                            <div className="mt-6">
                                <CreateOrgDialog
                                    trigger={
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Créer une organisation
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm text-gray-500 hover:underline"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
