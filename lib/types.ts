export type Role = 'manager' | 'seller';

export interface User {
    id: string;
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    password_hash: string;
    full_name: string; // Keep for legacy/convenience
    phone?: string;
    active: boolean;
    isAdmin: boolean;
    role?: Role; // Added role property
    created_at: string;
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    active: boolean;
    currency: string;
    created_at: string;
}

export interface Membership {
    id: string;
    userId: string;
    tenantId: string;
    role: 'manager' | 'seller';
    active: boolean;
    created_at: string;
}

export interface Invitation {
    id: string;
    tenantId: string;
    invitedUserId: string;
    invitedBy: string;
    role: 'manager' | 'seller';
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    responded_at?: string;
    // Populated fields
    tenantName?: string;
    inviterName?: string;
}

export interface TicketType {
    id: string;
    tenantId: string;
    name: string;
    price: number;
    active: boolean;
    created_at: string;
}



export interface Sale {
    id: string;
    // "Columns: id | nom | type_de_ticket ...".
    // "nom" is the seller's name (from User model)
    seller_id: string; // References User.id
    ticket_type_id: string; // "type_de_ticket" - likely the name or ID.
    ticket_type_name: string; // Storing name is easier for reading the sheet.
    quantity: number;
    date_de_prise: string;
    date_de_versement?: string;
    verse: boolean;
    invoice_number?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface AuditLog {
    id: string;
    user_id: string;
    username?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    timestamp: string;
}

export interface TicketInventory {
    id: string;
    ticket_type_id: string;
    ticket_type_name: string;
    current_stock: number;
    alert_threshold: number;
    last_updated: string;
}

export interface SalePayment {
    id: string;
    verse?: string; // Receipt ID if paid
    seller_id: string; // References User.id with seller role
    receipt_id: string;
    amount: number;
    submitted_at: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    notes?: string;
}

// Helper types for forms
export type CreateSaleInput = Omit<Sale, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'last_login'>;
export type CreateTicketTypeInput = Omit<TicketType, 'id' | 'created_at'>;

export type CreateSalePaymentInput = Omit<SalePayment, 'id' | 'submitted_at' | 'status' | 'approved_by' | 'approved_at'>;
