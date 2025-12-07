import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isSuperuser = token?.role === "superuser";
        const path = req.nextUrl.pathname;

        if (path.startsWith("/config/users") || path.startsWith("/reports")) {
            if (!isSuperuser) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
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
        "/dashboard/:path*",
        "/sales/:path*",
        "/config/:path*",
        "/reports/:path*",
        "/profile/:path*",
    ],
};
