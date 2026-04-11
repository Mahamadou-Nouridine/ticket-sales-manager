import mongoose from 'mongoose';

// --- Tenant Schema ---
const tenantSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    plan: { type: String, default: 'free' },
    active: { type: Boolean, default: true },
    currency: { type: String, default: 'FCFA' },
    ownerId: { type: String, required: false }, // Optional for backward compatibility
    notificationEmails: { type: [String], default: [] },
    created_at: { type: String, required: true },
});

// --- User Schema ---
const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    password_hash: { type: String },
    full_name: { type: String, required: true },
    phone: { type: String },
    active: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    created_at: { type: String, required: true },
});

// --- Membership Schema ---
const membershipSchema = new mongoose.Schema({
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

// --- Invitation Schema ---
const invitationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    invitedUserId: { type: String, required: true, index: true },
    invitedBy: { type: String, required: true }, // Manager user ID
    role: { type: String, enum: ['manager', 'seller'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    created_at: { type: String, required: true },
    responded_at: { type: String },
});

// --- Ticket Type Schema ---
const ticketTypeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Sale Schema ---
const saleSchema = new mongoose.Schema({
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
const salePaymentSchema = new mongoose.Schema({
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
const ticketInventorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    ticket_type_id: { type: String, required: true },
    ticket_type_name: { type: String, required: true },
    current_stock: { type: Number, required: true, default: 0 },
    alert_threshold: { type: Number, required: true, default: 50 },
    last_updated: { type: String, required: true },
});

// --- Audit Log Schema ---
const auditLogSchema = new mongoose.Schema({
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

// --- Waitlist Schema ---
export interface IWaitlist {
    email: string;
    fullName: string;
    wifiZoneName: string;
    position: number;
    status: 'early_access' | 'waiting';
    isHandled: boolean;
    createdAt: Date;
}

const waitlistSchema = new mongoose.Schema<IWaitlist>({
    email: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    wifiZoneName: { type: String, required: true },
    position: { type: Number, required: true },
    status: { type: String, enum: ['early_access', 'waiting'], default: 'early_access' },
    isHandled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Prevention for model compilation error in dev (Next.js HMR)
if (process.env.NODE_ENV === 'development') {
    delete (mongoose.models as any).User;
    delete (mongoose.models as any).Tenant;
    delete (mongoose.models as any).Membership;
    delete (mongoose.models as any).Invitation;
    delete (mongoose.models as any).TicketType;
    delete (mongoose.models as any).Sale;
    delete (mongoose.models as any).SalePayment;
    delete (mongoose.models as any).TicketInventory;
    delete (mongoose.models as any).AuditLog;
    delete (mongoose.models as any).Waitlist;
}

export const User = (mongoose.models.User as mongoose.Model<any>) || mongoose.model<any>('User', userSchema);
export const Tenant = (mongoose.models.Tenant as mongoose.Model<any>) || mongoose.model<any>('Tenant', tenantSchema);
export const Membership = (mongoose.models.Membership as mongoose.Model<any>) || mongoose.model<any>('Membership', membershipSchema);
export const Invitation = (mongoose.models.Invitation as mongoose.Model<any>) || mongoose.model<any>('Invitation', invitationSchema);
export const TicketType = (mongoose.models.TicketType as mongoose.Model<any>) || mongoose.model<any>('TicketType', ticketTypeSchema);
export const Sale = (mongoose.models.Sale as mongoose.Model<any>) || mongoose.model<any>('Sale', saleSchema);
export const SalePayment = (mongoose.models.SalePayment as mongoose.Model<any>) || mongoose.model<any>('SalePayment', salePaymentSchema);
export const TicketInventory = (mongoose.models.TicketInventory as mongoose.Model<any>) || mongoose.model<any>('TicketInventory', ticketInventorySchema);
export const AuditLog = (mongoose.models.AuditLog as mongoose.Model<any>) || mongoose.model<any>('AuditLog', auditLogSchema);
export const Waitlist = (mongoose.models.Waitlist as mongoose.Model<IWaitlist>) || mongoose.model<IWaitlist>('Waitlist', waitlistSchema);
