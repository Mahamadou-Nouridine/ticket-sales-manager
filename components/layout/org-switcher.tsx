"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CreateOrgDialog } from "./create-org-dialog";
import { useSession } from "next-auth/react";

interface Organization {
    id: string;
    name: string;
    slug: string;
    role: string;
}

interface OrgSwitcherProps {
    organizations: Organization[];
    currentSlug: string;
    currentName: string;
}

export function OrgSwitcher({ organizations, currentSlug, currentName }: OrgSwitcherProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { update } = useSession();
    const [switching, setSwitching] = useState(false);

    const handleSwitch = async (org: Organization) => {
        if (org.slug === currentSlug) return;

        setSwitching(true);
        try {
            // Update session with new tenant
            await update({ tenantId: org.id });

            // Navigate to new tenant dashboard
            router.push(`/t/${org.slug}/dashboard`);
            router.refresh();
        } catch (error) {
            console.error("Failed to switch organization:", error);
        } finally {
            setSwitching(false);
        }
    };


    return (
        <div className="px-3 py-2">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between gap-3 px-3 py-6 bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 group transition-all"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/40 shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col items-start overflow-hidden">
                                <span className="font-semibold text-white truncate text-sm">
                                    {currentName}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    Organisation
                                </span>
                            </div>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-gray-500 group-hover:text-gray-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white" align="start">
                    <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider p-2">
                        Vos organisations
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <div className="max-h-[300px] overflow-y-auto">
                        {organizations.map((org) => (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => handleSwitch(org)}
                                className={cn(
                                    "flex items-center justify-between gap-2 p-2 focus:bg-gray-700 focus:text-white cursor-pointer",
                                    org.slug === currentSlug ? "bg-gray-700/50" : ""
                                )}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="h-6 w-6 rounded bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {org.name.charAt(0)}
                                    </div>
                                    <span className="truncate text-sm">{org.name}</span>
                                </div>
                                {org.slug === currentSlug && (
                                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </div>
                    {organizations.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                            Aucune autre organisation
                        </div>
                    )}
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 p-2 cursor-pointer focus:bg-blue-600 focus:text-white text-blue-400 font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Créer une organisation</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateOrgDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}
