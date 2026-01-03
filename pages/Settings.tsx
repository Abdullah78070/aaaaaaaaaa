
import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Download, Upload, Database, Check, User, ShieldCheck, Settings2, Image as ImageIcon, Users, Plus, Trash2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AppSettings, DEFAULT_SETTINGS, User as UserType } from '../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [msg, setMsg] = useState('');
  const [newUser, setNewUser] = useState<UserType>({ id: '', username: '', password: '', fullName: '', role: 'user', permissions: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSettings(StorageService.getSettings()); }, []);

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setMsg('تم حفظ الإعدادات بنجاح');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettings(prev => ({ ...prev, userAvatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddUser = () => {
      if (!newUser.username || !newUser.password) return alert('اسم المستخدم وكلمة المرور مطلوبان');
      const updatedUsers = [...settings.users, { ...newUser, id: Date.now().toString(), permissions: newUser.role === 'admin' ? ['*'] : newUser.permissions }];
      setSettings(prev => ({ ...prev, users: updatedUsers }));
      setNewUser({ id: '', username: '', password: '', fullName: '', role: 'user', permissions: [] });
  };

  const handleRemoveUser = (userId: string) => {
      if (settings.users.length <= 1) return alert('لا يمكن حذف المستخدم الوحيد');
      setSettings(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  };

  // Quick Backup
  const handleQuickBackup = () => {
      const data = StorageService.createBackup();
      const fileName = `pharmamind_backup_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('تم تحميل النسخة بنجاح');
      setTimeout(() => setMsg(''), 3000);
  };

  // Save As Backup
  const handleSaveAsBackup = async () => {
    const data = StorageService.createBackup();
    const fileName = `pharmamind_backup_${new Date().toISOString().split('T')[0]}.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setMsg('تم حفظ النسخة بنجاح في المكان المختار');
      } catch (err) {
        console.error('User cancelled or error occurred', err);
      }
    } else {
      alert('متصفحك لا يدعم اختيار مكان الحفظ المباشر، سيتم استخدام التحميل العادي.');
      handleQuickBackup();
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content && StorageService.restoreBackup(content)) {
              setMsg('تم استعادة البيانات! جاري إعادة التحميل...');
              setTimeout(() => window.location.reload(), 2000);
          } else {
              alert('فشل استعادة الملف.');
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-2"><Settings2 className="text-primary-600" /> إعدادات النظام والأمان</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><User size={18} className="text-blue-500" /> مظهر التطبيق</h3>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">اسم الصيدلية</label><input type="text" value={settings.pharmacyName} onChange={(e) => setSettings({...settings, pharmacyName: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">نص اللوجو (شاشة الدخول)</label><input type="text" value={settings.logoText || ''} onChange={(e) => setSettings({...settings, logoText: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Abdullah Mohsin" /></div>
             
             {/* Profile Image Upload */}
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">شعار / صورة الملف الشخصي</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border overflow-hidden">
                        {settings.userAvatar ? <img src={settings.userAvatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-300" />}
                    </div>
                    <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => imageInputRef.current?.click()} className="text-sm bg-gray-50 border px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-1"><ImageIcon size={14} /> اختر صورة</button>
                    {settings.userAvatar && <button onClick={() => setSettings({...settings, userAvatar: undefined})} className="text-sm text-red-500 hover:text-red-700">حذف</button>}
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><ShieldCheck size={18} className="text-green-500" /> إدارة المستخدمين</h3>
             
             <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
                 <h4 className="text-xs font-bold text-gray-500 uppercase">إضافة مستخدم جديد</h4>
                 <input placeholder="الاسم الكامل" className="w-full p-2 border rounded-lg" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
                 <div className="grid grid-cols-2 gap-2">
                     <input placeholder="اسم المستخدم" className="w-full p-2 border rounded-lg" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                     <input type="password" placeholder="كلمة المرور" className="w-full p-2 border rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                     <select className="p-2 border rounded-lg bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'user' | 'admin'})}>
                         <option value="user">مستخدم عادي</option>
                         <option value="admin">مسؤول كامل</option>
                     </select>
                     <button onClick={handleAddUser} className="flex-1 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-1"><Plus size={16} /> إضافة</button>
                 </div>
             </div>

             <div className="space-y-2 max-h-40 overflow-y-auto">
                 {settings.users?.map(user => (
                     <div key={user.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                         <div>
                             <div className="font-bold text-sm">{user.username}</div>
                             <div className="text-xs text-gray-400">{user.role === 'admin' ? 'Admin' : 'User'}</div>
                         </div>
                         <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                     </div>
                 ))}
             </div>
          </div>

          <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
             <div><label className="block text-xs font-bold text-gray-500 mb-1">خصم العادي الافتراضي %</label><input type="number" value={settings.discountNormal} onChange={(e) => setSettings({...settings, discountNormal: parseFloat(e.target.value) || 0})} className="w-full p-3 border rounded-xl" /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">خصم الخاص الافتراضي %</label><input type="number" value={settings.discountSpecial} onChange={(e) => setSettings({...settings, discountSpecial: parseFloat(e.target.value) || 0})} className="w-full p-3 border rounded-xl" /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">خصومات أخرى %</label><input type="number" value={settings.discountOther} onChange={(e) => setSettings({...settings, discountOther: parseFloat(e.target.value) || 0})} className="w-full p-3 border rounded-xl" /></div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t pt-6">
            <button onClick={() => { if(window.confirm('استعادة الافتراضي؟')) { setSettings(DEFAULT_SETTINGS); StorageService.saveSettings(DEFAULT_SETTINGS); } }} className="text-red-500 text-sm font-bold flex items-center gap-1 hover:bg-red-50 p-2 rounded-lg"><RefreshCw size={16} /> استعادة الافتراضي</button>
            <button onClick={handleSave} className="bg-primary-600 text-white px-10 py-4 rounded-2xl shadow-xl shadow-primary-500/30 font-bold flex items-center gap-2"><Save /> حفظ الإعدادات</button>
        </div>
        {msg && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2"><Check size={16} /> {msg}</div>}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Database className="text-purple-600" /> إدارة البيانات والنسخ الاحتياطي</h3>
          <p className="text-gray-500 mb-6 text-sm">يمكنك حفظ بياناتك في ملف خارجي. اختر "تحميل مباشر" للحصول على الملف فوراً، أو "حفظ باسم" لاختيار المكان.</p>
          <div className="flex flex-col md:flex-row gap-4">
              <button onClick={handleQuickBackup} className="flex-1 bg-blue-50 text-blue-700 border-2 border-blue-100 px-6 py-5 rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-3 font-bold"><Download size={24} /> تحميل مباشر</button>
              <button onClick={handleSaveAsBackup} className="flex-1 bg-purple-50 text-purple-700 border-2 border-purple-100 px-6 py-5 rounded-2xl hover:bg-purple-100 transition-all flex items-center justify-center gap-3 font-bold"><Save size={24} /> حفظ باسم (اختر المكان)</button>
              
              <div className="flex-1 relative">
                  <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleRestore} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-50 text-gray-600 border-2 border-gray-100 px-6 py-5 rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 font-bold h-full"><Upload size={24} /> استعادة نسخة محفوظة</button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;
