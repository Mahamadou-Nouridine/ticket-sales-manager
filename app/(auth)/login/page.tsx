import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    return (
        <>
            <div className="text-center mb-8">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                    Gestion des Commandes de Tickets
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Connectez-vous pour accéder au tableau de bord
                </p>
            </div>
            <LoginForm />
        </>
    );
}
