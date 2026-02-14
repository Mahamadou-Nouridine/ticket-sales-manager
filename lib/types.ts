export type Role = 'superuser' | 'user';

export interface User {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    active: boolean;
    created_at: string;
    // role and tenantId removed, now handled by Keycloak/Membership
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    active: boolean;
    created_at: string;
}

export interface Membership {
    id: string;
    userId: string;
    tenantId: string;
    role: 'owner' | 'manager' | 'seller';
    active: boolean;
    created_at: string;
}

export interface TicketType {
    id: string;
    tenantId: string;
    name: string;
    price: number;
    active: boolean;
    created_at: string;
}

export interface Salesman {
    id: string;
    tenantId: string;
    name: string;
    active: boolean;
    created_at: string;
}

export interface Sale {
    id: string;
    // "Columns: id | nom | type_de_ticket ...".
    // "nom" is likely the Salesman's name.
    salesman_name: string;
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

// Helper types for forms
export type CreateSaleInput = Omit<Sale, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'last_login'>;
export type CreateTicketTypeInput = Omit<TicketType, 'id' | 'created_at'>;
export type CreateSalesmanInput = Omit<Salesman, 'id' | 'created_at'>;
