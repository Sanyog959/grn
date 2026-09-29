# AURA GRN SaaS - Goods Received Note System

Enterprise Inward Logistics & Quality Control Operating System powered by **Next.js 16 (App Router)** and **Supabase (PostgreSQL)** backend.

---

## ⚡ Architecture Overview

AURA GRN provides a full-stack inward receipts and quality inspection pipeline:
1. **Master GRN Receipts (`grn_orders` table)**: Track PO number, carrier tracking, receiving dock bay, inspector, total value, and inspection status.
2. **QC Line Items & Inspection (`grn_items` table)**: Granular per-item discrepancies, accepted vs. rejected counts, durometer/calibration test notes, and QC pass/fail workflows.
3. **Verified Suppliers Directory (`vendors` table)**: SLA scorecard, lead time days, category, and vendor approval ratings.
4. **Backend REST API**: Next.js App Router endpoints with bidirectional mapping and validation.
5. **Supabase PostgreSQL Database**: Cloud database with Row-Level Security (RLS) and real-time connectivity.

---

## 🚀 Quick Setup with Supabase

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Go to **Project Settings** → **API**.
3. Copy your **Project URL** and **anon public key**.

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```
*(Note: You can also enter and test these credentials directly inside the app UI via the **⚡ Supabase Setup** button)*

### 3. Run the SQL Migration
1. Open your Supabase Dashboard → **SQL Editor**.
2. Open [`supabase-schema.sql`](./supabase-schema.sql) in this repository (or copy it directly from the in-app modal).
3. Paste and click **Run**.
   - This creates all 3 tables (`vendors`, `grn_orders`, `grn_items`), creates performance indexes, enables RLS policies, and inserts starter demo records!

### 4. Run the App (1-Click)
- **Windows (Double-Click)**: Simply double-click [`run.bat`](./run.bat) to automatically verify Node.js, install missing packages, launch the server, and open your browser to [http://localhost:3000](http://localhost:3000)!
- **Or via terminal**:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🔌 Backend REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/grn` | List all GRN orders (supports `?status=` and `?search=`) |
| `POST` | `/api/grn` | Create a new GRN order along with associated line items |
| `PATCH` | `/api/grn` | Update GRN order status (`Approved`, `Pending QC`, `Partial`, `Rejected`) |
| `GET` | `/api/items` | List QC line items (supports `?grnNumber=` and `?qcStatus=`) |
| `PATCH` | `/api/items` | Update line item QC inspection status, accepted/rejected counts |
| `GET` | `/api/vendors` | List all verified suppliers |
| `POST` | `/api/vendors` | Add a new supplier |
| `GET` | `/api/supabase/status` | Diagnostic ping for Supabase connectivity & row counts |
| `POST` | `/api/supabase/status` | One-click seeder for initial demo database |

---

## 📂 Project Structure

```
├── supabase-schema.sql         # Full PostgreSQL schema, RLS policies & initial seed data
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── grn/route.ts            # GRN Orders API (GET, POST, PATCH)
│   │   │   ├── items/route.ts          # Line Items QC API (GET, PATCH)
│   │   │   ├── vendors/route.ts        # Vendors API (GET, POST)
│   │   │   └── supabase/status/route.ts # Supabase Ping & Seeding API
│   │   ├── components/
│   │   │   ├── SupabaseConfigModal.tsx  # Setup & Diagnostic Modal
│   │   │   ├── Header.tsx              # Brand & Supabase connection badge
│   │   │   ├── KpiMetrics.tsx          # 4 Aurora metric cards
│   │   │   ├── GrnOrdersTable.tsx      # Inward GRN table & status triggers
│   │   │   ├── GrnItemsTable.tsx       # Line items & QC inspection table
│   │   │   ├── VendorsTable.tsx        # Suppliers & vendor SLA scorecard
│   │   │   ├── CreateGrnModal.tsx      # Modal to register new GRN receipt
│   │   │   ├── CreateVendorModal.tsx   # Modal to onboard supplier
│   │   │   └── GrnSlipModal.tsx        # Printable GRN warehouse slip
│   │   ├── data/
│   │   │   └── demo-data.ts            # Enterprise fallback dataset & TS types
│   │   ├── globals.css                 # Aurora design system
│   │   ├── layout.tsx
│   │   └── page.tsx                    # Main Dashboard page
│   └── lib/
│       └── supabase/
│           ├── client.ts               # Browser Supabase client
│           ├── server.ts               # Server-side Supabase client
│           ├── service.ts              # Data access service layer
│           ├── types.ts                # PostgreSQL schema types & converters
│           └── schema-sql.ts           # In-app SQL migration string
```
"# grn" 
