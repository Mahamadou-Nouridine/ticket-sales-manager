import mongoose, { Schema, model, models } from 'mongoose';

// --- User Schema ---
const userSchema = new Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Tenant Schema ---
const tenantSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, default: 'free' },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Membership Schema ---
const membershipSchema = new Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // ref removed, using virtual
    tenantId: { type: String, required: true }, // ref removed, using virtual
    role: { type: String, enum: ['owner', 'manager', 'seller'], required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

membershipSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
});

membershipSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: 'id',
    justOne: true
});

membershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

// --- Ticket Type Schema ---
const ticketTypeSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Salesman Schema ---
const salesmanSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Sale Schema ---
const saleSchema = new Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    salesman_name: { type: String, required: true },
    ticket_type_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    date_de_prise: { type: String, required: true },
    date_de_versement: { type: String },
    verse: { type: Boolean, default: false },
    invoice_number: { type: String },
    created_by: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    salesman_id: { type: String },
    ticket_type_id: { type: String },
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
    tenantId: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    action: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: String, required: true },
});

// Export Models
// Delete models if they exist to prevent HMR issues with Schema changes (Virtuals) in dev
if (process.env.NODE_ENV !== 'production') {
    delete models.User;
    delete models.Tenant;
    delete models.Membership;
    delete models.TicketType;
    delete models.Salesman;
    delete models.Sale;
    delete models.TicketInventory;
    delete models.AuditLog;
}
export const User = models.User || model('User', userSchema);
export const Tenant = models.Tenant || model('Tenant', tenantSchema);
export const Membership = models.Membership || model('Membership', membershipSchema);
export const TicketType = models.TicketType || model('TicketType', ticketTypeSchema);
export const Salesman = models.Salesman || model('Salesman', salesmanSchema);
export const Sale = models.Sale || model('Sale', saleSchema);
export const TicketInventory = models.TicketInventory || model('TicketInventory', ticketInventorySchema);
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema);
