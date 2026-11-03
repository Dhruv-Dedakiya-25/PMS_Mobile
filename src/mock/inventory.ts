/**
 * The maintenance store's items and the technician's material requests, on sample data until
 * the inventory API exists (the website's Inventory page has the same items). A request made
 * here lasts until the app reloads; approval happens on the website.
 */
import { useSyncExternalStore } from 'react';

export type InventoryUnit = 'Piece' | 'Meter' | 'Roll' | 'Kg' | 'Liter' | 'Box' | 'Can' | 'Set';

export interface InventoryItem {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAr?: string;
  unit: InventoryUnit;
  reorderLevel: number;
  onHand: number;
}

export interface MaterialRequest {
  id: string;
  number: string;
  requestedAt: string;
  ticketId?: string;
  ticketNumber?: string;
  notes?: string;
  lines: { itemId: string; quantity: number }[];
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectReason?: string;
}

const items: InventoryItem[] = [
  { id: 'i1', itemCode: 'INV-PL-001', nameEn: 'PVC pipe 1/2"', nameAr: 'أنبوب PVC نصف بوصة', unit: 'Meter', reorderLevel: 30, onHand: 120 },
  { id: 'i2', itemCode: 'INV-PL-002', nameEn: 'Mixer tap cartridge', nameAr: 'خرطوشة خلاط', unit: 'Piece', reorderLevel: 5, onHand: 4 },
  { id: 'i3', itemCode: 'INV-PL-003', nameEn: 'PTFE thread tape', nameAr: 'شريط تفلون', unit: 'Roll', reorderLevel: 20, onHand: 64 },
  { id: 'i4', itemCode: 'INV-EL-001', nameEn: 'LED tube light 18W', nameAr: 'أنبوب إنارة LED ‏18 واط', unit: 'Piece', reorderLevel: 15, onHand: 36 },
  { id: 'i5', itemCode: 'INV-EL-002', nameEn: 'MCB 20A single pole', nameAr: 'قاطع كهربائي 20 أمبير', unit: 'Piece', reorderLevel: 6, onHand: 9 },
  { id: 'i6', itemCode: 'INV-EL-003', nameEn: 'Cable 2.5 mm²', nameAr: 'كابل 2.5 مم²', unit: 'Meter', reorderLevel: 50, onHand: 0 },
  { id: 'i7', itemCode: 'INV-HV-001', nameEn: 'AC filter 24×24', nameAr: 'فلتر مكيف 24×24', unit: 'Piece', reorderLevel: 10, onHand: 6 },
  { id: 'i8', itemCode: 'INV-HV-002', nameEn: 'R410A refrigerant', nameAr: 'غاز تبريد R410A', unit: 'Kg', reorderLevel: 5, onHand: 12 },
  { id: 'i9', itemCode: 'INV-PT-001', nameEn: 'Wall paint white 4 L', nameAr: 'دهان جدران أبيض 4 لتر', unit: 'Can', reorderLevel: 4, onHand: 10 },
  { id: 'i10', itemCode: 'INV-GN-001', nameEn: 'Silicone sealant', nameAr: 'سيليكون عازل', unit: 'Piece', reorderLevel: 12, onHand: 30 },
];

let state = {
  items,
  requests: [
    { id: 'r3', number: 'REQ-2026-0003', requestedAt: '2026-11-03T07:40:00Z', ticketId: '648a0556-65ee-4ed2-bc00-61103801ce7d', ticketNumber: 'SR-10482', notes: 'AC in A-1204 not cooling: filter and gas top-up.', lines: [{ itemId: 'i7', quantity: 2 }, { itemId: 'i8', quantity: 3 }], status: 'Pending' },
    { id: 'r2', number: 'REQ-2026-0002', requestedAt: '2026-11-01T09:15:00Z', ticketId: '0fa819c1-506c-40a5-aadd-9b3655b34902', ticketNumber: 'SR-10310', lines: [{ itemId: 'i2', quantity: 1 }, { itemId: 'i3', quantity: 2 }], status: 'Approved' },
    { id: 'r1', number: 'REQ-2026-0001', requestedAt: '2026-10-28T06:30:00Z', notes: 'Corridor lights, Tower A floors 3 to 6.', lines: [{ itemId: 'i4', quantity: 6 }], status: 'Approved' },
  ] as MaterialRequest[],
};
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const useInventory = () => useSyncExternalStore(subscribe, () => state);

export const stockLevel = (item: InventoryItem): 'Out' | 'Low' | 'OK' =>
  item.onHand <= 0 ? 'Out' : item.onHand <= item.reorderLevel ? 'Low' : 'OK';

export function createRequest(input: Omit<MaterialRequest, 'id' | 'number' | 'requestedAt' | 'status'>): MaterialRequest {
  const year = new Date().getFullYear();
  const seq = state.requests.filter((r) => r.number.startsWith(`REQ-${year}-`)).length + 1;
  const request: MaterialRequest = {
    ...input,
    id: `r${Date.now()}`,
    number: `REQ-${year}-${String(seq).padStart(4, '0')}`,
    requestedAt: new Date().toISOString(),
    status: 'Pending',
  };
  state = { ...state, requests: [request, ...state.requests] };
  listeners.forEach((l) => l());
  return request;
}
