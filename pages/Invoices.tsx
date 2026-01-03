
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { CalculatorService } from '../services/calculatorService';
import { Invoice, Client, ItemType, ClientTransaction, Supplier, ItemInput } from '../types';
import { FileText, Calendar, Package, ChevronDown, ChevronUp, Printer, Trash, Repeat, X, Check, Lock, UserCheck, ToggleLeft, ToggleRight, Edit } from 'lucide-react';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // Resell Modal State
  const [showResellModal, setShowResellModal] = useState(false);
  const [resellInvoice, setResellInvoice] = useState<Invoice | null>(null);
  const [includeExtraDiscount, setIncludeExtraDiscount] = useState(false);
  const [resellConfig, setResellConfig] = useState({
      clientId: '',
      discountReg: 0,
      discountSpe: 0,
      discountOth: 0
  });

  useEffect(() => {
    setInvoices(StorageService.getInvoices());
    setClients(StorageService.getClients());
    setSuppliers(StorageService.getSuppliers());
  }, []);

  // Logic to apply Client discounts based on selection
  useEffect(() => {
    if (resellConfig.clientId) {
        const client = clients.find(c => c.id === resellConfig.clientId);
        const globalSettings = StorageService.getSettings();

        // Logic: Client Discount OR Global Settings
        setResellConfig(prev => ({
            ...prev,
            discountReg: client?.discountNormal ?? globalSettings.discountNormal,
            discountSpe: client?.discountSpecial ?? globalSettings.discountSpecial,
            discountOth: client?.discountOther ?? globalSettings.discountOther,
        }));
    }
  }, [resellConfig.clientId]);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      StorageService.deleteInvoice(id);
      setInvoices(StorageService.getInvoices());
    }
  };
  
  const handleEdit = (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      if (invoice.isSold) {
          alert('لا يمكن تعديل فاتورة تم بيعها أو توزيعها.');
          return;
      }
      // Navigate to Calculator with Invoice Data
      navigate('/calculator', { state: { editInvoice: invoice } });
  };

  const handlePrint = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintInvoice(invoice);
    setTimeout(() => { window.print(); }, 100);
  };

  const openResellModal = (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      if (invoice.isSold) return;
      setResellInvoice(invoice);
      setResellConfig({ clientId: '', discountReg: 0, discountSpe: 0, discountOth: 0 });
      setIncludeExtraDiscount(false);
      setShowResellModal(true);
  };

  const calculateSellTotal = () => {
      if (!resellInvoice) return 0;
      
      const globalSettings = StorageService.getSettings();
      let total = 0;

      resellInvoice.items.forEach(item => {
          let clientDiscountPct = 0;
          if (item.type === ItemType.NORMAL) clientDiscountPct = resellConfig.discountReg;
          else if (item.type === ItemType.SPECIAL) clientDiscountPct = resellConfig.discountSpe;
          else clientDiscountPct = resellConfig.discountOth;

          const input: ItemInput = {
              ...item,
              customTypeDiscount: clientDiscountPct,
              extraDiscountPct: includeExtraDiscount ? item.extraDiscountPct : 0,
              supplierDiscountVal: item.supplierDiscountVal
          };

          const result = CalculatorService.calculateItem(input, globalSettings);
          total += result.netTotalCost;
      });
      
      return total;
  };

  const confirmResell = () => {
      if (!resellConfig.clientId) return alert('اختر العميل');
      if (!resellInvoice) return;

      const totalAmount = calculateSellTotal();
      const transaction: ClientTransaction = {
          id: Date.now().toString(),
          clientId: resellConfig.clientId,
          date: new Date().toISOString(),
          type: 'SALE',
          amount: totalAmount,
          notes: `توزيع فاتورة #${resellInvoice.invoiceNumber || resellInvoice.id.slice(-4)} | خصومات: ${resellConfig.discountReg}%/${resellConfig.discountSpe}% | ${includeExtraDiscount ? 'مع خصم إضافي' : 'بدون إضافي'}`,
          relatedInvoiceId: resellInvoice.id,
          invoiceNumber: resellInvoice.invoiceNumber || resellInvoice.id.slice(-4)
      };

      StorageService.addTransaction(transaction);
      StorageService.markInvoiceAsSold(resellInvoice.id, resellConfig.clientId);
      
      alert('تم التوزيع بنجاح');
      setShowResellModal(false);
      setInvoices(StorageService.getInvoices());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">سجل الفواتير</h2>
          <p className="text-gray-500 mt-1">إدارة المشتريات وعمليات التوزيع للعملاء</p>
        </div>
        <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold">
            {invoices.length} فاتورة
        </div>
      </div>

      <div className="space-y-4">
        {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <div onClick={() => toggleExpand(inv.id)} className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50 gap-4">
                    <div className="flex items-start md:items-center gap-4">
                        <div className="bg-primary-100 p-3 rounded-full text-primary-600 hidden md:block"><FileText size={24} /></div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <div className="font-bold text-gray-800 text-lg">{inv.supplierName || 'غير محدد'}</div>
                                {inv.invoiceNumber && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border">#{inv.invoiceNumber}</span>}
                                {inv.isSold && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold flex items-center gap-1"><UserCheck size={12} /> تم التوزيع</span>}
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                                <span className="flex items-center gap-1"><Package size={14} /> {inv.totalItems} أصناف</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xl font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg">
                            {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(inv.totalValue)}
                        </div>
                        {expandedId === inv.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                </div>

                {expandedId === inv.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right bg-white rounded-xl shadow-sm border">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr><th className="p-3">الصنف</th><th className="p-3">النوع</th><th className="p-3">العدد</th><th className="p-3">التكلفة</th><th className="p-3">الإجمالي</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {inv.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium">{item.name}</td>
                                            <td className="p-3">{item.type}</td>
                                            <td className="p-3">{item.totalUnits}</td>
                                            <td className="p-3 font-mono">{item.netUnitCost.toFixed(2)}</td>
                                            <td className="p-3 font-bold">{item.netTotalCost.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            {inv.isSold ? (
                                <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg border"><Lock size={18} /> تم البيع</div>
                            ) : (
                                <>
                                  <button onClick={(e) => openResellModal(inv, e)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 shadow-md"><Repeat size={18} /> بيع وتوزيع</button>
                                  <button onClick={(e) => handleEdit(inv, e)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Edit size={18} /> تعديل</button>
                                </>
                            )}
                            <button onClick={(e) => handlePrint(inv, e)} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900"><Printer size={18} /> طباعة</button>
                            <button onClick={(e) => handleDelete(inv.id, e)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg"><Trash size={18} /> حذف</button>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>

      {/* Resell Modal */}
      {showResellModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-5 border-b flex justify-between items-center bg-purple-600 text-white">
                      <h3 className="font-bold text-lg">توزيع الفاتورة لعميل</h3>
                      <button onClick={() => setShowResellModal(false)}><X /></button>
                  </div>
                  <div className="p-6 space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">اختر العميل</label>
                          <select className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-purple-500 transition-all" value={resellConfig.clientId} onChange={e => setResellConfig({...resellConfig, clientId: e.target.value})}>
                              <option value="">-- اختر عميل من القائمة --</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">عادي %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountReg} onChange={e => setResellConfig({...resellConfig, discountReg: parseFloat(e.target.value) || 0})} /></div>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">خاص %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountSpe} onChange={e => setResellConfig({...resellConfig, discountSpe: parseFloat(e.target.value) || 0})} /></div>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">أخرى %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountOth} onChange={e => setResellConfig({...resellConfig, discountOth: parseFloat(e.target.value) || 0})} /></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-gray-700">تضمين الخصم الإضافي؟</span>
                             <button onClick={() => setIncludeExtraDiscount(!includeExtraDiscount)} className="text-purple-600">
                                {includeExtraDiscount ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-gray-300" />}
                             </button>
                          </div>
                          <span className="text-xs text-gray-400 max-w-[150px] leading-tight text-left">سيتم إضافة نسبة الخصم الإضافي من الفاتورة الأصلية للعميل أيضاً</span>
                      </div>

                      <div className="bg-purple-50 p-6 rounded-2xl text-center border-2 border-purple-100">
                          <div className="text-xs text-purple-600 font-bold mb-1">قيمة المديونية النهائية على العميل</div>
                          <div className="text-4xl font-black text-purple-700">
                              {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(calculateSellTotal())}
                          </div>
                      </div>

                      <button onClick={confirmResell} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"><Check /> تسجيل المديونية وتأكيد التوزيع</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Hidden Print Area */}
      <div id="printable-area" style={{ display: 'none' }}>
        {printInvoice && (
             <div className="p-8 font-sans" dir="rtl">
                <h1 className="text-2xl font-bold mb-4 border-b pb-2">فاتورة مشتريات صيدلية</h1>
                <p><strong>المورد:</strong> {printInvoice.supplierName}</p>
                <p><strong>التاريخ:</strong> {new Date(printInvoice.date).toLocaleString('ar-EG')}</p>
                <table className="w-full mt-6 border-collapse border">
                    <thead><tr className="bg-gray-100"><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                    <tbody>
                        {printInvoice.items.map((item, i) => (
                            <tr key={i} className="border"><td className="p-2">{item.name}</td><td className="p-2">{item.totalUnits}</td><td className="p-2">{item.netUnitCost.toFixed(2)}</td><td className="p-2 font-bold">{item.netTotalCost.toFixed(2)}</td></tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 text-right font-bold text-xl">الإجمالي: {printInvoice.totalValue.toFixed(2)} EGP</div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
