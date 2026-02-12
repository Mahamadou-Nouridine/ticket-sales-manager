import mongoose, { Schema, model, models } from 'mongoose';

// --- User Schema ---
const userSchema = new Schema({
    id: { type: String, required: true, unique: true }, // Keeping string ID to match existing UUID usage
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, enum: ['superuser', 'user'] },
    full_name: { type: String, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
    last_login: { type: String },
});

// --- Ticket Type Schema ---
const ticketTypeSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Salesman Schema ---
const salesmanSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    created_at: { type: String, required: true },
});

// --- Sale Schema ---
const saleSchema = new Schema({
    id: { type: String, required: true, unique: true },
    salesman_name: { type: String, required: true }, // Storing name as per current logic, could link to Salesman
    ticket_type_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    date_de_prise: { type: String, required: true },
    date_de_versement: { type: String },
    verse: { type: Boolean, default: false },
    invoice_number: { type: String },
    created_by: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    // Optional links if we want to add them for future relational integrity
    salesman_id: { type: String },
    ticket_type_id: { type: String },
});

// --- Inventory Schema ---
const ticketInventorySchema = new Schema({
    id: { type: String, required: true, unique: true },
    ticket_type_id: { type: String, required: true },
    ticket_type_name: { type: String, required: true },
    current_stock: { type: Number, required: true, default: 0 },
    alert_threshold: { type: Number, required: true, default: 50 },
    last_updated: { type: String, required: true },
});

// --- Audit Log Schema ---
const auditLogSchema = new Schema({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    action: { type: String, required: true }, // CREATE, UPDATE, DELETE
    entity_type: { type: String, required: true }, // SALE, INVENTORY, etc.
    entity_id: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: String, required: true },
});

// Export Models
export const User = models.User || model('User', userSchema);
export const TicketType = models.TicketType || model('TicketType', ticketTypeSchema);
export const Salesman = models.Salesman || model('Salesman', salesmanSchema);
export const Sale = models.Sale || model('Sale', saleSchema);
export const TicketInventory = models.TicketInventory || model('TicketInventory', ticketInventorySchema);
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema);
