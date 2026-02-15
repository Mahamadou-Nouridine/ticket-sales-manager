"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateMyPassword } from "@/actions/users";
import { Loader2 } from "lucide-react";

export function PasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("Les nouveaux mots de passe ne correspondent pas");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Le nouveau mot de passe doit faire au moins 6 caractères");
            return;
        }

        setIsLoading(true);

        try {
            await updateMyPassword(currentPassword, newPassword);
            toast.success("Mot de passe mis à jour avec succès");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="current_password">Mot de passe actuel</Label>
                <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new_password">Nouveau mot de passe</Label>
                <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
                <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>

            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Changer le mot de passe
            </Button>
        </form>
    );
}
