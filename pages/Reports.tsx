
import React, { useMemo, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Percent, Gift, Search, Share2, Filter, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Invoice, Supplier, CalculatedItem } from '../types';

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'monthly' | 'extra_discount' | 'items_analysis'>('monthly');

  // Monthly Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Extra Discount Filters
  const [edStartDate, setEdStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [edEndDate, setEdEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [edSupplierId, setEdSupplierId] = useState('');

  // Item Analysis Filters
  const [iaSearch, setIaSearch] = useState('');
  const [iaFilterType, setIaFilterType] = useState<'all' | 'bonus' | 'tax' | 'price_change'>('all');

  useEffect(() => {
    setInvoices(StorageService.getInvoices());
    setSuppliers(StorageService.getSuppliers());
  }, []);

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const handleShare = async () => {
      const reportText = `تقرير PharmaMind - ${new Date().toLocaleDateString('ar-EG')}\n` +
      `إجمالي المشتريات: ${new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(stats.totalSpent)}`;
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'تقرير صيدليتي الذكية',
                  text: reportText,
              });
          } catch (err) { console.error(err); }
      } else {
          // Fallback to clipboard
          navigator.clipboard.writeText(reportText);
          alert('تم نسخ ملخص التقرير للحافظة');
      }
  };

  // Monthly Stats Logic
  const stats = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const totalSpent = filtered.reduce((sum, inv) => sum + inv.totalValue, 0);
    const invoiceCount = filtered.length;
    
    let totalDiscountPoints = 0;
    let totalItems = 0;
    
    filtered.forEach(inv => {
        inv.items.forEach(item => {
            totalDiscountPoints += item.realDiscountPct;
            totalItems++;
        });
    });
    
    const avgDiscount = totalItems > 0 ? totalDiscountPoints / totalItems : 0;

    const dailyData = new Array(31).fill(0).map((_, i) => ({ day: i + 1, amount: 0 }));
    filtered.forEach(inv => {
        const day = new Date(inv.date).getDate();
        if(dailyData[day-1]) dailyData[day-1].amount += inv.totalValue;
    });

    return { totalSpent, invoiceCount, avgDiscount, dailyData: dailyData.filter(d => d.amount > 0) };
  }, [invoices, selectedMonth, selectedYear]);

  // Extra Discount Stats Logic
  const extraDiscountStats = useMemo(() => {
      const filteredItems: any[] = [];
      let totalExtraValue = 0;

      invoices.forEach(inv => {
          const d = inv.date.split('T')[0];
          // Filter by Date
          if (d < edStartDate || d > edEndDate) return;
          // Filter by Supplier
          if (edSupplierId && inv.supplierId !== edSupplierId) return;

          inv.items.forEach(item => {
              // Check if item has extra discount
              if (item.extraDiscountValue > 0 || item.extraDiscountPct > 0) {
                  filteredItems.push({
                      ...item,
                      supplierName: inv.supplierName,
                      invDate: inv.date
                  });
                  totalExtraValue += item.extraDiscountValue;
              }
          });
      });

      return { items: filteredItems, totalExtraValue };
  }, [invoices, edStartDate, edEndDate, edSupplierId]);

  // Item Analysis Logic
  const itemAnalysisData = useMemo(() => {
      const allItems: any[] = [];
      invoices.forEach(inv => {
          inv.items.forEach(item => {
              allItems.push({
                  ...item,
                  supplierName: inv.supplierName,
                  invDate: inv.date
              });
          });
      });

      return allItems.filter(item => {
          const matchesSearch = item.name.toLowerCase().includes(iaSearch.toLowerCase());
          if (!matchesSearch) return false;

          if (iaFilterType === 'bonus') return item.bonus > 0;
          if (iaFilterType === 'tax') return item.taxValue > 0;
          if (iaFilterType === 'price_change') return item.historyComparison === 'better' || item.historyComparison === 'worse';
          
          return true;
      }).sort((a, b) => new Date(b.invDate).getTime() - new Date(a.invDate).getTime());
  }, [invoices, iaSearch, iaFilterType]);

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'monthly' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            التقرير الشهري
          </button>
          <button 
            onClick={() => setActiveTab('extra_discount')}
            className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'extra_discount' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            تقارير الخصومات الإضافية
          </button>
          <button 
            onClick={() => setActiveTab('items_analysis')}
            className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'items_analysis' ? 'border-b-2 border-purple-500 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            تحليل الأصناف الذكي
          </button>
      </div>

      {/* MONTHLY REPORT VIEW */}
      {activeTab === 'monthly' && (
      <>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">التقرير الشهري</h2>
                <p className="text-gray-500">تحليل المشتريات والخصومات</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handleShare} className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200"><Share2 size={20} /></button>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="p-2 border rounded-lg bg-gray-50"
                >
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="p-2 border rounded-lg bg-gray-50"
                >
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg shadow-primary-500/20">
                <div className="flex items-center gap-3 mb-2 opacity-90">
                    <DollarSign />
                    <span>إجمالي المشتريات</span>
                </div>
                <div className="text-3xl font-bold">
                    {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(stats.totalSpent)}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                    <ShoppingBag className="text-orange-500" />
                    <span>عدد الفواتير</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                    {stats.invoiceCount}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                    <Percent className="text-green-500" />
                    <span>متوسط الخصم الحقيقي</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                    {stats.avgDiscount.toFixed(2)}%
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                <TrendingUp size={20} /> تحليل الإنفاق اليومي
            </h3>
            <div className="h-64 w-full">
                {stats.dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip 
                                formatter={(value) => [`${value} EGP`, 'القيمة']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        لا توجد بيانات لعرضها لهذا الشهر
                    </div>
                )}
            </div>
        </div>
      </>
      )}

      {/* EXTRA DISCOUNT REPORT VIEW */}
      {activeTab === 'extra_discount' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-4 items-end mb-6 pb-6 border-b">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" className="p-2 border rounded-lg" value={edStartDate} onChange={e => setEdStartDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" className="p-2 border rounded-lg" value={edEndDate} onChange={e => setEdEndDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
                    <select 
                        value={edSupplierId} 
                        onChange={e => setEdSupplierId(e.target.value)}
                        className="p-2 border rounded-lg min-w-[200px]"
                    >
                        <option value="">جميع الموردين</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-xl flex items-center gap-3 border border-green-100">
                  <div className="bg-white p-2 rounded-full text-green-600"><Gift size={24} /></div>
                  <div>
                      <div className="text-sm">إجمالي قيمة الخصومات الإضافية في الفترة المحددة</div>
                      <div className="text-2xl font-bold">{extraDiscountStats.totalExtraValue.toFixed(2)} EGP</div>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الصنف</th>
                              <th className="p-3">المورد</th>
                              <th className="p-3">نسبة الخصم الإضافي</th>
                              <th className="p-3">قيمة الخصم الإضافي</th>
                              <th className="p-3">إجمالي الصنف</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {extraDiscountStats.items.map((item, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                  <td className="p-3 text-gray-500">{new Date(item.invDate).toLocaleDateString('ar-EG')}</td>
                                  <td className="p-3 font-medium">{item.name}</td>
                                  <td className="p-3">{item.supplierName || '-'}</td>
                                  <td className="p-3 text-green-600 font-bold">{item.extraDiscountPct}%</td>
                                  <td className="p-3 font-mono">{item.extraDiscountValue.toFixed(2)}</td>
                                  <td className="p-3">{item.netTotalCost.toFixed(2)}</td>
                              </tr>
                          ))}
                          {extraDiscountStats.items.length === 0 && (
                              <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أصناف بخصم إضافي في هذه الفترة</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* ITEMS ANALYSIS SMART VIEW */}
      {activeTab === 'items_analysis' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b pb-4">
                  <div>
                      <h3 className="text-lg font-bold text-gray-800">تحليل الأصناف الذكي</h3>
                      <p className="text-xs text-gray-500">فلترة ذكية للأصناف لمعرفة البونص، الضرائب، وتغيرات الأسعار</p>
                  </div>
                  <button onClick={handleShare} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm"><Share2 size={16} /> مشاركة التقرير</button>
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button onClick={() => setIaFilterType('all')} className={`px-3 py-1.5 rounded-full text-sm font-bold border ${iaFilterType === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>الكل</button>
                  <button onClick={() => setIaFilterType('bonus')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'bonus' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}><Gift size={14} /> أصناف ببونص</button>
                  <button onClick={() => setIaFilterType('tax')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'tax' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}><AlertCircle size={14} /> عليها ضرائب</button>
                  <button onClick={() => setIaFilterType('price_change')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'price_change' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}><TrendingUp size={14} /> تغير السعر</button>
              </div>

              <div className="mb-4 relative">
                  <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                  <input placeholder="ابحث باسم الصنف..." className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" value={iaSearch} onChange={e => setIaSearch(e.target.value)} />
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                          <tr>
                              <th className="p-3">الصنف</th>
                              <th className="p-3">التاريخ / المورد</th>
                              <th className="p-3">السعر (جمهور/صيدلي)</th>
                              <th className="p-3">العدد + البونص</th>
                              <th className="p-3">خ. مورد</th>
                              <th className="p-3">الضريبة</th>
                              <th className="p-3">حالة السعر</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {itemAnalysisData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">{item.name}</td>
                                  <td className="p-3">
                                      <div className="text-xs text-gray-500">{new Date(item.invDate).toLocaleDateString('ar-EG')}</div>
                                      <div className="text-xs font-bold">{item.supplierName}</div>
                                  </td>
                                  <td className="p-3">
                                      <div>{item.publicPrice} <span className="text-xs text-gray-400">جمهور</span></div>
                                      <div className="text-blue-600 font-mono">{item.pharmaPrice} <span className="text-xs text-gray-400">صيدلي</span></div>
                                  </td>
                                  <td className="p-3">
                                      <div className="flex items-center gap-1">
                                          <span>{item.qty}</span>
                                          {item.bonus > 0 && <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-xs font-bold">+{item.bonus}</span>}
                                      </div>
                                  </td>
                                  <td className="p-3 text-green-600 font-bold">{item.supplierDiscountVal > 0 ? item.supplierDiscountVal : '-'}</td>
                                  <td className="p-3 text-red-500">{item.taxValue > 0 ? item.taxValue : '-'}</td>
                                  <td className="p-3">
                                      {item.historyComparison === 'better' && <span className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded"><ArrowDown size={12} /> أرخص</span>}
                                      {item.historyComparison === 'worse' && <span className="flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-1 rounded"><ArrowUp size={12} /> أغلى</span>}
                                      {item.historyComparison === 'same' && <span className="text-gray-400">-</span>}
                                      {item.historyComparison === 'new' && <span className="text-blue-500 text-xs">جديد</span>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

    </div>
  );
};

export default Reports;
