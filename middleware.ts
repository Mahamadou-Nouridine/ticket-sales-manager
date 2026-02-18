import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const role = token?.role;
        const isAdmin = !!token?.isAdmin;
        const path = req.nextUrl.pathname;

        // 0. Force password setup if missing
        if (token?.needsPasswordSetup && path !== "/setup-password" && path !== "/login") {
            const uid = token.id;
            return NextResponse.redirect(new URL(`/setup-password?uid=${uid}`, req.url));
        }

        // 1. Force tenant selection if no tenant in token (Admins can bypass this for /admin routes)
        if (!token?.tenantId && !path.startsWith("/select-tenant") && path !== "/login" && path !== "/setup-password") {
            if (isAdmin && path.startsWith("/admin")) {
                // Let admin through to global admin area
            } else {
                return NextResponse.redirect(new URL("/select-tenant", req.url));
            }
        }

        // 2. Redirect to tenant dashboard if at root or generic dashboard
        if (path === "/" || path === "/dashboard") {
            // Priority: if admin and no tenant selected, go to /admin
            if (isAdmin && !token?.tenantId) {
                return NextResponse.redirect(new URL("/admin", req.url));
            }

            const tenantSlug = (token as any).tenantSlug;
            if (!tenantSlug) {
                // If no slug in token, redirect to tenant selection
                return NextResponse.redirect(new URL("/select-tenant", req.url));
            }
            return NextResponse.redirect(new URL(`/t/${tenantSlug}/dashboard`, req.url));
        }

        // 3. Admin Area Protection
        if (path.startsWith("/admin")) {
            if (!isAdmin) {
                // If not admin, send to their tenant dashboard if they have one
                const slug = (token as any).tenantSlug;
                return NextResponse.redirect(new URL(slug ? `/t/${slug}/dashboard` : "/select-tenant", req.url));
            }
        }

        // 4. Validate access to tenant path
        // path is like /t/[slug]/...
        const match = path.match(/^\/t\/([^\/]+)/);
        if (match) {
            // admins can access any tenant path for now? 
            // the user said: "If he has a tenant or part of a tenant, he will have his manager/seller role"
            // this implies that if they ARE in a tenant path, we should check their membership
            // but middleware is mostly for basic redirection.
        }

        // Configuration and sensitive areas: Manager only
        const managerPathPrefixes = ["/config", "/reports", "/admin", "/inventory"];
        // Wait, "/admin" is the global admin area now. 
        // We'll separate tenant-specific admin from global admin.
        // Paths under /t/[slug]/admin are tenant-specific.

        if (managerPathPrefixes.some(p => path.includes(p)) && !path.startsWith("/admin")) {
            if (role !== "manager" && role !== "owner" && !isAdmin) {
                return NextResponse.redirect(new URL(`/t/${(token as any).tenantSlug}/dashboard`, req.url));
            }
        }

        // Account page: All authenticated users
        if (path.includes("/account")) {
            // Already authenticated via withAuth, no additional checks needed
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/",
        "/dashboard", // Legacy redirect
        "/t/:path*",
        "/sales/:path*", // Legacy?
        "/config/:path*", // Legacy?
        "/reports/:path*", // Legacy?
        "/profile/:path*",
        "/setup-password",
        "/admin/:path*",
    ],
};
