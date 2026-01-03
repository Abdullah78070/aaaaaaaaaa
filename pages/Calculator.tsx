
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ShoppingCart, AlertTriangle, TrendingUp, TrendingDown, Minus, Calculator as CalculatorIcon, Store, FileDigit, Info, CheckSquare, Square, Lightbulb, User, ArrowLeft } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { CalculatorService } from '../services/calculatorService';
import { AppSettings, DEFAULT_SETTINGS, ItemInput, ItemType, ItemTypeShort, TaxMethod, CalculatedItem, Invoice, Supplier } from '../types';

const INITIAL_INPUT: ItemInput = {
  id: '',
  name: '',
  type: ItemType.NORMAL,
  qty: 1,
  bonus: 0,
  publicPrice: 0,
  pharmaPrice: 0,
  supplierDiscountVal: 0,
  extraDiscountPct: 0,
  taxValue: 0,
  taxMethod: TaxMethod.PER_UNIT
};

const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(val);
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

interface ItemRowProps {
  item: CalculatedItem;
  onRemove: (id: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onRemove }) => (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
        <td className="p-3">
            <div className="font-bold text-gray-800">{item.name}</div>
        </td>
        <td className="p-3">
            <div>{item.qty} + {item.bonus}</div>
            <div className="text-xs text-gray-400">إجمالي: {item.totalUnits}</div>
        </td>
        <td className="p-3 font-mono text-sm">
            <div className="font-bold text-primary-700">{formatCurrency(item.netUnitCost)}</div>
            <div className="text-xs text-gray-400">الإجمالي: {formatCurrency(item.netTotalCost)}</div>
        </td>
        <td className="p-3 text-center">
            <span className={`inline-block font-bold px-2 py-1 rounded text-xs ${item.realDiscountPct > 25 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {formatPercent(item.realDiscountPct)}
            </span>
        </td>
        <td className="p-3">
            <div className="flex justify-center gap-2">
                {item.isFakeDiscount && (
                    <div className="group relative">
                        <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full cursor-help">
                            <AlertTriangle size={16} />
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                            خصم وهمي: الخصم الحقيقي أقل بكثير من المتوقع
                        </div>
                    </div>
                )}
                {item.historyComparison !== 'new' && item.historyComparison && (
                    <div className="group relative">
                        <div className={`p-1.5 rounded-full cursor-help ${
                            item.historyComparison === 'better' ? 'bg-green-100 text-green-600' :
                            item.historyComparison === 'worse' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {item.historyComparison === 'better' && <TrendingDown size={16} />}
                            {item.historyComparison === 'worse' && <TrendingUp size={16} />}
                            {item.historyComparison === 'same' && <Minus size={16} />}
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                            {item.historyComparison === 'better' && `سعر أفضل بـ ${formatPercent(item.priceDifferencePct || 0)} عن آخر مرة`}
                            {item.historyComparison === 'worse' && `سعر أغلى بـ ${formatPercent(item.priceDifferencePct || 0)} عن آخر مرة`}
                            {item.historyComparison === 'same' && 'نفس سعر الشراء السابق'}
                        </div>
                    </div>
                )}
            </div>
        </td>
        <td className="p-3 no-print text-center">
            <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded">
            <Trash2 size={16} />
            </button>
        </td>
    </tr>
);

