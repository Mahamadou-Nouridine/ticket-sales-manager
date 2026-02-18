"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Ticket,
    FileText,
    LogOut,
    UserCircle,
    Menu,
    Warehouse,
    Mail,
    Shield
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { OrgSwitcher } from "./org-switcher";
import { getPendingInvitationsCount } from "@/actions/invitation_counts";

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
    onNavigate?: () => void;
    tenantName?: string;
    tenantId?: string;
    organizations?: any[];
}

function SidebarContent({ className, onNavigate, slug, tenantId, tenantName, organizations = [] }: SidebarContentProps & { slug: string }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const isManager = role === "manager";

    const [pendingInvitesDetails, setPendingInvitesDetails] = useState<number>(0);

    // This effect should fetch the pending count. 
    // Since this is a client component, we need to call a server action or API.
    // Creating action in 'actions/invitation_counts.ts' was step 1.
    // Now I need to import it.
    // Wait, importing server action in client component works in Next.js.

    // However, SidebarContent is a functional component.
    // I need to use useEffect to fetch the count or pass it as a prop from server component wrapper.
    // The wrapper `Sidebar` is a client component too? "use client" is at top of file.

    // Let's modify the `Sidebar` wrapper (which is imported in layout) to be a Server Component?
    // No, `Sidebar` exports `SidebarContent` which uses hooks (usePathname).
    // The file has "use client".
    // So entire file is client.

    // I can fetch data in useEffect.

    useEffect(() => {
        if (!tenantId) return;
        getPendingInvitationsCount().then(setPendingInvitesDetails).catch(console.error);
    }, [tenantId]);

    const navigation = [
        { name: "Tableau de bord", href: `/t/${slug}/dashboard`, icon: LayoutDashboard },
        { name: "Commandes", href: `/t/${slug}/sales`, icon: Ticket },
        {
            name: "Invitations",
            href: `/t/${slug}/invitations`,
            icon: Mail,
            badge: pendingInvitesDetails > 0 ? pendingInvitesDetails : undefined
        },
        ...(isManager
            ? [
                { name: "Inventaire", href: `/t/${slug}/inventory`, icon: Warehouse },
                { name: "Rapports", href: `/t/${slug}/reports`, icon: FileText }
            ]
            : []),
    ];

    const configNavigation = [
        ...(isManager ? [{ name: "Types de Tickets", href: `/t/${slug}/config/ticket-types` }] : []),
        ...(isManager ? [{ name: "Vendeurs", href: `/t/${slug}/config/salesmen` }] : []),
        ...(isManager ? [{ name: "Utilisateurs", href: `/t/${slug}/config/users` }] : []),
        ...(isManager ? [{ name: "Logs d'Activité", href: `/t/${slug}/admin/logs` }] : []),
    ];

    return (
        <div className={cn("flex h-full flex-col bg-gray-900 text-white", className)}>
            <div className="flex flex-col border-b border-gray-800 py-1">
                <div className="px-6 py-4 flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-sm">V</div>
                    <h1 className="text-lg font-bold tracking-tight text-white">Vendora</h1>
                </div>
                <OrgSwitcher
                    organizations={organizations}
                    currentSlug={slug}
                    currentName={tenantName || "Organisation"}
                />
            </div>
            <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1.5 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                    "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                                    )}
                                />
                                {item.name}
                                {(item as any).badge && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                                        {(item as any).badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {isManager && (
                    <>
                        <div className="mt-10 px-3">
                            <h3 className="px-3 text-[10px] font-bold uppercase tracking-[2px] text-gray-500">
                                Configuration
                            </h3>
                        </div>
                        <nav className="mt-3 space-y-1 px-3">
                            {configNavigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-gray-800 text-white"
                                                : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "mr-3 h-1.5 w-1.5 rounded-full",
                                            isActive ? "bg-blue-500" : "bg-gray-600 group-hover:bg-gray-400"
                                        )} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </>
                )}

                {(session?.user as any)?.isAdmin && (
                    <>
                        <div className="mt-10 px-3">
                            <h3 className="px-3 text-[10px] font-bold uppercase tracking-[2px] text-gray-500">
                                Administration
                            </h3>
                        </div>
                        <nav className="mt-3 space-y-1 px-3">
                            <Link
                                href="/admin"
                                className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all text-purple-400 hover:bg-purple-900/20"
                            >
                                <Shield className="mr-3 h-4 w-4" />
                                Admin Global
                            </Link>
                        </nav>
                    </>
                )}
            </div>

            <div className="border-t border-gray-800 p-4">
                <Link
                    href={`/t/${slug}/account`}
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center p-2 rounded-xl transition-all hover:bg-gray-800 group",
                        pathname === `/t/${slug}/account` ? "bg-gray-800" : ""
                    )}
                >
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:border-blue-500/50 transition-all">
                        <UserCircle className="h-6 w-6" />
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate leading-tight">
                            {session?.user?.name || "Utilisateur"}
                        </p>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                            {(session?.user as any)?.role || "Utilisateur"}
                        </p>
                    </div>
                </Link>

                <button
                    onClick={() => signOut()}
                    className="mt-4 flex w-full items-center justify-center rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all border border-transparent hover:border-red-900/50"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                </button>
            </div>
        </div >
    );
}

export function Sidebar({ slug, tenantId, tenantName, organizations }: { slug: string; tenantId: string; tenantName?: string; organizations?: any[] }) {
    return (
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 shadow-2xl z-20">
            <SidebarContent slug={slug} tenantId={tenantId} tenantName={tenantName} organizations={organizations} />
        </div>
    );
}

export function MobileSidebar({ slug, tenantId, tenantName, organizations }: { slug: string; tenantId: string; tenantName?: string; organizations?: any[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-gray-900 border-r-gray-800">
                <SheetTitle className="sr-only">Vendora Menu</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} slug={slug} tenantId={tenantId} tenantName={tenantName} organizations={organizations} />
            </SheetContent>
        </Sheet>
    );
}
