"use client";

import { acceptInvitation, declineInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface InvitationData {
    id: string;
    tenantId: string;
    tenantName: string;
    inviterName: string;
    role: 'manager' | 'seller';
    created_at: string;
}

interface InvitationsListProps {
    invitations: InvitationData[];
}

export function InvitationsList({ invitations }: InvitationsListProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    async function handleAccept(id: string) {
        setLoading({ ...loading, [id]: true });
        try {
            await acceptInvitation(id);
            toast.success("Invitation acceptée");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'acceptation");
        } finally {
            setLoading({ ...loading, [id]: false });
        }
    }

    async function handleDecline(id: string) {
        setLoading({ ...loading, [id]: true });
        try {
            await declineInvitation(id);
            toast.success("Invitation refusée");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors du refus");
        } finally {
            setLoading({ ...loading, [id]: false });
        }
    }

    if (invitations.length === 0) {
        return (
            <Card className="p-8 text-center text-muted-foreground">
                Aucune invitation en attente
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {invitations.map((inv) => (
                <Card key={inv.id} className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex gap-4 flex-1 min-w-0">
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate">{inv.tenantName}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    <strong>{inv.inviterName}</strong> vous invite à rejoindre
                                    cette organisation en tant que{" "}
                                    <strong className="text-blue-600">
                                        {inv.role === 'manager' ? 'Manager' : 'Vendeur'}
                                    </strong>
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Invité le {new Date(inv.created_at).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button
                                size="sm"
                                onClick={() => handleAccept(inv.id)}
                                disabled={loading[inv.id]}
                            >
                                {loading[inv.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Accepter
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecline(inv.id)}
                                disabled={loading[inv.id]}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Refuser
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
