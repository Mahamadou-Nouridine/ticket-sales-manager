export type Role = 'superuser' | 'user';

export interface User {
    id: string;
    username: string;
    password_hash: string;
    role: Role;
    full_name: string;
    active: boolean;
    created_at: string;
    last_login?: string;
}

export interface TicketType {
    id: string;
    name: string;
    price: number;
    active: boolean;
    created_at: string;
}

export interface Salesman {
    id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export interface Sale {
    id: string;
    salesman_id: string; // "nom" in sheet, but better to link by ID or name if unique. Prompt says "nom". I'll stick to "salesman_name" or "salesman_id" if I can. Prompt says "Salesman (dropdown)". Let's store the name or ID. The sheet column is "nom". I'll assume it stores the Name for simplicity or ID if we want relational. Given it's Sheets, Name is often easier for human readability, but ID is safer. Let's use ID in code but maybe Name in sheet? Or just Name. The prompt says "Columns: id | nom ...". "nom" likely refers to Salesman Name.
    // Actually, let's look at the prompt: "Salesman (dropdown from configured list)".
    // If I change a salesman's name, it breaks history if I store name. ID is better.
    // But the sheet column is "nom". I'll use "salesman_id" in the interface and map it to "nom" column if needed, or just store the ID in the "nom" column (which might be confusing).
    // Let's assume "nom" means "Salesman Name". I will store the Name for now to match the column header "nom".
    // Wait, "nom" could be the name of the *customer*?
    // "Salesman (dropdown from configured list)".
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
