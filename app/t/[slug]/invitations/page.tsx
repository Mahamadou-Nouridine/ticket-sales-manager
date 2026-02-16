import { getMyInvitations } from "@/actions/invitations";
import { InvitationsList } from "@/components/account/invitations-list";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Invitations",
    description: "Gérez vos invitations d'organisation",
};

export default async function InvitationsPage() {
    const invitations = await getMyInvitations();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Invitations</h1>
                <p className="text-muted-foreground">
                    Gérez vos invitations à rejoindre des organisations
                </p>
            </div>
            <InvitationsList invitations={invitations} />
        </div>
    );
}
