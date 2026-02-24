"use server";

import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "@/lib/mail";
import { revalidatePath } from "next/cache";

const SECRET = process.env.NEXTAUTH_SECRET || "default_reset_secret";

/**
 * Request a password reset email
 */
export async function requestPasswordReset(email: string) {
    if (!email) return { error: "L'email est requis" };

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        // Return success even if user not found to prevent email enumeration
        return { success: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." };
    }

    // Create a one-time use token by signing with the current password hash
    const tokenSecret = SECRET + user.password_hash;
    const token = jwt.sign({ id: user.id, email: user.email }, tokenSecret, { expiresIn: "1h" });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&id=${user.id}`;

    const mailOptions = {
        from: process.env.MAIL_SENDER,
        to: user.email,
        subject: "Réinitialisation de votre mot de passe - Vendora",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
                <p>Bonjour ${user.first_name},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Vendora.</p>
                <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant 1 heure.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
                </div>
                <p style="color: #666; font-size: 14px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe restera inchangé.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">Ceci est un message automatique, merci de ne pas y répondre.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." };
    } catch (error) {
        console.error("Email send error:", error);
        return { error: "Erreur lors de l'envoi de l'email" };
    }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(userId: string, token: string, newPassword: string) {
    if (!userId || !token || !newPassword) {
        return { error: "Données manquantes" };
    }

    await connectToDatabase();
    const user = await User.findOne({ id: userId });

    if (!user) {
        return { error: "Utilisateur introuvable" };
    }

    // Verify token using the same secret (combined with hash)
    try {
        const tokenSecret = SECRET + user.password_hash;
        jwt.verify(token, tokenSecret);
    } catch (error) {
        return { error: "Lien invalide ou expiré. Veuillez refaire une demande." };
    }

    // Hash and update password
    const hashedPassword = await hash(newPassword, 10);
    user.password_hash = hashedPassword;
    await user.save();

    return { success: true, message: "Votre mot de passe a été réinitialisé avec succès." };
}
