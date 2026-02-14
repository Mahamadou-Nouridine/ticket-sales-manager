import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import connectToDatabase from "@/lib/db";
import { User, Membership } from "@/lib/models";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 30 * 60, // 30 minutes
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                tenantId: { label: "Tenant ID", type: "text", optional: true }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    await connectToDatabase();
                    // Supports legacy username or email
                    const user = await User.findOne({
                        $or: [{ email: credentials.email }, { username: credentials.email }]
                    });

                    if (!user || !user.active) {
                        return null;
                    }

                    const isValid = await compare(credentials.password, user.password_hash);
                    if (!isValid) {
                        return null;
                    }

                    // Load memberships
                    const memberships = await Membership.find({ userId: user.id || user._id, active: true }).lean();

                    let selectedTenantId = credentials.tenantId;

                    // Auto-select if only one membership and no specific tenant requested
                    if (!selectedTenantId && memberships.length === 1) {
                        selectedTenantId = memberships[0].tenantId;
                    }

                    let role = "user"; // Default
                    let tenantSlug: string | undefined = undefined;

                    // Verify the selected tenant is valid for this user
                    if (selectedTenantId) {
                        const membership = memberships.find((m: any) => m.tenantId === selectedTenantId);
                        if (!membership) {
                            // If invalid tenant requested, fallback to none
                            selectedTenantId = undefined;
                        } else {
                            role = membership.role;
                            // Fetch tenant to get slug
                            const { Tenant } = await import("@/lib/models");
                            const tenant = await Tenant.findOne({ id: selectedTenantId }).lean();
                            tenantSlug = tenant?.slug || undefined;
                        }
                    }

                    return {
                        id: user.id || user._id.toString(),
                        name: user.full_name,
                        email: user.email || user.username,
                        tenantId: selectedTenantId,
                        tenantSlug: tenantSlug,
                        role: role,
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.tenantId = (user as any).tenantId;
                token.tenantSlug = (user as any).tenantSlug;
                token.role = (user as any).role;
            }
            // Support updating tenantId via session update
            if (trigger === "update" && session?.tenantId) {
                // Verify the user is a member of this tenant
                try {
                    await connectToDatabase();
                    const membership = await Membership.findOne({
                        userId: token.id,
                        tenantId: session.tenantId,
                        active: true
                    });

                    if (membership) {
                        token.tenantId = session.tenantId;
                        token.role = membership.role;
                        // Fetch tenant slug
                        const { Tenant } = await import("@/lib/models");
                        const tenant = await Tenant.findOne({ id: session.tenantId }).lean();
                        token.tenantSlug = tenant?.slug;
                    }
                    // If invalid, we simply don't update
                } catch (e) {
                    // Ignore error, don't update
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).tenantId = token.tenantId;
                (session.user as any).tenantSlug = token.tenantSlug;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
};
