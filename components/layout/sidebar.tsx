"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Ticket,
    Users,
    Settings,
    FileText,
    LogOut,
    UserCircle,
    Menu,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
    onNavigate?: () => void;
}

function SidebarContent({ className, onNavigate }: SidebarContentProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isSuperuser = (session?.user as any)?.role === "superuser";

    const navigation = [
        { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
        { name: "Ventes", href: "/sales", icon: Ticket },
        ...(isSuperuser
            ? [{ name: "Rapports", href: "/reports", icon: FileText }]
            : []),
    ];

    const configNavigation = [
        { name: "Types de Tickets", href: "/config/ticket-types" },
        { name: "Vendeurs", href: "/config/salesmen" },
        ...(isSuperuser ? [{ name: "Utilisateurs", href: "/config/users" }] : []),
        ...(isSuperuser ? [{ name: "Logs d'Activité", href: "/admin/logs" }] : []),
    ];

    return (
        <div className={cn("flex h-full flex-col bg-gray-900 text-white", className)}>
            <div className="flex h-16 items-center justify-center border-b border-gray-800">
                <h1 className="text-xl font-bold">Ticket Manager</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                    "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                                    isActive
                                        ? "bg-gray-800 text-white"
                                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-6 w-6 flex-shrink-0",
                                        isActive ? "text-white" : "text-gray-400 group-hover:text-gray-300"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="mt-8">
                        <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Configuration
                        </h3>
                        <div className="mt-1 space-y-1">
                            {configNavigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                                            isActive
                                                ? "bg-gray-800 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                        )}
                                    >
                                        <Settings
                                            className={cn(
                                                "mr-3 h-6 w-6 flex-shrink-0",
                                                isActive ? "text-white" : "text-gray-400 group-hover:text-gray-300"
                                            )}
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>
            </div>
            <div className="border-t border-gray-800 p-4">
                <div className="flex items-center">
                    <UserCircle className="h-8 w-8 text-gray-400" />
                    <div className="ml-3">
                        <p className="text-sm font-medium text-white">
                            {session?.user?.name || "Utilisateur"}
                        </p>
                        <p className="text-xs text-gray-400">
                            {(session?.user as any)?.role === "superuser"
                                ? "Administrateur"
                                : "Utilisateur"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="mt-4 flex w-full items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                </button>
            </div>
        </div>
    );
}

export function Sidebar() {
    return (
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
            <SidebarContent />
        </div>
    );
}

export function MobileSidebar() {
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
                <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}
