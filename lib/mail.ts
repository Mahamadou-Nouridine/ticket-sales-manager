import nodemailer from "nodemailer";

const { MAILER_PASS, MAIL_SENDER, MAIL_SERVICE } = process.env;

const transporter = nodemailer.createTransport({
    service: MAIL_SERVICE,
    auth: {
        user: MAIL_SENDER,
        pass: MAILER_PASS,
    },
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
});

export async function sendSaleSubmissionNotification(
    emails: string[],
    data: {
        sellerName: string;
        amount: number;
        currency: string;
        receiptId: string;
        tenantName: string;
        dashboardUrl: string;
    }
) {
    if (!emails || emails.length === 0) return;

    const mailOptions = {
        from: process.env.MAIL_SENDER,
        to: emails.join(", "),
        subject: `[Vente Soumise] Nouvelle vente à valider - ${data.tenantName}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
                <div style="background-color: #2563eb; padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Nouvelle Vente Soumise</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Bonjour,</p>
                    <p style="font-size: 16px; margin-bottom: 24px;">Un vendeur vient de soumettre un nouveau reçu de paiement pour validation.</p>
                    
                    <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 30px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Vendeur:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${data.sellerName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Montant:</td>
                                <td style="padding: 8px 0; color: #059669; font-weight: 700; text-align: right; font-size: 18px;">${data.amount} ${data.currency}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ID Reçu:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-family: monospace; text-align: right;">${data.receiptId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organisation:</td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${data.tenantName}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${data.dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">Voir et Valider sur le Tableau de Bord</a>
                    </div>

                    <p style="font-size: 14px; color: #64748b; margin-top: 40px; text-align: center;">
                        Ceci est une notification automatique de votre instance Vendora.
                    </p>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; 2026 Vendora. Tous droits réservés.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent to: ${emails.join(", ")}`);
        return { success: true };
    } catch (error) {
        console.error("Error sending notification email:", error);
        return { success: false, error };
    }
}

export default transporter;
