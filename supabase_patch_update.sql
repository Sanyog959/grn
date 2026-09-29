-- ==============================================================================
-- MIMS SUPABASE MIGRATION / PATCH UPDATE
-- File: supabase_patch_update.sql
-- Description: Run this SQL script in Supabase SQL Editor to update your existing
--              database schema with the latest RBAC, Approval Gates, and RLS fixes.
-- Safe to run on existing database (Will NOT delete or drop your existing tables/data).
-- ==============================================================================

-- 1. ADD NEW COLUMNS TO PROFILES (IF NOT EXISTS)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING';

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add check constraint for approval_status safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approval_status_check'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_approval_status_check 
      CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
  END IF;
END $$;

-- 2. MIGRATE EXISTING PROFILES: Update approval_status based on current is_active & role
UPDATE public.profiles
SET approval_status = CASE 
  WHEN role = 'ADMIN' THEN 'APPROVED'
  WHEN is_active = true THEN 'APPROVED'
  ELSE 'PENDING'
END
WHERE approval_status IS NULL OR approval_status = 'PENDING';

-- 3. ENSURE PLANT ADMINISTRATOR HAS FULL ACCESS
UPDATE public.profiles
SET role = 'ADMIN',
    is_active = true,
    approval_status = 'APPROVED'
WHERE email = 'sales@sanyogengineers.co.in';

-- 4. FIX SECURITY DEFINER FUNCTIONS (Prevents RLS Recursion / Stack Depth Limit Error 54001)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'ADMIN' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 5. UPDATE AUTH TRIGGER FOR NEW REGISTRATIONS
-- All new signups default to PENDING approval (unless matching super admin email)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_assigned_role TEXT;
  v_assigned_status TEXT;
  v_assigned_active BOOLEAN;
BEGIN
  v_is_super_admin := LOWER(TRIM(NEW.email)) = 'sales@sanyogengineers.co.in';
  
  IF v_is_super_admin THEN
    v_assigned_role := 'ADMIN';
    v_assigned_status := 'APPROVED';
    v_assigned_active := true;
  ELSE
    v_assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER');
    v_assigned_status := 'PENDING';
    v_assigned_active := false;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    is_active, 
    approval_status, 
    permissions,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_assigned_role,
    v_assigned_active,
    v_assigned_status,
    '{}'::jsonb,
    TIMEZONE('utc'::TEXT, NOW()),
    TIMEZONE('utc'::TEXT, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = TIMEZONE('utc'::TEXT, NOW());

  RETURN NEW;
END;
$$;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. FIX ROW LEVEL SECURITY (RLS) POLICIES ON PROFILES
-- Drop any conflicting or recursive old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Admins full profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can modify any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;

-- Create clean, non-recursive policies
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admins can modify any profile" 
  ON public.profiles FOR UPDATE 
  USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admins can delete any profile" 
  ON public.profiles FOR DELETE 
  USING (public.is_admin() OR auth.role() = 'service_role');

-- 7. REFRESH STATUS CONFIRMATION
SELECT 
  'SUCCESS: Schema patch applied cleanly!' AS status,
  COUNT(*) AS total_profiles,
  COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved_count,
  COUNT(*) FILTER (WHERE approval_status = 'PENDING') AS pending_count
FROM public.profiles;
