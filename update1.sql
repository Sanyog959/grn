-- ==============================================================================
-- MIMS / AURA FACTORY INVENTORY & MANUFACTURING SUITE
-- File: update1.sql (MIGRATION UPDATE 1 - FULLY SELF-CONTAINED & DEFENSIVE)
-- 
-- Description:
--   Complete, self-contained schema update that creates prerequisite tables
--   if they do not already exist, adds columns, indexes, and creates the
--   consolidated view for:
--   1. Store Location Stock (location tracking per SKU & inward lot)
--   2. Production Line Stock (WIP issued per line/workstation)
--   3. Process Rejection (failed_processing_qty & root cause for internal scrap)
--   4. Supplier Rejection (supplier_failed_qty on shop floor + dock QC reject)
--   5. Day-wise & Month-wise indexed reporting queries
-- 
-- Instructions:
--   Copy and paste this entire script directly into your Supabase SQL Editor.
-- ==============================================================================

-- 0. Enable UUID & Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PREREQUISITE BASE TABLES (Creates them if missing in Supabase)
-- ==============================================================================

-- Master Catalog Items
CREATE TABLE IF NOT EXISTS public.catalog_items (
  item_code TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Raw Material',
  hsn_code TEXT DEFAULT '7318',
  uom TEXT NOT NULL DEFAULT 'PCS',
  default_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
  reorder_qty NUMERIC(12, 2) NOT NULL DEFAULT 50.00,
  storage_location TEXT DEFAULT 'Central Store Bay A1',
  bin_number TEXT DEFAULT 'BIN-01',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONTINUED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Production Issues / Shopfloor Line Stock
CREATE TABLE IF NOT EXISTS public.production_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT NOT NULL UNIQUE,
  job_card_number TEXT NOT NULL,
  station TEXT NOT NULL DEFAULT 'Assembly / CNC Workstation',
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT 'Material Item',
  quantity_issued NUMERIC(12, 2) NOT NULL,
  uom TEXT NOT NULL DEFAULT 'PCS',
  production_officer TEXT DEFAULT 'Production Officer',
  production_manager TEXT NOT NULL DEFAULT 'Production Head',
  responsible_person TEXT NOT NULL DEFAULT 'Operator',
  issue_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  status TEXT NOT NULL DEFAULT 'PENDING_RECEIPT' CHECK (status IN ('PENDING_RECEIPT', 'ISSUED', 'IN_PROCESS', 'COMPLETED', 'RETURNED')),
  remaining_store_stock NUMERIC(12, 2) DEFAULT 0.00,
  remarks TEXT,
  report JSONB DEFAULT '{}'::jsonb,
  ready_to_use_qty NUMERIC(12, 2) DEFAULT 0.00,
  failed_processing_qty NUMERIC(12, 2) DEFAULT 0.00,
  supplier_failed_qty NUMERIC(12, 2) DEFAULT 0.00,
  scrap_reason TEXT,
  station_line TEXT DEFAULT 'CNC Machining Line 1',
  reported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- GRN Orders
CREATE TABLE IF NOT EXISTS public.grn_orders (
  grn_number TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse TEXT NOT NULL DEFAULT 'Main Factory Store',
  carrier_tracking TEXT,
  delivery_challan TEXT,
  vehicle_number TEXT,
  inspector TEXT NOT NULL DEFAULT 'QC Lead',
  total_items NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_ordered_qty NUMERIC(12, 2) DEFAULT 0.00,
  total_received_qty NUMERIC(12, 2) DEFAULT 0.00,
  total_pending_qty NUMERIC(12, 2) DEFAULT 0.00,
  status TEXT NOT NULL CHECK (status IN ('Pending QC', 'Approved', 'Partial', 'Rejected')) DEFAULT 'Pending QC',
  notes TEXT,
  is_scrap_receipt BOOLEAN DEFAULT FALSE,
  sent_to_qc_at TIMESTAMPTZ,
  sent_to_qc_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  qc_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- GRN Items Received
CREATE TABLE IF NOT EXISTS public.grn_items (
  id TEXT PRIMARY KEY,
  grn_number TEXT NOT NULL,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  po_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ordered_qty NUMERIC(12, 2) DEFAULT 0.00,
  received_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_qty NUMERIC(12, 2) DEFAULT 0.00,
  accepted_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  rejected_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  unit TEXT NOT NULL DEFAULT 'PCS',
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  batch_number TEXT DEFAULT 'BATCH-01',
  qc_status TEXT NOT NULL CHECK (qc_status IN ('Passed', 'Under Review', 'Failed', 'HOLD', 'Remark')) DEFAULT 'Under Review',
  rejection_reason TEXT,
  qc_remarks TEXT,
  inspected_by TEXT,
  inspected_at TIMESTAMPTZ,
  is_scrap BOOLEAN DEFAULT FALSE,
  scrap_source TEXT,
  store_location TEXT DEFAULT 'Main Factory Store - Bay A1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Double-Entry Stock Ledger
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT 'Industrial Material',
  transaction_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  previous_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  change_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  new_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  location TEXT NOT NULL DEFAULT 'STORE',
  performed_by TEXT NOT NULL DEFAULT 'System',
  user_role TEXT NOT NULL DEFAULT 'ADMIN',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- ==============================================================================
-- 2. EXTEND TABLES WITH NEW INDUSTRIAL COLUMNS (Safe if table already exists)
-- ==============================================================================

-- 1. Extend production_issues with report payload & defect separation columns
ALTER TABLE public.production_issues
  ADD COLUMN IF NOT EXISTS report JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ready_to_use_qty NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS failed_processing_qty NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS supplier_failed_qty NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS scrap_reason TEXT,
  ADD COLUMN IF NOT EXISTS station_line TEXT DEFAULT 'CNC Machining Line 1',
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

-- 2. Extend catalog_items & grn_items with specific Store Location designations
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'Central Store Bay A1',
  ADD COLUMN IF NOT EXISTS bin_number TEXT DEFAULT 'BIN-01';

ALTER TABLE public.grn_items
  ADD COLUMN IF NOT EXISTS store_location TEXT DEFAULT 'Main Factory Store - Bay A1';

ALTER TABLE public.grn_orders
  ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'Main Factory Store';

-- ==============================================================================
-- 3. SEED / BACKFILL CATALOG ITEMS (Ensures View Has SKUs & Names)
-- ==============================================================================

-- If grn_items has existing rows, populate catalog_items automatically:
INSERT INTO public.catalog_items (item_code, item_name, category, uom, storage_location)
SELECT DISTINCT 
  gi.item_code, 
  gi.description, 
  COALESCE(gi.category, 'Raw Material'), 
  COALESCE(gi.unit, 'PCS'),
  'Central Store Bay A1'
FROM public.grn_items gi
WHERE gi.item_code IS NOT NULL AND gi.item_code <> ''
ON CONFLICT (item_code) DO NOTHING;

-- Seed default factory items so initial catalog is never empty:
INSERT INTO public.catalog_items (item_code, item_name, category, hsn_code, uom, default_price, min_stock, reorder_qty, storage_location, bin_number, status)
VALUES
  ('ITM-01', 'Precision Machined Flange (Steel)', 'Machined Parts', '7307', 'PCS', 500.00, 20.00, 50.00, 'Central Store Bay A1', 'BIN-01', 'ACTIVE'),
  ('ITM-02', 'Heavy Duty Hex Bolts M16 (Grade 8.8)', 'Fasteners', '7318', 'PCS', 60.00, 100.00, 500.00, 'Central Store Bay A2', 'BIN-02', 'ACTIVE'),
  ('ITM-03', 'Hydraulic Cylinder Bore Tube (Alloy)', 'Raw Material', '8412', 'MTR', 1450.00, 10.00, 25.00, 'Central Store Bay B1', 'BIN-03', 'ACTIVE'),
  ('ITM-04', 'Nitril O-Ring High Temp Seal Kit', 'Consumables', '4016', 'SET', 220.00, 30.00, 100.00, 'Central Store Bay B2', 'BIN-04', 'ACTIVE'),
  ('ITM-05', 'Cast Iron Bearing Housing Bracket', 'Castings', '8483', 'NOS', 850.00, 15.00, 40.00, 'Central Store Bay C1', 'BIN-05', 'ACTIVE'),
  ('ITM-06', 'Stainless Steel Sheet 2mm (SS304)', 'Raw Material', '7219', 'KG', 320.00, 50.00, 200.00, 'Central Store Bay C2', 'BIN-06', 'ACTIVE'),
  ('ITM-07', 'Brass Bushing Sleeve (Self-Lubricating)', 'Machined Parts', '8483', 'PCS', 180.00, 40.00, 100.00, 'Central Store Bay D1', 'BIN-07', 'ACTIVE')
ON CONFLICT (item_code) DO NOTHING;

-- ==============================================================================
-- 4. PERFORMANCE INDEXES (High-Speed Filtering by Day, Month & Status)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_prod_issues_date ON public.production_issues(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_prod_issues_status ON public.production_issues(status);
CREATE INDEX IF NOT EXISTS idx_prod_issues_item ON public.production_issues(item_code);
CREATE INDEX IF NOT EXISTS idx_grn_orders_date ON public.grn_orders(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_grn_items_inspected ON public.grn_items(inspected_at DESC);
CREATE INDEX IF NOT EXISTS idx_grn_items_code ON public.grn_items(item_code);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_timestamp ON public.stock_ledger(timestamp DESC);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "allow_all_catalog_items" ON public.catalog_items;
  CREATE POLICY "allow_all_catalog_items" ON public.catalog_items FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_production_issues" ON public.production_issues;
  CREATE POLICY "allow_all_production_issues" ON public.production_issues FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_grn_orders" ON public.grn_orders;
  CREATE POLICY "allow_all_grn_orders" ON public.grn_orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_grn_items" ON public.grn_items;
  CREATE POLICY "allow_all_grn_items" ON public.grn_items FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_stock_ledger" ON public.stock_ledger;
  CREATE POLICY "allow_all_stock_ledger" ON public.stock_ledger FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.catalog_items TO anon, authenticated, service_role;
GRANT ALL ON public.production_issues TO anon, authenticated, service_role;
GRANT ALL ON public.grn_orders TO anon, authenticated, service_role;
GRANT ALL ON public.grn_items TO anon, authenticated, service_role;
GRANT ALL ON public.stock_ledger TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. ANALYTICAL CONSOLIDATED VIEW: Store, Line Stock & Rejections Monitor
-- ==============================================================================
CREATE OR REPLACE VIEW public.vw_material_stock_rejections AS
SELECT 
  -- Item details
  c.item_code,
  c.item_name,
  c.category,
  c.uom,
  COALESCE(c.storage_location, 'Central Store Bay A1') AS store_location,
  c.min_stock,
  
  -- Store Inward Accepted (Passed QC)
  COALESCE((
    SELECT SUM(COALESCE(gi.accepted_qty, 0)) 
    FROM public.grn_items gi 
    WHERE UPPER(gi.item_code) = UPPER(c.item_code) 
      AND gi.qc_status = 'Passed'
  ), 0) AS total_inward_accepted,

  -- Production Line Stock (Active WIP currently on line)
  COALESCE((
    SELECT SUM(COALESCE(pi.quantity_issued, 0)) 
    FROM public.production_issues pi 
    WHERE UPPER(pi.item_code) = UPPER(c.item_code) 
      AND pi.status IN ('PENDING_RECEIPT', 'ISSUED', 'IN_PROCESS')
  ), 0) AS active_line_stock,

  -- Process Rejection (Internal machining / assembly failure with resilient parsing)
  COALESCE((
    SELECT SUM(
      CASE 
        WHEN pi.failed_processing_qty IS NOT NULL AND pi.failed_processing_qty > 0 THEN pi.failed_processing_qty
        WHEN pi.report IS NOT NULL AND pi.report->>'failedProcessingQty' ~ '^[0-9]+(\.[0-9]+)?$' THEN (pi.report->>'failedProcessingQty')::numeric
        ELSE 0
      END
    ) 
    FROM public.production_issues pi 
    WHERE UPPER(pi.item_code) = UPPER(c.item_code)
  ), 0) AS total_process_rejection,

  -- Supplier Rejection (Dock QC rejection + shopfloor supplier defect)
  (
    COALESCE((
      SELECT SUM(COALESCE(gi.rejected_qty, 0)) 
      FROM public.grn_items gi 
      WHERE UPPER(gi.item_code) = UPPER(c.item_code)
    ), 0)
    +
    COALESCE((
      SELECT SUM(
        CASE 
          WHEN pi.supplier_failed_qty IS NOT NULL AND pi.supplier_failed_qty > 0 THEN pi.supplier_failed_qty
          WHEN pi.report IS NOT NULL AND pi.report->>'supplierFailedQty' ~ '^[0-9]+(\.[0-9]+)?$' THEN (pi.report->>'supplierFailedQty')::numeric
          ELSE 0
        END
      ) 
      FROM public.production_issues pi 
      WHERE UPPER(pi.item_code) = UPPER(c.item_code)
    ), 0)
  ) AS total_supplier_rejection

FROM public.catalog_items c;

-- Permissive grants on the view
GRANT SELECT ON public.vw_material_stock_rejections TO anon, authenticated, service_role;

COMMENT ON VIEW public.vw_material_stock_rejections IS 'Consolidated live view for Store Location Stock, Line WIP, Process Rejection, and Supplier Rejection';

-- ==============================================================================
-- 7. VERIFICATION OUTPUT
-- ==============================================================================
SELECT 
  'update1.sql executed successfully!' AS migration_status,
  COUNT(*) AS total_catalog_items_tracked
FROM public.vw_material_stock_rejections;
