import fs from 'fs';
import path from 'path';
import { GRNOrder, GRNItem, Vendor } from '@/types/inventory';

const DATA_DIR = path.join(process.cwd(), 'data');
const VENDORS_FILE = path.join(DATA_DIR, 'vendors.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');

const INITIAL_VENDORS: Vendor[] = [
  {
    vendorCode: 'VND-101',
    vendorName: 'Apex Precision Logistics',
    category: 'Mechanical & Precision Hardware',
    contactPerson: 'Elena Rostova',
    email: 'elena.r@apex-precision.io',
    phone: '+91 98220 11223',
    leadTimeDays: 7,
    qualityRating: 4.95,
    status: 'Preferred',
  },
  {
    vendorCode: 'VND-102',
    vendorName: 'Nordic MicroSensors Inc.',
    category: 'Optics & Photonic Sensors',
    contactPerson: 'Sven Lindqvist',
    email: 'orders@nordic-sensors.se',
    phone: '+91 99330 44556',
    leadTimeDays: 14,
    qualityRating: 4.88,
    status: 'Active',
  },
  {
    vendorCode: 'VND-103',
    vendorName: 'Vertex Polymer Corp',
    category: 'Elastomers & Fluoropolymer Seals',
    contactPerson: 'Rachel Vance',
    email: 'sales@vertexpolymers.com',
    phone: '+91 97440 77889',
    leadTimeDays: 5,
    qualityRating: 4.62,
    status: 'Active',
  },
];

function ensureStoreFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VENDORS_FILE)) {
    fs.writeFileSync(VENDORS_FILE, JSON.stringify(INITIAL_VENDORS, null, 2), 'utf8');
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(ITEMS_FILE)) {
    fs.writeFileSync(ITEMS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getStoredVendors(): Vendor[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(VENDORS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDORS;
  }
}

export function saveStoredVendors(vendors: Vendor[]) {
  ensureStoreFiles();
  fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
}

export function addStoredVendor(vendor: Vendor) {
  const vendors = getStoredVendors();
  const idx = vendors.findIndex((v) => v.vendorCode === vendor.vendorCode);
  if (idx >= 0) {
    vendors[idx] = vendor;
  } else {
    vendors.unshift(vendor);
  }
  saveStoredVendors(vendors);
}

export function getStoredOrders(): GRNOrder[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: GRNOrder[]) {
  ensureStoreFiles();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

export function addStoredOrder(order: GRNOrder) {
  const orders = getStoredOrders();
  const idx = orders.findIndex((o) => o.grnNumber === order.grnNumber);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.unshift(order);
  }
  saveStoredOrders(orders);
}

export function updateStoredOrderStatus(grnNumber: string, status: 'Approved' | 'Pending QC' | 'Partial' | 'Rejected') {
  const orders = getStoredOrders();
  const idx = orders.findIndex((o) => o.grnNumber === grnNumber);
  if (idx >= 0) {
    orders[idx].status = status;
    saveStoredOrders(orders);
  }
}

export function getStoredItems(): GRNItem[] {
  ensureStoreFiles();
  try {
    const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredItems(items: GRNItem[]) {
  ensureStoreFiles();
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export function addStoredItems(newItems: GRNItem[]) {
  const items = getStoredItems();
  const map = new Map<string, GRNItem>();
  newItems.forEach((it) => map.set(it.id, it));
  items.forEach((it) => {
    if (!map.has(it.id)) map.set(it.id, it);
  });
  saveStoredItems(Array.from(map.values()));
}

export function updateStoredItemQc(
  itemId: string,
  qcStatus: 'Passed' | 'Under Review' | 'Failed',
  rejectionReason?: string
) {
  const items = getStoredItems();
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx >= 0) {
    items[idx].qcStatus = qcStatus;
    if (qcStatus === 'Passed') {
      items[idx].acceptedQty = items[idx].receivedQty;
      items[idx].rejectedQty = 0;
    } else if (qcStatus === 'Failed') {
      items[idx].acceptedQty = 0;
      items[idx].rejectedQty = items[idx].receivedQty;
    }
    if (rejectionReason) items[idx].rejectionReason = rejectionReason;
    saveStoredItems(items);
  }
}
