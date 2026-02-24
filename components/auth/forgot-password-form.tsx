"use client";

import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/actions/auth";
import Link from "next/link";

export function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;

        try {
            const result = await requestPasswordReset(email);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(result.message || "Email envoyé !");
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
                <div className="mb-4 text-green-600 font-medium">
                    {success}
                </div>
                <p className="text-sm text-gray-500 mb-6">
                    Veuillez vérifier votre boîte de réception et vos indésirables.
                </p>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour à la connexion
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={onSubmit}>
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Votre adresse email
                    </label>
                    <div className="mt-1">
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="exemple@email.com"
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
                        Envoyer le lien de réinitialisation
                    </Button>
                </div>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </form>
        </div>
    );
}
