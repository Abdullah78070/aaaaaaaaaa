
import { AppSettings, DEFAULT_SETTINGS, Invoice, CalculatedItem, Supplier, Client, ClientTransaction, ItemCatalogEntry, User } from '../types';
import CryptoJS from 'crypto-js';

const KEYS = {
  SETTINGS: 'pharmamind_settings',
  INVOICES: 'pharmamind_invoices',
  SUPPLIERS: 'pharmamind_suppliers',
  CLIENTS: 'pharmamind_clients',
  TRANSACTIONS: 'pharmamind_transactions',
  CATALOG: 'pharmamind_catalog',
};

// مفتاح التشفير السري (مشتق من كلمة المرور الافتراضية لزيادة التعقيد)
// هذا يمنع أي شخص من نسخ ملفات المتصفح وقراءة البيانات
const SECRET_KEY = "PHARMA_MIND_SECURE_7837047136367";

// دوال مساعدة للتشفير وفك التشفير
const encrypt = (data: any): string => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
  } catch (e) {
    console.error("Encryption Error", e);
    return "";
  }
};

const decrypt = (ciphertext: string | null): any => {
  if (!ciphertext) return null;
  try {
    // محاولة قراءة البيانات القديمة (غير المشفرة) في حال التحديث
    if (ciphertext.startsWith('[') || ciphertext.startsWith('{')) {
        return JSON.parse(ciphertext);
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch (e) {
    console.error("Decryption Error", e);
    return null;
  }
};

export const StorageService = {
  // Settings & Users
  getSettings: (): AppSettings => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.SETTINGS));
      if (data) {
        // Ensure users array exists for migration
        if (!data.users || data.users.length === 0) {
            data.users = [DEFAULT_SETTINGS.users[0]];
        }
        return data;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },
  
  saveSettings: (settings: AppSettings): void => {
    localStorage.setItem(KEYS.SETTINGS, encrypt(settings));
  },

  getCurrentUser: (): User | null => {
      const userStr = sessionStorage.getItem('current_user');
      return userStr ? JSON.parse(userStr) : null;
  },

  // Item Catalog
  getCatalog: (): ItemCatalogEntry[] => {
      try {
          const data = decrypt(localStorage.getItem(KEYS.CATALOG));
          return data || [];
      } catch { return []; }
  },

  saveCatalogItem: (item: ItemCatalogEntry): void => {
      const list = StorageService.getCatalog();
      const idx = list.findIndex(i => i.id === item.id);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      localStorage.setItem(KEYS.CATALOG, encrypt(list));
  },

  deleteCatalogItem: (id: string): void => {
      const list = StorageService.getCatalog();
      const updated = list.filter(i => i.id !== id);
      localStorage.setItem(KEYS.CATALOG, encrypt(updated));
  },

  importCatalog: (items: ItemCatalogEntry[]): void => {
      const current = StorageService.getCatalog();
      items.forEach(newItem => {
          const existingIdx = current.findIndex(c => c.name.trim().toLowerCase() === newItem.name.trim().toLowerCase());
          if (existingIdx >= 0) {
              current[existingIdx] = { ...current[existingIdx], ...newItem, id: current[existingIdx].id };
          } else {
              current.push({ ...newItem, id: Date.now().toString() + Math.random() });
          }
      });
      localStorage.setItem(KEYS.CATALOG, encrypt(current));
  },

  // Suppliers
  getSuppliers: (): Supplier[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.SUPPLIERS));
      return data || [];
    } catch (e) { return []; }
  },

  saveSupplier: (supplier: Supplier): void => {
    const list = StorageService.getSuppliers();
    const existingIndex = list.findIndex(s => s.id === supplier.id);
    if (existingIndex >= 0) {
        list[existingIndex] = supplier;
    } else {
        list.push(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, encrypt(list));
  },

  deleteSupplier: (id: string): void => {
    const list = StorageService.getSuppliers();
    const updated = list.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUPPLIERS, encrypt(updated));
  },

  // Clients
  getClients: (): Client[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.CLIENTS));
      return data || [];
    } catch (e) { return []; }
  },

  saveClient: (client: Client): void => {
    const list = StorageService.getClients();
    const existingIndex = list.findIndex(c => c.id === client.id);
    if (existingIndex >= 0) {
        list[existingIndex] = client;
    } else {
        list.push(client);
    }
    localStorage.setItem(KEYS.CLIENTS, encrypt(list));
  },

  deleteClient: (id: string): void => {
    const list = StorageService.getClients();
    const updated = list.filter(c => c.id !== id);
    localStorage.setItem(KEYS.CLIENTS, encrypt(updated));
  },

  // Client Transactions
  getTransactions: (clientId?: string): ClientTransaction[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.TRANSACTIONS));
      const all = data || [];
      if (clientId) {
        return all.filter((t: ClientTransaction) => t.clientId === clientId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return all;
    } catch (e) { return []; }
  },

  addTransaction: (transaction: ClientTransaction): void => {
    const transactions = StorageService.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(KEYS.TRANSACTIONS, encrypt(transactions));

    // Update Client Balance
    const clients = StorageService.getClients();
    const clientIndex = clients.findIndex(c => c.id === transaction.clientId);
    if (clientIndex >= 0) {
        const client = clients[clientIndex];
        if (transaction.type === 'SALE') {
            client.balance += transaction.amount;
        } else {
            client.balance -= transaction.amount;
        }
        clients[clientIndex] = client;
        localStorage.setItem(KEYS.CLIENTS, encrypt(clients));
    }
  },

  // Invoices
  getInvoices: (): Invoice[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.INVOICES));
      return data || [];
    } catch (e) { return []; }
  },

  getInvoiceById: (id: string): Invoice | undefined => {
      return StorageService.getInvoices().find(i => i.id === id);
  },

  saveInvoice: (invoice: Invoice): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(i => i.id === invoice.id);
    
    if (index >= 0) {
        invoices[index] = invoice;
    } else {
        invoices.unshift(invoice);
    }
    localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
    
    // Auto-save items to Catalog
    const catalog = StorageService.getCatalog();
    let catalogChanged = false;
    invoice.items.forEach(item => {
        if (!catalog.some(c => c.name.trim().toLowerCase() === item.name.trim().toLowerCase())) {
            catalog.push({
                id: Date.now().toString() + Math.random(),
                name: item.name,
                type: item.type,
                publicPrice: item.publicPrice,
                pharmaPrice: item.pharmaPrice
            });
            catalogChanged = true;
        }
    });
    if (catalogChanged) localStorage.setItem(KEYS.CATALOG, encrypt(catalog));
  },

  markInvoiceAsSold: (invoiceId: string, clientId: string): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index >= 0) {
        invoices[index].isSold = true;
        invoices[index].soldToClientId = clientId;
        invoices[index].soldDate = new Date().toISOString();
        localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
    }
  },

  deleteInvoice: (id: string): void => {
    const invoices = StorageService.getInvoices();
    const updated = invoices.filter(inv => inv.id !== id);
    localStorage.setItem(KEYS.INVOICES, encrypt(updated));
  },

  // AI Helper: Get last purchase of an item
  getLastPurchaseItem: (itemName: string): CalculatedItem | null => {
    const invoices = StorageService.getInvoices();
    for (const inv of invoices) {
      const found = inv.items.find(item => item.name.trim().toLowerCase() === itemName.trim().toLowerCase());
      if (found) return found;
    }
    return null;
  },

  // AI Helper: Get last purchase of an item with bonus
  getItemWithBonusHistory: (itemName: string): CalculatedItem | null => {
    const invoices = StorageService.getInvoices();
    for (const inv of invoices) {
      const found = inv.items.find(item => 
        item.name.trim().toLowerCase() === itemName.trim().toLowerCase() && 
        item.bonus > 0
      );
      if (found) return found;
    }
    return null;
  },

  getAllItemNames: (): string[] => {
    const catalogNames = StorageService.getCatalog().map(c => c.name);
    const invoiceNames = new Set<string>();
    StorageService.getInvoices().forEach(inv => {
        inv.items.forEach(item => invoiceNames.add(item.name));
    });
    return Array.from(new Set([...catalogNames, ...Array.from(invoiceNames)]));
  },
  
  getCatalogItemByName: (name: string): ItemCatalogEntry | undefined => {
      return StorageService.getCatalog().find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  },

  // --- BACKUP & RESTORE (Decrypted for JSON Export, Encrypted for Import) ---
  createBackup: (): string => {
      const backup = {
          settings: StorageService.getSettings(),
          suppliers: StorageService.getSuppliers(),
          clients: StorageService.getClients(),
          invoices: StorageService.getInvoices(),
          transactions: StorageService.getTransactions(),
          catalog: StorageService.getCatalog(),
          version: '2.1',
          date: new Date().toISOString()
      };
      return JSON.stringify(backup, null, 2);
  },

  restoreBackup: (jsonString: string): boolean => {
      try {
          const data = JSON.parse(jsonString);
          if (data.settings) localStorage.setItem(KEYS.SETTINGS, encrypt(data.settings));
          if (data.suppliers) localStorage.setItem(KEYS.SUPPLIERS, encrypt(data.suppliers));
          if (data.clients) localStorage.setItem(KEYS.CLIENTS, encrypt(data.clients));
          if (data.invoices) localStorage.setItem(KEYS.INVOICES, encrypt(data.invoices));
          if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, encrypt(data.transactions));
          if (data.catalog) localStorage.setItem(KEYS.CATALOG, encrypt(data.catalog));
          
          return true;
      } catch (e) {
          console.error("Restore Failed", e);
          return false;
      }
  }
};
