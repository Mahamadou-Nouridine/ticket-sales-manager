import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { SessionSync } from "@/components/layout/session-sync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/db";
import { Tenant, Membership } from "@/lib/models";
import { getUserOrganizations } from "@/actions/tenants";

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

    const tenant = await Tenant.findOne({ slug, active: true }).lean();
    const tenantName = tenant?.name || "Organisation";
    const organizations = await getUserOrganizations();

    return (
        <div className="flex min-h-[100dvh] bg-background">
            <SessionSync id={tenant.id} />
            <Sidebar slug={slug} tenantId={tenant.id} tenantName={tenantName} organizations={organizations} />
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 min-w-0 overflow-x-hidden max-w-full">
                <header className="flex h-16 items-center gap-4 border-b bg-background px-6 md:hidden sticky top-0 z-10">
                    <MobileSidebar slug={slug} tenantId={tenant.id} tenantName={tenantName} organizations={organizations} />
                    <div className="font-semibold">Vendora</div>
                </header>
                <main className="flex-1 p-4 md:p-8 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    );
}
