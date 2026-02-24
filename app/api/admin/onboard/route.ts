import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { onboardWaitlistUser } from "@/actions/admin";

const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET;

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        if (!ADMIN_API_SECRET) {
            console.error("ADMIN_API_SECRET is not defined");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        try {
            jwt.verify(token, ADMIN_API_SECRET);
        } catch (err) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { waitlistId } = body;

        if (!waitlistId) {
            return NextResponse.json({ error: "waitlistId is required" }, { status: 400 });
        }

        // 3. Perform Onboarding
        // We provide a system admin context for the audit log
        const result = await onboardWaitlistUser(waitlistId, {
            sendEmail: true,
            adminContext: {
                id: "system-api",
                name: "External API Service"
            }
        });

        console.log(result);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "User onboarded successfully",
                emailSent: result.emailSent
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
                details: result.details
            }, { status: 400 });
        }

    } catch (error) {
        console.error("API Onboarding Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
