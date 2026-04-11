"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { requireTenantAccess } from "@/lib/tenant";
import { SalePayment, Sale, AuditLog, Tenant, User } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import { revalidateTenantPaths } from "@/lib/revalidate";
import { sendSaleSubmissionNotification } from "@/lib/mail";

/**
 * Submit a payment receipt for a sale (Seller only)
 */
export async function submitPayment(
    saleId: string,
    receiptId: string,
    amount: number,
    notes?: string
) {
    const { tenantId, userId, user } = await requireTenantAccess();

    // Only sellers can submit payments
    if (user.role !== "seller") {
        throw new Error("Only sellers can submit payment receipts");
    }

    await connectToDatabase();

    // Verify the sale exists and belongs to this seller
    const sale = await Sale.findOne({ id: saleId, tenantId, seller_id: userId }).lean();
    if (!sale) {
        throw new Error("Sale not found or you don't have permission");
    }

    // Check if payment already exists for this sale
    const existingPayment = await SalePayment.findOne({ sale_id: saleId, tenantId });

    if (existingPayment) {
        if (existingPayment.status === "approved") {
            throw new Error("Payment already approved for this sale");
        }

        // Update existing payment
        existingPayment.receipt_id = receiptId;
        existingPayment.amount = amount;
        existingPayment.notes = notes;
        existingPayment.status = "pending";
        existingPayment.submitted_at = new Date().toISOString();
        await existingPayment.save();

        await AuditLog.create({
            id: uuidv4(),
            tenantId,
            user_id: userId,
            action: "UPDATE",
            entity_type: "PAYMENT",
            entity_id: existingPayment.id,
            details: `Payment updated for sale ${saleId}: ${receiptId} - ${amount}€`,
            timestamp: new Date().toISOString(),
        });

        await revalidateTenantPaths(["/sales"]);

        // Send Notification to Managers
        const tenant = await Tenant.findOne({ id: tenantId }).lean();
        if (tenant) {
            let recipientEmails = tenant.notificationEmails || [];

            // Fallback to owner email if list is empty
            if (recipientEmails.length === 0 && tenant.ownerId) {
                const owner = await User.findOne({ id: tenant.ownerId }).select('email').lean();
                if (owner?.email) {
                    recipientEmails = [owner.email];
                }
            }

            if (recipientEmails.length > 0) {
                const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
                const sellerName = user.full_name || user.username || user.email;
                
                // Fire and forget email
                sendSaleSubmissionNotification(recipientEmails, {
                    sellerName,
                    amount,
                    currency: tenant.currency || 'FCFA',
                    receiptId,
                    tenantName: tenant.name,
                    dashboardUrl: `${baseUrl}/t/${tenant.slug}/dashboard`
                }).catch(err => console.error("Async email notification failed:", err));
            }
        }

        return { success: true, paymentId: existingPayment.id };
    }

    // Create new payment submission
    const paymentId = uuidv4();
    await SalePayment.create({
        id: paymentId,
        tenantId,
        sale_id: saleId,
        seller_id: userId,
        receipt_id: receiptId,
        amount,
        submitted_at: new Date().toISOString(),
        status: "pending",
        notes,
    });

    // Create audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "CREATE",
        entity_type: "PAYMENT",
        entity_id: paymentId,
        details: `Payment submitted for sale ${saleId}: ${receiptId} - ${amount}€`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales"]);

    // Send Notification to Managers
    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    if (tenant) {
        let recipientEmails = tenant.notificationEmails || [];

        // Fallback to owner email if list is empty
        if (recipientEmails.length === 0 && tenant.ownerId) {
            const owner = await User.findOne({ id: tenant.ownerId }).select('email').lean();
            if (owner?.email) {
                recipientEmails = [owner.email];
            }
        }

        if (recipientEmails.length > 0) {
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const sellerName = user.full_name || user.username || user.email;
            
            // Fire and forget email
            sendSaleSubmissionNotification(recipientEmails, {
                sellerName,
                amount,
                currency: tenant.currency || 'FCFA',
                receiptId,
                tenantName: tenant.name,
                dashboardUrl: `${baseUrl}/t/${tenant.slug}/dashboard`
            }).catch(err => console.error("Async email notification failed:", err));
        }
    }

    return { success: true, paymentId };
}

/**
 * Get payment submission for a specific sale
 */
