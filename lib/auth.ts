import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { readSheet } from "@/lib/google-sheets";
import { User } from "@/lib/types";

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
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                try {
                    const rows = await readSheet("Users");



                    const users = rows.slice(1).map((row) => ({
                        id: row[0],
                        username: row[1],
                        password_hash: row[2],
                        role: row[3] as "superuser" | "user",
                        full_name: row[4],
                        active: String(row[5]).toUpperCase() === "TRUE",
                        created_at: row[6],
                        last_login: row[7],
                    }));



                    const user = users.find((u) => u.username === credentials.username);

                    if (!user) {

                        return null;
                    }

                    if (!user.active) {

                        return null;
                    }

                    const isValid = await compare(credentials.password, user.password_hash);


                    if (!isValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        name: user.full_name,
                        email: user.username,
                        role: user.role,
                    };
                } catch (error) {

                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = (user as any).id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
};
