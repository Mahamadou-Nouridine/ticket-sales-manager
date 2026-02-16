"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "@/actions/tenants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface CreateOrgDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const { update } = useSession();

    // Auto-generate slug from name
    useEffect(() => {
        if (name) {
            setSlug(name.toLowerCase().replace(/[^a-z0-0]/g, '-').replace(/-+/g, '-'));
        }
    }, [name]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createOrganization({ name, slug });
            toast.success("Organisation créée !");
            await update({ tenantId: result.tenantId });
            onOpenChange(false);
            // Redirect to the new organization's dashboard
            router.push(`/t/${result.slug}/dashboard`);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer une nouvelle organisation</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de l&apos;organisation</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Ma Super Boutique"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">URL de l&apos;organisation (Slug)</Label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-sm font-medium">/t/</span>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                placeholder="ma-boutique"
                                required
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Ceci sera l&apos;adresse unique de votre organisation.
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer l&apos;organisation
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
