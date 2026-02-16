"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Sync the session tenantId with the current URL slug.
 */
export function SessionSync({ id }: { id: string }) {
    const { data: session, update } = useSession();
    const isUpdating = useRef(false);

    useEffect(() => {
        if (session && (session.user as any).tenantId !== id && !isUpdating.current) {
            console.log("SessionSync - Syncing session tenant to:", id);
            isUpdating.current = true;
            update({ tenantId: id }).finally(() => {
                isUpdating.current = false;
            });
        }
    }, [id, session, update]);

    return null;
}
