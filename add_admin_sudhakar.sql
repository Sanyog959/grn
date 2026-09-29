-- ==============================================================================
-- Add / Update Administrator: Sudhakar Magar
-- Email: magarsudhakar51@gmail.com
-- Password: Password@123
-- Status: ADMIN, ACTIVE, APPROVED, EMAIL VERIFIED
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_admin_permissions JSONB;
BEGIN
  -- 1. Encrypt password using Blowfish bcrypt (Supabase Auth standard)
  v_encrypted_pw := crypt('Password@123', gen_salt('bf'));

  -- 2. Full Granular Permissions across all MIMS modules
  v_admin_permissions := '{
    "dashboard": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "purchase": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "grn": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "qc": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "inventory": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "production": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "dispatch": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "masters": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "reports": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true},
    "users": {"canView": true, "canCreate": true, "canEdit": true, "canDelete": true, "canApprove": true}
  }'::jsonb;

  -- 3. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'magarsudhakar51@gmail.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Create user in Supabase Auth (email_confirmed_at = NOW() verifies email immediately)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'magarsudhakar51@gmail.com',
      v_encrypted_pw,
      NOW(), -- Email confirmed & verified
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Sudhakar Magar", "role": "ADMIN"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Create email identity in auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      format('{"sub": "%s", "email": "%s"}', v_user_id::text, 'magarsudhakar51@gmail.com')::jsonb,
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

  ELSE
    -- If user already exists, update credentials, verify email, and upgrade to ADMIN
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
        raw_user_meta_data = '{"full_name": "Sudhakar Magar", "role": "ADMIN"}'::jsonb,
        updated_at = NOW()
    WHERE id = v_user_id;

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        format('{"sub": "%s", "email": "%s"}', v_user_id::text, 'magarsudhakar51@gmail.com')::jsonb,
        'email',
        v_user_id::text,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- 4. Upsert into public.profiles with full ADMIN role, active status, and approved status
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
  ) VALUES (
    v_user_id,
    'magarsudhakar51@gmail.com',
    'Sudhakar Magar',
    'ADMIN',
    true,
    'APPROVED',
    v_admin_permissions,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Sudhakar Magar',
    role = 'ADMIN',
    is_active = true,
    approval_status = 'APPROVED',
    permissions = v_admin_permissions,
    updated_at = NOW();

END $$;

-- 5. Verification Query: Confirm user was created properly
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.approval_status,
  u.email_confirmed_at IS NOT NULL AS email_is_verified,
  p.permissions->'dashboard'->>'canApprove' AS dashboard_admin_grant,
  p.permissions->'users'->>'canApprove' AS users_rbac_grant
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'magarsudhakar51@gmail.com';
