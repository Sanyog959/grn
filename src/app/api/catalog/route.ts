import { NextResponse } from 'next/server';
import {
  getStoredCatalogItems,
  addOrUpdateStoredCatalogItem,
  deleteStoredCatalogItem,
} from '@/lib/store/inventoryStore';
import { MasterCatalogItem } from '@/types/inventory';
import { getPostgresPool } from '@/lib/db/postgres';
import { getSupabaseFromRequest } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    const category = searchParams.get('category');

    // 1. Try PostgreSQL
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          const res = await client.query('SELECT * FROM public.catalog_items ORDER BY item_code ASC');
          if (res.rows && res.rows.length > 0) {
            let dbItems: MasterCatalogItem[] = res.rows.map((r) => ({
              id: r.item_code,
              itemCode: r.item_code,
              itemName: r.item_name,
              category: r.category || 'Raw Material',
              hsnCode: r.hsn_code || '',
              uom: r.uom || 'PCS',
              defaultPrice: Number(r.default_price) || 0,
              minStock: Number(r.min_stock) || 0,
              reorderQty: Number(r.reorder_qty) || 0,
              status: (r.status as 'ACTIVE' | 'DISCONTINUED') || 'ACTIVE',
            }));

            if (search) {
              dbItems = dbItems.filter(
                (it) =>
                  it.itemCode.toLowerCase().includes(search) ||
                  it.itemName.toLowerCase().includes(search)
              );
            }
            if (category && category !== 'ALL') {
              dbItems = dbItems.filter((it) => it.category.toLowerCase() === category.toLowerCase());
            }

            return NextResponse.json({
              success: true,
              source: 'postgres',
              items: dbItems,
              total: dbItems.length,
            });
          }
        } finally {
          client.release();
        }
      } catch (pgErr) {
        // Fallback to local store if table not yet created
      }
    }

    // 2. Try Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        const { data, error } = await supabase.from('catalog_items').select('*').order('item_code');
        if (!error && data && data.length > 0) {
          let sbItems: MasterCatalogItem[] = data.map((r: any) => ({
            id: r.item_code,
            itemCode: r.item_code,
            itemName: r.item_name,
            category: r.category || 'Raw Material',
            hsnCode: r.hsn_code || '',
            uom: r.uom || 'PCS',
            defaultPrice: Number(r.default_price) || 0,
            minStock: Number(r.min_stock) || 0,
            reorderQty: Number(r.reorder_qty) || 0,
            status: r.status || 'ACTIVE',
          }));

          if (search) {
            sbItems = sbItems.filter(
              (it) =>
                it.itemCode.toLowerCase().includes(search) ||
                it.itemName.toLowerCase().includes(search)
            );
          }
          if (category && category !== 'ALL') {
            sbItems = sbItems.filter((it) => it.category.toLowerCase() === category.toLowerCase());
          }

          return NextResponse.json({
            success: true,
            source: 'supabase',
            items: sbItems,
            total: sbItems.length,
          });
        }
      } catch (sbErr) {
        // Fallback to local store
      }
    }

    // 3. Fallback to Persistent Local Store
    let items = getStoredCatalogItems();
    if (search) {
      items = items.filter(
        (it) =>
          it.itemCode.toLowerCase().includes(search) ||
          it.itemName.toLowerCase().includes(search) ||
          (it.category && it.category.toLowerCase().includes(search))
      );
    }
    if (category && category !== 'ALL') {
      items = items.filter((it) => it.category.toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      source: 'local_store',
      items,
      total: items.length,
    });
  } catch (err: unknown) {
    console.error('Catalog GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch catalog items' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = body as MasterCatalogItem;

    if (!item || !item.itemCode || !item.itemName) {
      return NextResponse.json(
        { success: false, error: 'Missing required itemCode or itemName' },
        { status: 400 }
      );
    }

    // 1. Save to local store
    const saved = addOrUpdateStoredCatalogItem(item);

    // 2. Try PostgreSQL
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO public.catalog_items 
             (item_code, item_name, category, hsn_code, uom, default_price, min_stock, reorder_qty, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (item_code) DO UPDATE SET
               item_name = EXCLUDED.item_name,
               category = EXCLUDED.category,
               hsn_code = EXCLUDED.hsn_code,
               uom = EXCLUDED.uom,
               default_price = EXCLUDED.default_price,
               min_stock = EXCLUDED.min_stock,
               reorder_qty = EXCLUDED.reorder_qty,
               status = EXCLUDED.status,
               updated_at = NOW()`,
            [
              saved.itemCode,
              saved.itemName,
              saved.category || 'Raw Material',
              saved.hsnCode || null,
              saved.uom || 'PCS',
              saved.defaultPrice || 0,
              saved.minStock || 0,
              saved.reorderQty || 0,
              saved.status || 'ACTIVE',
            ]
          );
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres catalog insert notice:', pgErr);
      }
    }

    // 3. Try Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await supabase.from('catalog_items').upsert([
          {
            item_code: saved.itemCode,
            item_name: saved.itemName,
            category: saved.category,
            hsn_code: saved.hsnCode,
            uom: saved.uom,
            default_price: saved.defaultPrice,
            min_stock: saved.minStock,
            reorder_qty: saved.reorderQty,
            status: saved.status,
          },
        ]);
      } catch (sbErr) {
        console.warn('Supabase catalog insert notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Product ${saved.itemName} (${saved.itemCode}) registered successfully`,
      item: saved,
    });
  } catch (err: unknown) {
    console.error('Catalog POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save product in catalog' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, updates } = body as { itemCode: string; updates: Partial<MasterCatalogItem> };

    if (!itemCode) {
      return NextResponse.json(
        { success: false, error: 'Missing itemCode for update' },
        { status: 400 }
      );
    }

    const items = getStoredCatalogItems();
    const existing = items.find((i) => i.itemCode.toLowerCase() === itemCode.toLowerCase());
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product with code ${itemCode} not found` },
        { status: 404 }
      );
    }

    const updatedItem: MasterCatalogItem = {
      ...existing,
      ...updates,
      itemCode: existing.itemCode,
      defaultPrice: updates.defaultPrice !== undefined ? Number(updates.defaultPrice) : existing.defaultPrice,
    };

    const saved = addOrUpdateStoredCatalogItem(updatedItem);

    // Try PostgreSQL
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE public.catalog_items 
             SET item_name = COALESCE($1, item_name),
                 category = COALESCE($2, category),
                 hsn_code = COALESCE($3, hsn_code),
                 uom = COALESCE($4, uom),
                 default_price = COALESCE($5, default_price),
                 min_stock = COALESCE($6, min_stock),
                 reorder_qty = COALESCE($7, reorder_qty),
                 status = COALESCE($8, status),
                 updated_at = NOW()
             WHERE item_code = $9`,
            [
              updates.itemName || null,
              updates.category || null,
              updates.hsnCode || null,
              updates.uom || null,
              updates.defaultPrice !== undefined ? Number(updates.defaultPrice) : null,
              updates.minStock !== undefined ? Number(updates.minStock) : null,
              updates.reorderQty !== undefined ? Number(updates.reorderQty) : null,
              updates.status || null,
              itemCode,
            ]
          );
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres catalog update notice:', pgErr);
      }
    }

    // Try Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await supabase
          .from('catalog_items')
          .update({
            ...(updates.itemName && { item_name: updates.itemName }),
            ...(updates.category && { category: updates.category }),
            ...(updates.hsnCode && { hsn_code: updates.hsnCode }),
            ...(updates.uom && { uom: updates.uom }),
            ...(updates.defaultPrice !== undefined && { default_price: Number(updates.defaultPrice) }),
            ...(updates.minStock !== undefined && { min_stock: Number(updates.minStock) }),
            ...(updates.reorderQty !== undefined && { reorder_qty: Number(updates.reorderQty) }),
            ...(updates.status && { status: updates.status }),
          })
          .eq('item_code', itemCode);
      } catch (sbErr) {
        console.warn('Supabase catalog update notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Product ${saved.itemName} (${itemCode}) updated successfully`,
      item: saved,
    });
  } catch (err: unknown) {
    console.error('Catalog PUT error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let itemCode = searchParams.get('code') || searchParams.get('itemCode');

    if (!itemCode) {
      try {
        const body = await request.json();
        itemCode = body?.itemCode || body?.code;
      } catch {
        // body may not be JSON
      }
    }

    if (!itemCode) {
      return NextResponse.json(
        { success: false, error: 'Missing itemCode for deletion' },
        { status: 400 }
      );
    }

    const deleted = deleteStoredCatalogItem(itemCode);

    // Try PostgreSQL
    const pool = getPostgresPool();
    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query('DELETE FROM public.catalog_items WHERE item_code = $1', [itemCode]);
        } finally {
          client.release();
        }
      } catch (pgErr) {
        console.warn('Postgres catalog delete notice:', pgErr);
      }
    }

    // Try Supabase
    const supabase = getSupabaseFromRequest(request);
    if (supabase) {
      try {
        await supabase.from('catalog_items').delete().eq('item_code', itemCode);
      } catch (sbErr) {
        console.warn('Supabase catalog delete notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Product ${itemCode} deleted successfully`,
      deleted,
    });
  } catch (err: unknown) {
    console.error('Catalog DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete product' },
      { status: 500 }
    );
  }
}
