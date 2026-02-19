import { getWaitlistEntries } from "@/actions/admin";
import { WaitlistTable } from "@/components/admin/waitlist-table";
import { Users } from "lucide-react";

export default async function AdminWaitlistPage() {
    const entries = await getWaitlistEntries();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-500" />
                        Liste d'attente
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Gérez les inscriptions et transférez-les vers la plateforme Vendora.
                    </p>
                </div>
            </div>

            <WaitlistTable initialEntries={JSON.parse(JSON.stringify(entries))} />
        </div>
    );
}
