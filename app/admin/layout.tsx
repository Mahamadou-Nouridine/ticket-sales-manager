"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    History,
    Settings,
    Shield,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { label: "Tableau de Bord", icon: LayoutDashboard, href: "/admin" },
        { label: "Organisations", icon: Building2, href: "/admin/tenants" },
        { label: "Utilisateurs", icon: Users, href: "/admin/users" },
        { label: "Logs d'activité", icon: History, href: "/admin/logs" },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 border-b">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Shield className="w-6 h-6" />
                        <span>Vendora Admin</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                pathname === item.href
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t space-y-2">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-600"
                        asChild
                    >
                        <Link href="/select-tenant">
                            <Building2 className="w-4 h-4 mr-2" />
                            Espaces de Travail
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
