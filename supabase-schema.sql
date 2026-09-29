-- ==============================================================================
-- AURA GRN SaaS - Supabase PostgreSQL Database Schema
-- Version: 1.0.0
-- Enterprise Inward Goods Received Note & Quality Control Operating System
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: vendors (Verified Suppliers Directory)
CREATE TABLE IF NOT EXISTS public.vendors (
  vendor_code TEXT PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 7,
  quality_rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Preferred', 'On Probation')) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 3. TABLE: grn_orders (Master Goods Received Note Inward Orders)
CREATE TABLE IF NOT EXISTS public.grn_orders (
  grn_number TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse TEXT NOT NULL,
  carrier_tracking TEXT,
  inspector TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL CHECK (status IN ('Approved', 'Pending QC', 'Partial', 'Rejected')) DEFAULT 'Pending QC',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4. TABLE: grn_items (QC Line Items & Inspection Hardness Log)
CREATE TABLE IF NOT EXISTS public.grn_items (
  id TEXT PRIMARY KEY,
  grn_number TEXT NOT NULL REFERENCES public.grn_orders(grn_number) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  po_qty NUMERIC(10, 2) NOT NULL,
  received_qty NUMERIC(10, 2) NOT NULL,
  accepted_qty NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'PCS',
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  batch_number TEXT,
  qc_status TEXT NOT NULL CHECK (qc_status IN ('Passed', 'Under Review', 'Failed')) DEFAULT 'Under Review',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_grn_orders_vendor ON public.grn_orders(vendor_name);
CREATE INDEX IF NOT EXISTS idx_grn_orders_status ON public.grn_orders(status);
CREATE INDEX IF NOT EXISTS idx_grn_orders_received_date ON public.grn_orders(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_number ON public.grn_items(grn_number);
CREATE INDEX IF NOT EXISTS idx_grn_items_qc_status ON public.grn_items(qc_status);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES (Allow public read and write access for application backend/client)
DROP POLICY IF EXISTS "Public read access on vendors" ON public.vendors;
CREATE POLICY "Public read access on vendors" ON public.vendors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write access on vendors" ON public.vendors;
CREATE POLICY "Public write access on vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access on grn_orders" ON public.grn_orders;
CREATE POLICY "Public read access on grn_orders" ON public.grn_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write access on grn_orders" ON public.grn_orders;
CREATE POLICY "Public write access on grn_orders" ON public.grn_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access on grn_items" ON public.grn_items;
CREATE POLICY "Public read access on grn_items" ON public.grn_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write access on grn_items" ON public.grn_items;
CREATE POLICY "Public write access on grn_items" ON public.grn_items FOR ALL USING (true) WITH CHECK (true);

-- 8. INITIAL SEED DATA
-- Insert Vendors
INSERT INTO public.vendors (vendor_code, vendor_name, category, contact_person, email, phone, lead_time_days, quality_rating, status)
VALUES
  ('VND-101', 'Apex Precision Logistics', 'Mechanical & Precision Hardware', 'Elena Rostova', 'elena.r@apex-precision.io', '+1 (555) 349-8821', 7, 4.95, 'Preferred'),
  ('VND-102', 'Nordic MicroSensors Inc.', 'Optics & Photonic Sensors', 'Sven Lindqvist', 'orders@nordic-sensors.se', '+46 8 123 4567', 14, 4.88, 'Active'),
  ('VND-103', 'Vertex Polymer Corp', 'Elastomers & Fluoropolymer Seals', 'Rachel Vance', 'sales@vertexpolymers.com', '+1 (555) 902-3341', 5, 4.62, 'Active'),
  ('VND-104', 'Shenzhen Dynatronics Ltd', 'Semiconductors & ICs', 'Wei Chen', 'supply@dynatronics-sz.cn', '+86 755 8320 9911', 10, 4.98, 'Preferred'),
  ('VND-105', 'AeroShield Composites', 'Aerospace Carbon Fiber & Resins', 'Harrison Cole', 'harrison@aeroshield-mfg.com', '+1 (555) 671-8840', 21, 4.75, 'Active'),
  ('VND-106', 'Solas Chemical Systems', 'High-Purity Solvents & Reagents', 'Dr. Arthur Pendelton', 'logistics@solas-chem.com', '+1 (555) 234-9910', 4, 3.85, 'On Probation')
ON CONFLICT (vendor_code) DO UPDATE
SET
  vendor_name = EXCLUDED.vendor_name,
  category = EXCLUDED.category,
  contact_person = EXCLUDED.contact_person,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  lead_time_days = EXCLUDED.lead_time_days,
  quality_rating = EXCLUDED.quality_rating,
  status = EXCLUDED.status;

-- Insert Master GRN Orders
INSERT INTO public.grn_orders (grn_number, po_number, vendor_name, received_date, warehouse, carrier_tracking, inspector, total_items, total_value, status, notes)
VALUES
  ('GRN-2026-001', 'PO-8842', 'Apex Precision Logistics', '2026-09-24', 'Bay-3 Central Hub', 'FEDX-982103', 'Marcus Vance', 120, 14850.00, 'Approved', 'Packaging intact. Heat seals and batch certificates verified.'),
  ('GRN-2026-002', 'PO-8843', 'Nordic MicroSensors Inc.', '2026-09-25', 'Zone-A Cleanroom', 'DHL-448102', 'Dr. Sarah Lin', 450, 32400.00, 'Pending QC', 'ESD bags sealed. Optical calibration testing scheduled for sensor array.'),
  ('GRN-2026-003', 'PO-8844', 'Vertex Polymer Corp', '2026-09-25', 'Bay-1 Chemical Vault', 'UPS-771290', 'Marcus Vance', 600, 8900.00, 'Partial', '50 units rejected due to durometer hardness variance outside tolerance.'),
  ('GRN-2026-004', 'PO-8845', 'Shenzhen Dynatronics Ltd', '2026-09-26', 'Zone-B High-Bay', 'EXP-109288', 'Elena Rostova', 1200, 56700.00, 'Approved', 'Tray packing 100% compliant with moisture barrier bags.'),
  ('GRN-2026-005', 'PO-8846', 'AeroShield Composites', '2026-09-27', 'Bay-4 Materials Lab', 'BLU-552910', 'Dr. Sarah Lin', 85, 24150.00, 'Pending QC', 'Carbon weave inspection underway. Ultrasonic density scan in progress.'),
  ('GRN-2026-006', 'PO-8847', 'Solas Chemical Systems', '2026-09-27', 'Bay-1 Chemical Vault', 'FRT-339102', 'David Kalu', 40, 11200.00, 'Rejected', 'Secondary containment drum puncture detected during inward dock offloading.')
ON CONFLICT (grn_number) DO UPDATE
SET
  po_number = EXCLUDED.po_number,
  vendor_name = EXCLUDED.vendor_name,
  received_date = EXCLUDED.received_date,
  warehouse = EXCLUDED.warehouse,
  carrier_tracking = EXCLUDED.carrier_tracking,
  inspector = EXCLUDED.inspector,
  total_items = EXCLUDED.total_items,
  total_value = EXCLUDED.total_value,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- Insert Line Items
INSERT INTO public.grn_items (id, grn_number, item_code, description, category, po_qty, received_qty, accepted_qty, rejected_qty, unit, unit_price, batch_number, qc_status, rejection_reason)
VALUES
  ('ITEM-001', 'GRN-2026-001', 'SKU-TX890', 'Titanium Actuator Rods (Grade 5)', 'Mechanical', 100, 100, 98, 2, 'PCS', 115.00, 'BATCH-202609-A', 'Passed', 'Minor thread burr on 2 pcs'),
  ('ITEM-002', 'GRN-2026-001', 'SKU-OR412', 'High-Temperature Fluoro O-Rings 40mm', 'Hardware', 20, 20, 20, 0, 'SETS', 167.50, 'BATCH-202609-B', 'Passed', NULL),
  ('ITEM-003', 'GRN-2026-002', 'SKU-OPT-10', 'Optical Flow Sensor Transmitters 850nm', 'Sensors', 250, 250, 0, 0, 'PCS', 88.00, 'OPT-8812-N', 'Under Review', 'Pending spectrum calibration verify'),
  ('ITEM-004', 'GRN-2026-002', 'SKU-RES-04', 'Ceramic Core Wirewound Resistors 100W', 'Electronics', 200, 200, 200, 0, 'PCS', 52.00, 'RES-7721-N', 'Passed', NULL),
  ('ITEM-005', 'GRN-2026-003', 'SKU-GSK-99', 'Viton Chemical Resistant Flange Gaskets', 'Polymers', 600, 600, 550, 50, 'PCS', 14.83, 'VT-992-01', 'Passed', '50 units failed durometer Shore A hardness threshold'),
  ('ITEM-006', 'GRN-2026-004', 'SKU-MCU-32', 'ARM Cortex-M4 Microcontroller 180MHz', 'Semiconductors', 1200, 1200, 1200, 0, 'PCS', 47.25, 'STM-2026-Q3', 'Passed', NULL),
  ('ITEM-007', 'GRN-2026-005', 'SKU-CRB-12', 'Prepreg Unidirectional Carbon Tape 300gsm', 'Composites', 85, 85, 0, 0, 'ROLLS', 284.11, 'CF-4481-9', 'Under Review', 'Resin content test batch 1 in thermal analyzer'),
  ('ITEM-008', 'GRN-2026-006', 'SKU-SLV-01', 'UltraPure Electronic Solvent 99.98% 25L', 'Chemicals', 40, 40, 0, 40, 'DRUMS', 280.00, 'SOL-661-X', 'Failed', 'Transport puncture on outer drum, nitrogen blanket seal compromised')
ON CONFLICT (id) DO UPDATE
SET
  item_code = EXCLUDED.item_code,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  po_qty = EXCLUDED.po_qty,
  received_qty = EXCLUDED.received_qty,
  accepted_qty = EXCLUDED.accepted_qty,
  rejected_qty = EXCLUDED.rejected_qty,
  unit = EXCLUDED.unit,
  unit_price = EXCLUDED.unit_price,
  batch_number = EXCLUDED.batch_number,
  qc_status = EXCLUDED.qc_status,
  rejection_reason = EXCLUDED.rejection_reason;
