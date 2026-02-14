import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Helper to revalidate tenant-scoped paths
 * @param paths - Array of paths relative to tenant root (e.g., "/sales", "/dashboard")
 */
export async function revalidateTenantPaths(paths: string[]) {
    const session = await getServerSession(authOptions);
    const tenantSlug = (session?.user as any)?.tenantSlug;

    if (!tenantSlug) {
        console.warn("No tenantSlug in session, skipping tenant path revalidation");
        return;
    }

    for (const path of paths) {
        const tenantPath = `/t/${tenantSlug}${path}`;
        revalidatePath(tenantPath);
    }
}
