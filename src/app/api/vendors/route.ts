import { NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabase/server';
import { createVendorInDb } from '@/lib/supabase/service';
import { fetchAllFromPostgres, insertVendorInPostgres } from '@/lib/db/service';
import { Vendor } from '@/types/inventory';
import { mapVendorFromDb, DatabaseVendorRow } from '@/lib/supabase/types';
import { getStoredVendors, addStoredVendor } from '@/lib/store/inventoryStore';

export async function GET(request: Request) {
  const localVendors = getStoredVendors();

  // Try PostgreSQL
  try {
    const pgData = await fetchAllFromPostgres();
    if (pgData && pgData.vendors && pgData.vendors.length > 0) {
      const mergedMap = new Map<string, Vendor>();
      localVendors.forEach((v) => mergedMap.set(v.vendorCode, v));
      pgData.vendors.forEach((v) => mergedMap.set(v.vendorCode, v));
      const vendors = Array.from(mergedMap.values());
      return NextResponse.json({
        success: true,
        source: 'supabase_postgres',
        connected: true,
        vendors,
        total: vendors.length,
      });
    }
  } catch (pgErr: unknown) {
    console.warn('PostgreSQL vendors query fallback:', pgErr);
  }

  // Try Supabase Client
  const supabase = getSupabaseFromRequest(request);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbVendors = (data as DatabaseVendorRow[]).map(mapVendorFromDb);
        const mergedMap = new Map<string, Vendor>();
        localVendors.forEach((v) => mergedMap.set(v.vendorCode, v));
        dbVendors.forEach((v) => mergedMap.set(v.vendorCode, v));
        const vendors = Array.from(mergedMap.values());
        return NextResponse.json({
          success: true,
          source: 'supabase',
          connected: true,
          vendors,
          total: vendors.length,
        });
      }
    } catch (err: unknown) {
      console.warn('Supabase vendors query fallback:', err);
    }
  }

  return NextResponse.json({
    success: true,
    source: 'local_store',
    connected: false,
    vendors: localVendors,
    total: localVendors.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vendor = body as Vendor;

    if (!vendor || !vendor.vendorCode || !vendor.vendorName) {
      return NextResponse.json(
        { success: false, error: 'Missing required vendor code or name' },
        { status: 400 }
      );
    }

    // 1. Save to persistent local store first (Guarantees zero data loss)
    addStoredVendor(vendor);

    // 2. Try saving to PostgreSQL
    try {
      await insertVendorInPostgres(vendor);
    } catch (pgErr: unknown) {
      console.warn('PostgreSQL vendor insert fallback:', pgErr);
    }

    // 3. Try saving to Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await createVendorInDb(supabase, vendor);
      } catch (err: unknown) {
        console.warn('Supabase vendor insert fallback:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Supplier ${vendor.vendorName} (${vendor.vendorCode}) registered successfully`,
      data: vendor,
    });
  } catch (err) {
    console.error('Vendor API error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid vendor payload' },
      { status: 400 }
    );
  }
}
