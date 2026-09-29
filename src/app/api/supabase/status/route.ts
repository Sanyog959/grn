import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, getSupabaseServerClient } from '@/lib/supabase/server';
import { testSupabaseConnection, seedDemoDataToSupabase } from '@/lib/supabase/service';
import { getPostgresPool } from '@/lib/db/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customUrl = searchParams.get('url') || undefined;
  const customKey = searchParams.get('key') || undefined;

  // 1. Try Direct PostgreSQL Connection first
  const pool = getPostgresPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const [vendorsRes, ordersRes, itemsRes] = await Promise.all([
          client.query('SELECT COUNT(*) FROM public.vendors'),
          client.query('SELECT COUNT(*) FROM public.grn_orders'),
          client.query('SELECT COUNT(*) FROM public.grn_items'),
        ]);

        return NextResponse.json({
          connected: true,
          configured: true,
          source: 'supabase_postgres',
          message: 'Connected directly to Supabase PostgreSQL database',
          tables: {
            vendors: { exists: true, count: parseInt(vendorsRes.rows[0].count, 10) },
            grn_orders: { exists: true, count: parseInt(ordersRes.rows[0].count, 10) },
            grn_items: { exists: true, count: parseInt(itemsRes.rows[0].count, 10) },
          },
        });
      } catch (tableErr: unknown) {
        return NextResponse.json({
          connected: true,
          configured: true,
          source: 'supabase_postgres',
          message: 'Connected to Supabase PostgreSQL, but tables need to be created. Run setup-db.bat.',
          error: tableErr instanceof Error ? tableErr.message : 'Tables missing',
          tables: {
            vendors: { exists: false, count: 0 },
            grn_orders: { exists: false, count: 0 },
            grn_items: { exists: false, count: 0 },
          },
        });
      } finally {
        client.release();
      }
    } catch (pgErr: unknown) {
      console.warn('Direct PostgreSQL connection error, falling back to Supabase client:', pgErr);
    }
  }

  // 2. Try Supabase REST Client
  let client = getSupabaseFromRequest(request);
  if (!client && customUrl && customKey) {
    client = getSupabaseServerClient(customUrl, customKey);
  }

  if (!client) {
    return NextResponse.json({
      connected: false,
      configured: false,
      source: 'standby',
      message: 'Supabase credentials not fully configured in environment or request headers',
    });
  }

  const result = await testSupabaseConnection(client);
  return NextResponse.json({
    ...result,
    configured: true,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { customUrl, customKey } = body as { customUrl?: string; customKey?: string };

    let client = getSupabaseFromRequest(request);
    if (!client && customUrl && customKey) {
      client = getSupabaseServerClient(customUrl, customKey);
    }

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase credentials not configured. Please supply project URL and Key.',
        },
        { status: 400 }
      );
    }

    const seedResult = await seedDemoDataToSupabase(client);

    return NextResponse.json({
      success: true,
      message: 'Database schema verified and master tables ready!',
      ...seedResult,
    });
  } catch (err: unknown) {
    console.error('Supabase verification error:', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to verify master tables. Please check that SQL schema is applied.',
      },
      { status: 500 }
    );
  }
}
