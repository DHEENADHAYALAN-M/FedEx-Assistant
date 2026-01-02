# DebtFlow - DCA Management Dashboard

## Overview

DebtFlow is an enterprise-grade web application for managing Debt Collection Agencies (DCAs). The system enables organizations like FedEx to upload overdue case data via Excel files, automatically assign cases to DCAs based on region and workload, track case lifecycles, and monitor recovery performance through a comprehensive dashboard.

Key capabilities:
- Excel file upload with validation and smart case ingestion
- Automatic priority assignment based on amount and days overdue
- Automatic DCA assignment based on region matching and workload
- Case lifecycle management (New → Assigned → In Progress → Recovered/Escalated)
- Audit trail with case notes and upload history
- Role-based views (Admin vs DCA Partner)
- Dashboard with analytics and performance metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Charts**: Recharts for data visualization
- **Excel Parsing**: xlsx library for client-side Excel file processing
- **Build Tool**: Vite with React plugin

The frontend follows a page-based architecture with shared components. Pages include Dashboard, CaseManagement, DcaManagement, and ExcelUpload. A role context system simulates admin vs DCA partner views.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Build**: esbuild for production bundling with selective dependency bundling

The server handles API routes for DCAs, cases, notes, upload logs, and dashboard statistics. Routes are registered in `server/routes.ts` with business logic delegated to the storage layer.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command
- **Tables**: 
  - `dcas` - DCA master records with region, active/recovered cases, SLA scores
  - `cases` - Individual debt cases with priority, status, assignment
  - `caseNotes` - Audit trail for case changes
  - `uploadLogs` - Excel upload history

### Smart Automation Logic
Priority is auto-calculated on import:
- High: Amount > 50,000 OR Days Overdue > 60
- Medium: Amount 20,000–50,000
- Low: All others

DCA assignment considers region matching and current workload.

### Project Structure
```
client/           # React frontend application
  src/
    components/   # Reusable UI components
    pages/        # Route-level page components
    hooks/        # Custom React hooks for data fetching
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # Database operations
  db.ts           # Database connection
shared/           # Code shared between client and server
  schema.ts       # Drizzle database schema
  routes.ts       # API contract definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store (available but sessions not currently implemented)

### Frontend Libraries
- **Radix UI**: Accessible UI primitives (dialogs, dropdowns, tooltips, etc.)
- **TanStack React Query**: Server state management and caching
- **Recharts**: Chart library for dashboard visualizations
- **xlsx**: Excel file parsing for uploads
- **date-fns**: Date formatting and manipulation

### Development Tools
- **Vite**: Development server with HMR
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling