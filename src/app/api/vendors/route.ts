import { NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabase/server';
import { createVendorInDb } from '@/lib/supabase/service';
import { fetchAllFromPostgres, insertVendorInPostgres } from '@/lib/db/service';
import { Vendor } from '@/types/inventory';
import { mapVendorFromDb, DatabaseVendorRow } from '@/lib/supabase/types';
import {
  getStoredVendors,
  addStoredVendor,
  updateStoredVendor,
  deleteStoredVendor,
} from '@/lib/store/inventoryStore';
import { getPostgresPool } from '@/lib/db/postgres';

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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { vendorCode, updates } = body as { vendorCode: string; updates: Partial<Vendor> };

    if (!vendorCode) {
      return NextResponse.json(
        { success: false, error: 'Missing vendorCode for update' },
        { status: 400 }
      );
    }

    // 1. Update in local store
    const updated = updateStoredVendor(vendorCode, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Vendor with code ${vendorCode} not found` },
        { status: 404 }
      );
    }

    // 2. Try PostgreSQL update
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE public.vendors 
             SET vendor_name = COALESCE($1, vendor_name),
                 category = COALESCE($2, category),
                 contact_person = COALESCE($3, contact_person),
                 email = COALESCE($4, email),
                 phone = COALESCE($5, phone),
                 address = COALESCE($6, address),
                 status = COALESCE($7, status),
                 quality_rating = COALESCE($8, quality_rating),
                 lead_time_days = COALESCE($9, lead_time_days),
                 updated_at = NOW()
             WHERE vendor_code = $10`,
            [
              updates.vendorName || null,
              updates.category || null,
              updates.contactPerson || null,
              updates.email || null,
              updates.phone || null,
              updates.address || null,
              updates.status || null,
              updates.qualityRating ?? null,
              updates.leadTimeDays ?? null,
              vendorCode,
            ]
          );
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres vendor update notice:', pgErr);
      }
    }

    // 3. Try Supabase update
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await supabase
          .from('vendors')
          .update({
            ...(updates.vendorName && { vendor_name: updates.vendorName }),
            ...(updates.category && { category: updates.category }),
            ...(updates.contactPerson && { contact_person: updates.contactPerson }),
            ...(updates.email && { email: updates.email }),
            ...(updates.phone && { phone: updates.phone }),
            ...(updates.address && { address: updates.address }),
            ...(updates.status && { status: updates.status }),
            ...(updates.qualityRating !== undefined && { quality_rating: updates.qualityRating }),
            ...(updates.leadTimeDays !== undefined && { lead_time_days: updates.leadTimeDays }),
          })
          .eq('vendor_code', vendorCode);
      } catch (sbErr) {
        console.warn('Supabase vendor update notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Supplier ${updated.vendorName} (${vendorCode}) updated successfully`,
      vendor: updated,
    });
  } catch (err: unknown) {
    console.error('Vendor PUT error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let vendorCode = searchParams.get('code') || searchParams.get('vendorCode');

    if (!vendorCode) {
      try {
        const body = await request.json();
        vendorCode = body?.vendorCode || body?.code;
      } catch {
        // body may not be JSON
      }
    }

    if (!vendorCode) {
      return NextResponse.json(
        { success: false, error: 'Missing vendorCode for deletion' },
        { status: 400 }
      );
    }

    // 1. Delete from local store
    const deleted = deleteStoredVendor(vendorCode);

    // 2. Try PostgreSQL delete
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query('DELETE FROM public.vendors WHERE vendor_code = $1', [vendorCode]);
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres vendor delete notice:', pgErr);
      }
    }

    // 3. Try Supabase delete
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await supabase.from('vendors').delete().eq('vendor_code', vendorCode);
      } catch (sbErr) {
        console.warn('Supabase vendor delete notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Supplier ${vendorCode} deleted successfully`,
      deleted,
    });
  } catch (err: unknown) {
    console.error('Vendor DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
