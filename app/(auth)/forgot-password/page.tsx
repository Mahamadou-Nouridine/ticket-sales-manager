import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <>
            <div className="text-center mb-8">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                    Mot de passe oublié
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Saisissez votre email pour recevoir un lien de réinitialisation
                </p>
            </div>
            <ForgotPasswordForm />
        </>
    );
}
