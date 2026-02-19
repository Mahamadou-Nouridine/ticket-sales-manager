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

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 mb-4">Pas encore accès ?</p>
                <a
                    href={process.env.WAITLIST_URL}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                    Rejoindre la liste d'attente
                    <span aria-hidden="true">→</span>
                </a>
            </div>
        </>
    );
}
