import { getMyInvitations } from "@/actions/invitations";
import { InvitationsList } from "@/components/account/invitations-list";

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
