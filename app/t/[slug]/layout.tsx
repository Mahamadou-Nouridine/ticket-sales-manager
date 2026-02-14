import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db";
import { Tenant, Membership } from "@/lib/models";

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    // Validate that the user has access to this tenant
    if (session?.user) {
        await connectToDatabase();
        const userId = (session.user as any).id;

        // Find tenant by slug
        const tenant = await Tenant.findOne({ slug, active: true }).lean();

        if (!tenant) {
            // Tenant doesn't exist or is inactive
            redirect("/select-tenant");
        }

        // Check if user is a member of this tenant
        const membership = await Membership.findOne({
            userId,
            tenantId: tenant.id,
            active: true
        }).lean();

        if (!membership) {
            // User doesn't have access to this tenant
            redirect("/select-tenant");
        }
    }

    return (
        <div className="flex h-screen bg-muted/40">
            <Sidebar slug={slug} />
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
                    <MobileSidebar slug={slug} />
                    <div className="font-semibold">Ticket Manager</div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
