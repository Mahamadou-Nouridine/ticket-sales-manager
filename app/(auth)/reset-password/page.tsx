import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
    return (
        <>
            <div className="text-center mb-8">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                    Nouveau mot de passe
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Choisissez un mot de passe sécurisé pour votre compte
                </p>
            </div>
            <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </>
    );
}
