
export enum ItemType {
  NORMAL = 'عادي',
  SPECIAL = 'خاص',
  OTHER = 'أخرى',
}

export const ItemTypeShort = {
  [ItemType.NORMAL]: 'REG',
  [ItemType.SPECIAL]: 'SPE',
  [ItemType.OTHER]: 'OTH',
};

export enum TaxMethod {
  PER_UNIT = 'لكل وحدة',
  TOTAL = 'إجمالي',
}

export interface UserPermission {
  key: 'calculator' | 'invoices' | 'reports' | 'settings' | 'suppliers' | 'clients' | 'items';
  label: string;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for list display safety
  fullName: string;
  role: 'admin' | 'user';
  permissions: string[]; // keys of permissions
}

export interface AppSettings {
  discountNormal: number;
  discountSpecial: number;
  discountOther: number;
  pharmacyName: string;
  users: User[]; // قائمة المستخدمين
  userAvatar?: string;
  logoText?: string; // نص اللوجو المخصص
}

export interface ItemCatalogEntry {
  id: string;
  name: string;
  type: ItemType;
  publicPrice: number;
  pharmaPrice: number;
  barcode?: string;
  minQtyAlert?: number; // للتنبيهات
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  discountNormal?: number;
  discountSpecial?: number;
  discountOther?: number;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  notes?: string;
  discountNormal?: number;
  discountSpecial?: number;
  discountOther?: number;
}

export interface ClientTransaction {
  id: string;
  clientId: string;
  date: string;
  type: 'SALE' | 'PAYMENT';
  amount: number;
  notes?: string;
  relatedInvoiceId?: string;
  invoiceNumber?: string;
}

export interface ItemInput {
  id: string;
  name: string;
  type: ItemType;
  qty: number;
  bonus: number;
  publicPrice: number;
  pharmaPrice: number;
  supplierDiscountVal: number;
  extraDiscountPct: number;
  taxValue: number;
  taxMethod: TaxMethod;
  customTypeDiscount?: number;
}

export interface CalculatedItem extends ItemInput {
  totalUnits: number;
  baseTotal: number;
  typeDiscountValue: number;
  afterTypeDiscount: number;
  extraDiscountValue: number;
  taxTotal: number;
  netTotalCost: number;
  netUnitCost: number;
  realDiscountPct: number;
  historyComparison?: 'better' | 'worse' | 'same' | 'new';
  priceDifferencePct?: number;
  savingsVsHistory?: number;
  isFakeDiscount?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  invoiceNumber?: string;
  supplierId?: string;
  supplierName?: string;
  items: CalculatedItem[];
  totalValue: number;
  totalItems: number;
  totalUnits: number;
  isSold?: boolean;
  soldToClientId?: string;
  soldDate?: string;
}

export const DEFAULT_USER: User = {
  id: 'admin_1',
  username: 'Abdullah',
  password: '7837047136367',
  fullName: 'Abdullah Mohsin',
  role: 'admin',
  permissions: ['*']
};

export const DEFAULT_SETTINGS: AppSettings = {
  discountNormal: 20,
  discountSpecial: 10,
  discountOther: 0,
  pharmacyName: 'صيدليتي الذكية',
  users: [DEFAULT_USER],
  logoText: 'Abdullah Mohsin'
};
