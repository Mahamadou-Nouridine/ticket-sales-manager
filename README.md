# Ticket Sales Management System

A Next.js 14+ application for managing ticket sales, using Google Sheets as the database.

## Features

- **Authentication**: Secure login with username/password (NextAuth.js).
- **Dashboard**: Overview of sales and statistics.
- **Sales Management**: Add, edit, delete, and list sales.
- **Configuration**: Manage ticket types, salesmen, and users.
- **Reports**: Visual charts for sales analysis (Superuser only).
- **Audit Logging**: Tracks all important actions.
- **Role-based Access**: User vs Superuser roles.

## Setup

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in the values:
    ```env
    GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@..."
    GOOGLE_SHEET_ID="your-sheet-id"
    NEXTAUTH_SECRET="random-string"
    NEXTAUTH_URL="http://localhost:3000"
    ```
4.  **Google Sheets Setup**:
    - Create a new Google Sheet.
    - Share it with the service account email (Editor access).
    - Create the following sheets (tabs):
        - `Sales Records`
        - `Users`
        - `Ticket Types`
        - `Salesmen`
        - `Audit Logs`
    - Add headers to each sheet as defined in the requirements.
        - **Sales Records**: `id`, `nom`, `type_de_ticket`, `quantite`, `date_de_prise`, `date_de_versement`, `verse`, `created_by`, `created_at`, `updated_at`
        - **Users**: `id`, `username`, `password_hash`, `role`, `full_name`, `active`, `created_at`, `last_login`
        - **Ticket Types**: `id`, `name`, `price`, `active`, `created_at`
        - **Salesmen**: `id`, `name`, `active`, `created_at`
        - **Audit Logs**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `timestamp`
    - **Initial User**: You must manually add a superuser to the `Users` sheet to log in initially.
        - Generate a bcrypt hash for your password (e.g., using an online tool or script).
        - Add a row: `uuid`, `admin`, `hash`, `superuser`, `Admin`, `TRUE`, `date`, ``

5.  **Run the application**:
    ```bash
    npm run dev
    ```

## Deployment

Deploy to Vercel:
1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add Environment Variables in Vercel settings.
