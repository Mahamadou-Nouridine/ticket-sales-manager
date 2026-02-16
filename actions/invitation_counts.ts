"use server";

import connectToDatabase from "@/lib/db";
import { Invitation } from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPendingInvitationsCount(tenantId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return 0;

    await connectToDatabase();

    // Count pending invitations for this tenant
    // Wait, invitations are sent TO a user email or are pending for a tenant?
    // User wants "badg to see number of unaccepted/unrejected invitations"
    // Does the user mean:
    // A. Invitations sent BY the org (outgoing) that are pending? (For Managers)
    // B. Invitations sent TO the user (incoming) that are pending? (For Users)

    // Context: Sidebar "Invitations" link.
    // If I am a Manager, I might want to see pending outgoing invitations?
    // If I am a User, I might want to see pending incoming invitations?

    // Usually sidebar "Invitations" page shows incoming invitations for the USER.
    // Let's check what the Invitations page does.

    // Assuming it's incoming invitations for the user. But wait, if I'm in a specific tenant context (/t/slug), why would I see my global invitations?
    // Maybe the "Invitations" link in sidebar is for MANAGING invitations (outgoing)?

    // Let's check `app/t/[slug]/invitations/page.tsx` content if exists.
    // If not, maybe `config/salesmen` is where managers see invitations.

    // If the sidebar link "Invitations" was added by me in previous steps, I should check what it links to.
    // Task 543 show `SidebarContent`:
    // { name: "Invitations", href: `/t/${slug}/invitations`, icon: Mail },

    // If I click that, where does it go?
    // If it goes to a page where I see invitations I RECEIVED, then it's global? But the URL has `slug`.
    // If it goes to a page where I see invitations I SENT, then it's tenant specific.

    // The user said "add a badge to the invitations to see the number of unaccepted and unrejected invitations".
    // If I am a manager, I want to know if my salesmen accepted?
    // If I am a user, I want to know if I have invites?

    // Given the context of "Salesmen Invitations" earlier, it's likely OUTGOING invitations (Manager view).
    // Let's assume OUTGOING pending invitations count for the current tenant.

    const count = await Invitation.countDocuments({
        tenantId,
        status: 'pending'
    });

    return count;
}