const Calculator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentInput, setCurrentInput] = useState<ItemInput>(INITIAL_INPUT);
  const [invoiceItems, setInvoiceItems] = useState<CalculatedItem[]>([]);
  const [showInvoiceSaved, setShowInvoiceSaved] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [knownItemNames, setKnownItemNames] = useState<string[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [lastHistoryItem, setLastHistoryItem] = useState<CalculatedItem | null>(null);
  const [bonusSuggestion, setBonusSuggestion] = useState<CalculatedItem | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());
    setSuppliers(StorageService.getSuppliers());
    setKnownItemNames(StorageService.getAllItemNames());
    
    // Check for Edit Mode
    if (location.state && location.state.editInvoice) {
        const inv = location.state.editInvoice as Invoice;
        setEditingInvoiceId(inv.id);
        setInvoiceItems(inv.items);
        setInvoiceNumber(inv.invoiceNumber || '');
        setSelectedSupplierId(inv.supplierId || '');
        // Clear state to avoid reload issues
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (currentInput.name.length > 2) {
        // 1. Try to find in Catalog first for price autofill
        const catalogItem = StorageService.getCatalogItemByName(currentInput.name);
        if (catalogItem && currentInput.publicPrice === 0 && currentInput.pharmaPrice === 0) {
            setCurrentInput(prev => ({ 
                ...prev, 
                type: catalogItem.type, 
                publicPrice: catalogItem.publicPrice,
                pharmaPrice: catalogItem.pharmaPrice 
            }));
        }

        // 2. History & Bonus logic
        const history = StorageService.getLastPurchaseItem(currentInput.name);
        setLastHistoryItem(history);
        if (currentInput.bonus === 0 && currentInput.qty > 0) {
            const bonusItem = StorageService.getItemWithBonusHistory(currentInput.name);
            if (bonusItem && bonusItem.qty > currentInput.qty) {
                setBonusSuggestion(bonusItem);
            } else {
                setBonusSuggestion(null);
            }
        } else {
            setBonusSuggestion(null);
        }
    } else {
        setLastHistoryItem(null);
        setBonusSuggestion(null);
    }
  }, [currentInput.name, currentInput.qty, currentInput.bonus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentInput(prev => ({
      ...prev,
      [name]: (name === 'name' || name === 'type' || name === 'taxMethod') 
        ? value 
        : parseFloat(value) || 0
    }));
  };

  const handleTaxCheck = () => {
    setCurrentInput(prev => ({
        ...prev,
        taxMethod: prev.taxMethod === TaxMethod.PER_UNIT ? TaxMethod.TOTAL : TaxMethod.PER_UNIT
    }));
  };

  const getEffectiveDiscount = (): number => {
    if (selectedSupplierId) {
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        if (supplier) {
            if (currentInput.type === ItemType.NORMAL && supplier.discountNormal !== undefined) return supplier.discountNormal;
            if (currentInput.type === ItemType.SPECIAL && supplier.discountSpecial !== undefined) return supplier.discountSpecial;
            if (currentInput.type === ItemType.OTHER && supplier.discountOther !== undefined) return supplier.discountOther;
        }
    }
    return -1;
  };

  const addItem = () => {
    if (!currentInput.name || (currentInput.pharmaPrice <= 0 && currentInput.publicPrice <= 0)) {
      alert('الرجاء إدخال اسم الصنف والسعر');
      return;
    }

    const effectiveDiscount = getEffectiveDiscount();
    const itemToCalc = {
        ...currentInput, 
        id: Date.now().toString() + Math.random(),
        customTypeDiscount: effectiveDiscount >= 0 ? effectiveDiscount : undefined
    };

    const calculated = CalculatorService.calculateItem(itemToCalc, settings);
    setInvoiceItems([...invoiceItems, calculated]);
    setCurrentInput({ ...INITIAL_INPUT, type: currentInput.type }); 
    setLastHistoryItem(null);
    setBonusSuggestion(null);
  };

  const removeItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(i => i.id !== id));
  };

  const saveInvoice = () => {
    if (invoiceItems.length === 0) return;
    if (!selectedSupplierId) {
        alert('تنبيه: لا يمكن حفظ الفاتورة بدون اختيار مورد.');
        return;
    }
    const supplierObj = suppliers.find(s => s.id === selectedSupplierId);
    const totalValue = invoiceItems.reduce((sum, item) => sum + item.netTotalCost, 0);
    
    // Preserve Original Date if Editing, else new Date
    const originalInvoice = editingInvoiceId ? StorageService.getInvoiceById(editingInvoiceId) : null;

    const invoice: Invoice = {
      id: editingInvoiceId || Date.now().toString(),
      date: originalInvoice ? originalInvoice.date : new Date().toISOString(),
      invoiceNumber,
      supplierId: selectedSupplierId,
      supplierName: supplierObj ? supplierObj.name : 'غير محدد',
      items: invoiceItems,
      totalValue,
      totalItems: invoiceItems.length,
      totalUnits: invoiceItems.reduce((sum, item) => sum + item.totalUnits, 0),
      isSold: originalInvoice ? originalInvoice.isSold : false
    };

    StorageService.saveInvoice(invoice);
    setKnownItemNames(StorageService.getAllItemNames());
    setShowInvoiceSaved(true);
    
    // Reset or Navigate back
    if (editingInvoiceId) {
        setTimeout(() => navigate('/invoices'), 1500);
    } else {
        setInvoiceItems([]);
        setSelectedSupplierId('');
        setInvoiceNumber('');
        setTimeout(() => setShowInvoiceSaved(false), 3000);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<ItemType, CalculatedItem[]>> = {
        [ItemType.NORMAL]: [],
        [ItemType.SPECIAL]: [],
        [ItemType.OTHER]: []
    };
    invoiceItems.forEach(item => {
        if (groups[item.type]) groups[item.type]?.push(item);
        else groups[ItemType.OTHER]?.push(item);
    });
    return groups;
  }, [invoiceItems]);

  const currentSupplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4 no-print">
        
        {editingInvoiceId && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                <span className="text-blue-700 font-bold flex items-center gap-2"><ArrowLeft size={18} /> وضع تعديل الفاتورة</span>
                <button onClick={() => navigate('/invoices')} className="text-xs underline text-blue-500">عودة</button>
            </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
             <div className="flex items-center gap-2 mb-2 text-primary-700 font-bold border-b pb-2">
                <User size={18} />
                <span>بيانات الفاتورة والمورد</span>
             </div>
             <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المورد *</label>
                <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className={`w-full p-2 border rounded-lg bg-gray-50 ${!selectedSupplierId ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                    <option value="">-- اختر مورد لتطبيق خصوماته --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">رقم الفاتورة الورقية</label>
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="مثال: 10255" className="w-full p-2 border rounded-lg bg-gray-50" />
             </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <Plus className="text-primary-600" /> إضافة صنف
          </h2>
          <div className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <label className="text-xs font-semibold text-gray-500 block mb-1">اسم الصنف</label>
                    <input list="item-names" name="name" value={currentInput.name} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="ابحث..." autoComplete="off" />
                    <datalist id="item-names">
                        {knownItemNames.map((n, i) => <option key={i} value={n} />)}
                    </datalist>
                </div>
                <div className="w-24">
                     <label className="text-xs font-semibold text-gray-500 block mb-1">النوع</label>
                     <select name="type" value={currentInput.type} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                        {Object.entries(ItemTypeShort).map(([key, abbr]) => <option key={key} value={key}>{abbr}</option>)}
                     </select>
                </div>
            </div>
            
            {/* Display active discount context */}
            {selectedSupplierId && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded flex justify-between items-center">
                    <span>خصم المورد النشط:</span>
                    <span className="font-bold">
                        {getEffectiveDiscount() >= 0 ? `${getEffectiveDiscount()}%` : 'افتراضي'}
                    </span>
                </div>
            )}

            <div className="space-y-2">
                {lastHistoryItem && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-800 animate-fade-in">
                        <Info size={16} className="mt-0.5 shrink-0" />
                        <div><div className="font-bold">سجل سابق:</div><div>سعر الصافي: {formatCurrency(lastHistoryItem.netUnitCost)}</div><div>الخصم: {formatPercent(lastHistoryItem.realDiscountPct)}</div></div>
                    </div>
                )}
                {bonusSuggestion && (
                     <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex items-start gap-2 text-sm text-purple-800 animate-fade-in cursor-pointer hover:bg-purple-100" onClick={() => setCurrentInput(prev => ({...prev, qty: bonusSuggestion.qty, bonus: bonusSuggestion.bonus}))}>
                        <Lightbulb size={16} className="mt-0.5 shrink-0 text-purple-600" />
                        <div><div className="font-bold mb-1">💡 نصيحة ذكية (اضغط للتطبيق)</div><div>سابقاً اشتريت {bonusSuggestion.qty} + {bonusSuggestion.bonus} بونص.</div></div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">العدد</label><input type="number" name="qty" value={currentInput.qty} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">بونص</label><input type="number" name="bonus" value={currentInput.bonus} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
            </div>
            <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">سعر الجمهور</label><input type="number" name="publicPrice" value={currentInput.publicPrice} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">سعر الصيدلي</label><input type="number" name="pharmaPrice" value={currentInput.pharmaPrice} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
            </div>
            <div className="flex gap-2 items-end">
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">خ. مورد (قيمة)</label><input type="number" name="supplierDiscountVal" value={currentInput.supplierDiscountVal} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div className="flex-1"><label className="text-xs font-semibold text-gray-500 block mb-1">خ. إضافي %</label><input type="number" name="extraDiscountPct" value={currentInput.extraDiscountPct} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div className="flex-1 relative"><label className="text-xs font-semibold text-gray-500 block mb-1">الضريبة</label><input type="number" name="taxValue" value={currentInput.taxValue} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none" onClick={handleTaxCheck}>
                {currentInput.taxMethod === TaxMethod.TOTAL ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-gray-400" />}
                <span>الضريبة مبلغ كلي</span>
            </div>
            <button onClick={addItem} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2">حساب وإضافة</button>
          </div>
        </div>
      </div>
      <div className="lg:col-span-8 space-y-4">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><ShoppingCart size={20} /> مسودة الفاتورة {currentSupplierName && ` - ${currentSupplierName}`}</h3>
            <div className="text-sm text-gray-500">{invoiceItems.length} أصناف</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="p-3">الصنف</th><th className="p-3">العدد</th><th className="p-3">الصافي</th><th className="p-3 text-center">خصم حقيقي</th><th className="p-3 text-center">تحليل</th><th className="p-3 no-print"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(groupedItems).map(([type, items]) => {
                    const typedItems = items as CalculatedItem[];
                    if (!typedItems || typedItems.length === 0) return null;
                    return (
                        <React.Fragment key={type}>
                            <tr className="bg-primary-50 border-y border-primary-100"><td colSpan={6} className="p-2 px-4 font-bold text-primary-700">{type}</td></tr>
                            {typedItems.map(item => <ItemRow key={item.id} item={item} onRemove={removeItem} />)}
                        </React.Fragment>
                    );
                })}
                {invoiceItems.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أصناف مضافة.</td></tr>}
              </tbody>
              <tfoot className="bg-gray-800 text-white font-bold"><tr><td colSpan={2} className="p-4 text-lg">الإجمالي النهائي</td><td colSpan={4} className="p-4 text-2xl text-left">{formatCurrency(invoiceItems.reduce((acc, i) => acc + i.netTotalCost, 0))}</td></tr></tfoot>
            </table>
          </div>
        </div>
        {invoiceItems.length > 0 && (
            <div className="flex justify-end gap-4 no-print">
                <button onClick={() => { setInvoiceItems([]); setEditingInvoiceId(null); navigate('/invoices'); }} className="px-6 py-3 rounded-xl border border-red-200 text-red-600">إلغاء</button>
                <button onClick={saveInvoice} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"><Save size={20} /> {editingInvoiceId ? 'حفظ التعديلات' : 'حفظ الفاتورة'}</button>
            </div>
        )}
        {showInvoiceSaved && <div className="fixed bottom-6 left-6 bg-green-600 text-white p-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce z-50"><Save size={24} /> {editingInvoiceId ? 'تم تحديث الفاتورة' : 'تم حفظ الفاتورة'}</div>}
      </div>
    </div>
  );
};

export default Calculator;
