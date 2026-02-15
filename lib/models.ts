import { Schema, model, models } from 'mongoose';

// --- Tenant Schema ---
const tenantSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    plan: { type: String, default: 'free' },
    active: { type: Boolean, default: true },
    currency: { type: String, default: 'FCFA' },
    created_at: { type: String, required: true },
});

// --- User Schema ---
const userSchema = new Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    phone: { type: String },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Membership Schema ---
const membershipSchema = new Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    role: { type: String, enum: ['manager', 'seller'], required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// Virtual for population
membershipSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
});

// Ensure virtuals are included in toObject and toJSON
membershipSchema.set('toObject', { virtuals: true });
membershipSchema.set('toJSON', { virtuals: true });

// --- Ticket Type Schema ---
const ticketTypeSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Sale Schema ---
const saleSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    seller_id: { type: String, required: true, index: true }, // References User.id
    ticket_type_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    date_de_prise: { type: String, required: true },
    date_de_versement: { type: String },
    verse: { type: Boolean, default: false },
    invoice_number: { type: String },
    created_by: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    ticket_type_id: { type: String },
});

// --- Sale Payment Schema ---
const salePaymentSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    sale_id: { type: String, required: true, index: true },
    seller_id: { type: String, required: true, index: true },
    receipt_id: { type: String, required: true },
    amount: { type: Number, required: true },
    submitted_at: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: { type: String },
    approved_at: { type: String },
    rejection_reason: { type: String },
    notes: { type: String },
});

// --- Inventory Schema ---
const ticketInventorySchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    ticket_type_id: { type: String, required: true },
    ticket_type_name: { type: String, required: true },
    current_stock: { type: Number, required: true, default: 0 },
    alert_threshold: { type: Number, required: true, default: 50 },
    last_updated: { type: String, required: true },
});

// --- Audit Log Schema ---
const auditLogSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    user_id: { type: String, required: true },
    username: { type: String },
    action: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, required: true },
    details: { type: String },
    timestamp: { type: String, required: true },
});

// Prevention for model compilation error in dev (Next.js HMR)
if (process.env.NODE_ENV === 'development') {
    delete models.User;
    delete models.Tenant;
    delete models.Membership;
    delete models.TicketType;
    delete models.Sale;
    delete models.SalePayment;
    delete models.TicketInventory;
    delete models.AuditLog;
}

export const User = models.User || model('User', userSchema);
export const Tenant = models.Tenant || model('Tenant', tenantSchema);
export const Membership = models.Membership || model('Membership', membershipSchema);
export const TicketType = models.TicketType || model('TicketType', ticketTypeSchema);
export const Sale = models.Sale || model('Sale', saleSchema);
export const SalePayment = models.SalePayment || model('SalePayment', salePaymentSchema);
export const TicketInventory = models.TicketInventory || model('TicketInventory', ticketInventorySchema);
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema);