export async function getPaymentForSale(saleId: string) {
    const { tenantId } = await requireTenantAccess();
    await connectToDatabase();

    const payment = await SalePayment.findOne({ sale_id: saleId, tenantId }).lean();

    if (!payment) return null;

    return {
        ...payment,
        _id: payment._id.toString(),
    };
}

/**
 * Approve a payment submission (Manager only)
 */
export async function approvePayment(paymentId: string) {
    const { tenantId, userId, user } = await requireTenantAccess();

    // Only managers can approve payments
    if (user.role !== "manager") {
        throw new Error("Only managers can approve payments");
    }

    await connectToDatabase();

    const payment = await SalePayment.findOne({ id: paymentId, tenantId });
    if (!payment) {
        throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
        throw new Error(`Payment already ${payment.status}`);
    }

    // Update payment status
    payment.status = "approved";
    payment.approved_by = userId;
    payment.approved_at = new Date().toISOString();
    await payment.save();

    // Update the sale to mark as paid
    const sale = await Sale.findOne({ id: payment.sale_id, tenantId });
    if (sale) {
        sale.verse = true;
        sale.date_de_versement = new Date().toISOString();
        sale.invoice_number = payment.receipt_id;
        await sale.save();
    }

    // Create audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "APPROVE",
        entity_type: "PAYMENT",
        entity_id: paymentId,
        details: `Payment approved: ${payment.receipt_id} - ${payment.amount}€`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales"]);

    return { success: true };
}

/**
 * Reject a payment submission (Manager only)
 */
export async function rejectPayment(paymentId: string, reason: string) {
    const { tenantId, userId, user } = await requireTenantAccess();

    // Only managers can reject payments
    if (user.role !== "manager") {
        throw new Error("Only managers can reject payments");
    }

    await connectToDatabase();

    const payment = await SalePayment.findOne({ id: paymentId, tenantId });
    if (!payment) {
        throw new Error("Payment not found");
    }

    if (payment.status !== "pending") {
        throw new Error(`Payment already ${payment.status}`);
    }

    // Update payment status
    payment.status = "rejected";
    payment.approved_by = userId;
    payment.approved_at = new Date().toISOString();
    payment.rejection_reason = reason;
    await payment.save();

    // Create audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "REJECT",
        entity_type: "PAYMENT",
        entity_id: paymentId,
        details: `Payment rejected: ${payment.receipt_id} - Reason: ${reason}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales"]);

    return { success: true };
}

/**
 * Cancel a payment submission (Seller or Manager)
 */
export async function cancelPayment(paymentId: string) {
    const { tenantId, userId, user } = await requireTenantAccess();

    await connectToDatabase();

    const payment = await SalePayment.findOne({ id: paymentId, tenantId });
    if (!payment) {
        throw new Error("Payment not found");
    }

    if (payment.status === "approved") {
        throw new Error("Cannot cancel an approved payment");
    }

    // Only the seller who submitted it or a manager can cancel
    if (user.role !== "manager" && payment.seller_id !== userId) {
        throw new Error("Unauthorized to cancel this payment");
    }

    await SalePayment.deleteOne({ id: paymentId, tenantId });

    // Create audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "DELETE",
        entity_type: "PAYMENT",
        entity_id: paymentId,
        details: `Payment submission cancelled for receipt ${payment.receipt_id}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales"]);

    return { success: true };
}

/**
 * Mark a sale as paid directly (Manager only - existing functionality)
 */
export async function markSaleAsPaid(saleId: string, receiptId: string) {
    const { tenantId, userId, user } = await requireTenantAccess();

    // Only managers can directly mark sales as paid
    if (user.role !== "manager") {
        throw new Error("Only managers can mark sales as paid");
    }

    await connectToDatabase();

    const sale = await Sale.findOne({ id: saleId, tenantId });
    if (!sale) {
        throw new Error("Sale not found");
    }

    // Update sale
    sale.verse = true;
    sale.date_de_versement = new Date().toISOString();
    sale.invoice_number = receiptId;
    await sale.save();

    // Create audit log
    await AuditLog.create({
        id: uuidv4(),
        tenantId,
        user_id: userId,
        action: "UPDATE",
        entity_type: "SALE",
        entity_id: saleId,
        details: `Sale marked as paid: ${receiptId}`,
        timestamp: new Date().toISOString(),
    });

    await revalidateTenantPaths(["/sales"]);

    return { success: true };
}
