-- ==============================================================================
-- MIMS / AURA FACTORY INVENTORY & MANUFACTURING SUITE
-- File: update2.sql (WIPE ALL DATA - KEEP ONLY ADMIN CREDENTIALS)
-- 
-- Description:
--   PURE DELETE SCRIPT (NO INSERTS, NO FOREIGN KEY CONFLICTS).
--   Deletes all transactional data across all manufacturing tables.
--   Removes all non-admin accounts from public.profiles.
-- 
-- Instructions:
--   Copy and paste this into your Supabase SQL Editor and click Run.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Wipe all operational tables (child tables first, parent tables last)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispatch_records') THEN
    DELETE FROM public.dispatch_records;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finished_goods_stock') THEN
    DELETE FROM public.finished_goods_stock;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_issues') THEN
    DELETE FROM public.production_issues;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qc_inspections') THEN
    DELETE FROM public.qc_inspections;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grn_inward_batches') THEN
    DELETE FROM public.grn_inward_batches;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grn_items') THEN
    DELETE FROM public.grn_items;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grn_orders') THEN
    DELETE FROM public.grn_orders;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_items') THEN
    DELETE FROM public.purchase_order_items;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    DELETE FROM public.purchase_orders;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger') THEN
    DELETE FROM public.stock_ledger;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'catalog_items') THEN
    DELETE FROM public.catalog_items;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    DELETE FROM public.customers;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') THEN
    DELETE FROM public.vendors;
  END IF;

  -- 2. Delete all non-admin staff from profiles (ZERO INSERTS, PURE DELETE)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DELETE FROM public.profiles 
    WHERE UPPER(COALESCE(role::text, '')) NOT LIKE '%ADMIN%';
  END IF;
END $$;

-- 3. Verification: Show remaining Admin account(s)
SELECT 
  'DATABASE WIPED - ONLY ADMIN KEPT' AS status,
  id, 
  email, 
  role
FROM public.profiles;
