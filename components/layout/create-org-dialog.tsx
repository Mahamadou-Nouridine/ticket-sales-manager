"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrganization } from "@/actions/tenants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useSession } from "next-auth/react";

export function CreateOrgDialog({ trigger, open: controlledOpen, onOpenChange }: { trigger?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { update: updateSession } = useSession();

    const generateSlug = (orgName: string) => {
        return orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await createOrganization({ name, slug });

            // Update session with new tenant
            await updateSession({ tenantId: result.tenantId });

            toast.success("Organisation créée !");
            setOpen(false);
            // Redirect to the new organization's dashboard
            router.push(`/t/${result.slug}/dashboard`);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer une Organisation</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nom de l&apos;organisation</label>
                        <Input
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setSlug(generateSlug(e.target.value));
                            }}
                            placeholder="Ex: Mon Entreprise"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Slug (URL)</label>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="mon-entreprise"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Utilisé dans l&apos;URL: /t/{slug || "slug"}/dashboard
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
