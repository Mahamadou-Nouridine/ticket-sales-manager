# Ticket Sales Manager - Technical Documentation

## 1. Overview
Ticket Sales Manager is a comprehensive web-based application designed to streamline the ticketing operations for events and venues. It replaces manual spreadsheet tracking with a robust, database-backed system that ensures data integrity, real-time inventory management, and secure access control.

## 2. Key Features

### 2.1 Dashboard & Analytics
- **Real-time Overview**: Immediate visibility into total sales, revenue, and active inventory.
- **Stock Alerts**: specific visual indicators for ticket types that have fallen below the configured threshold.
- **Performance Metrics**: Breakdown of sales by salesman and ticket type.

### 2.2 Sales Management
- **Streamlined Recording**: Easy-to-use interface for logging new sales.
- **Inventory Integration**: Automatic deduction of stock upon sale creation.
- **Transaction Safety**: Uses database transactions to ensure that a sale is never recorded without successfully updating inventory.
- **Payment Tracking**: Track "Paid" (Versé) vs "Unpaid" status, including invoice numbers and payment dates.
- **Edit & Delete History**: Full capability to modify or remove sales, with automatic inventory restoration/adjustment to prevent stock drift.

### 2.3 Inventory Control
- **Live Stock Tracking**: Current counts for all ticket types are maintained in the database.
- **Alert Thresholds**: Configurable low-stock warnings per ticket type.
- **Manual Adjustments**: Superusers can manually initialize or correct stock levels if necessary.

### 2.4 User Management & Security
- **Role-Based Access Control (RBAC)**:
    - **Superuser**: Complete system access, including configuration, user management, and seeing all sales.
    - **User**: Limited access, efficiently focused on recording their own sales.
- **Secure Authentication**: Username/Password login with bcrypt hashing.
- **Activity Logging**: All sensitive actions (creating users, changing stock, deleting sales) are logged.

### 2.5 Configuration Management
- **Ticket Types**: Create, edit, and deactivate different classes of tickets (e.g., VIP, Standard, Early Bird) with specific prices.
- **Salesmen Registry**: Manage the list of authorized sales personnel to track performance individually.

### 2.6 Audit Logging
- **Comprehensive Traceability**: A read-only log of every Create, Update, and Delete operation within the system.
- **Details**: Captures WHO made the change, WHAT entity was changed, and WHEN it happened.

---

## 3. Multi-tenancy Architecture
- **Strategy**: Single Instance, Multi-Tenant (Database Separation via `tenantId`).
- **Identity**: Global Users (unique email/username).
- **Access Control**: `Membership` collection links Users to Tenants with roles (`owner`, `manager`, `seller`).
- **Data Isolation**: All business collections (`Sale`, `TicketType`, `Salesman`, `TicketInventory`, `AuditLog`) include `tenantId`, indexed for performance.
- **Routing**: Session-based tenant context. Users select a tenant upon login, stored in their Session. Url-based routing (`/t/[slug]`) is planned for future enhancements.

## 4. Database Schema (MongoDB)

### 4.1 Core & Identity
- **User**: Global identity (`id`, `email`, `password_hash`, `full_name`, `created_at`).
- **Tenant**: Organization/Workspace (`id`, `name`, `slug`, `plan`, `created_at`).
- **Membership**: Link User-Tenant (`id`, `userId`, `tenantId`, `role`).

### 4.2 Business Data (Tenant Scoped)
- **TicketType**: `id`, `tenantId`, `name`, `price`, `active`.
- **Salesman**: `id`, `tenantId`, `name`, `active`.
- **TicketInventory**: `id`, `tenantId`, `ticket_type_id`, `current_stock`, `alert_threshold`.
- **Sale**: `id`, `tenantId`, `salesman_name`, `ticket_type_name`, `quantity`, `date_de_prise`, `verse`, `created_by`.
- **AuditLog**: `id`, `tenantId`, `user_id`, `action`, `entity_type`, `details`.

## 5. Deployment & Setup

### Environment Variables
Configure `.env.local`:
```env
MONGODB_URI="mongodb://localhost:27017/ticket-sales-manager"
NEXTAUTH_SECRET="your-secure-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Initial Setup
1. **Install Dependencies**: `npm install`
2. **Start Database**: Ensure MongoDB is running.
3. **Seed Superuser**:
   ```bash
   npx tsx scripts/create-user.ts admin securepassword "Admin User"
   ```
4. **Run Server**: `npm run dev`
