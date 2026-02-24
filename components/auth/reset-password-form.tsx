"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/actions/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const userId = searchParams.get("id");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!token || !userId) {
            setError("Lien de réinitialisation invalide ou corrompu.");
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            setIsLoading(false);
            return;
        }

        try {
            const result = await resetPassword(userId, token, password);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(result.message || "Mot de passe réinitialisé !");
            }
        } catch (error) {
            setError("Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">C'est fait !</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
                </p>
                <Button asChild className="w-full">
                    <Link href="/login">Se connecter</Link>
                </Button>
            </div>
        );
    }

    if (!token || !userId) {
        return (
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                <p className="text-red-600 mb-6">
                    Le lien de réinitialisation est manquant ou invalide.
                </p>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/forgot-password">Faire une nouvelle demande</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={onSubmit}>
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Nouveau mot de passe
                    </label>
                    <div className="mt-1">
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Confirmer le nouveau mot de passe
                    </label>
                    <div className="mt-1">
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Réinitialiser le mot de passe
                    </Button>
                </div>
            </form>
        </div>
    );
}
