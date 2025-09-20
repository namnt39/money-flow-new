// Updated: 21/09/2025 01:45 (GMT+7)
"use client";
import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaSave, FaExclamationCircle, FaCheckCircle, FaArrowDown, FaArrowUp, FaExchangeAlt, FaTag, FaRegBuilding, FaMoneyBillWave, FaTimes, FaTrash, FaUsers, FaStickyNote, FaTimesCircle } from 'react-icons/fa';
import { AmountInput } from '@/components/AmountInput';
import CustomSelect from '@/components/CustomSelect'; 
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { CashbackFields } from '@/components/CashbackFields';
import { Tooltip } from '@/components/Tooltip';

// ... (các interface không đổi)
interface Account { id: string; name: string; type: string; typeName: string; isCashbackEligible: boolean; }
interface Person { id: string; name: string; }
interface SubCategory { id: string; name: string; nature: 'IN' | 'EX' | 'TF' | 'DEBT' | 'REPA'; }

// THÊM CSS GLOBAL ĐỂ ẨN NÚT TĂNG GIẢM
const GlobalStyles = () => (
  <style jsx global>{`
    .hide-arrows::-webkit-outer-spin-button,
    .hide-arrows::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .hide-arrows {
      -moz-appearance: textfield;
    }
  `}</style>
);


const AddTransactionPage = () => {
    const router = useRouter();
    const [transactionType, setTransactionType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [personId, setPersonId] = useState('');
    const [showPersonField, setShowPersonField] = useState(false);
    const [applyCashback, setApplyCashback] = useState(false);
    const [percentDiscount, setPercentDiscount] = useState('');
    const [fixedDiscount, setFixedDiscount] = useState('');
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const isFormDirty = useMemo(() => amount || notes || fromAccountId || toAccountId || subCategoryId || personId, [amount, notes, fromAccountId, toAccountId, subCategoryId, personId]);
    const isCashbackAccountSelected = useMemo(() => accounts.find(a => a.id === fromAccountId)?.isCashbackEligible ?? false, [accounts, fromAccountId]);
    
    const finalPrice = useMemo(() => {
        const initialAmount = parseFloat(amount) || 0;
        const percent = parseFloat(percentDiscount) || 0;
        const fixed = parseFloat(fixedDiscount) || 0;
        return initialAmount - (initialAmount * percent / 100) - fixed;
    }, [amount, percentDiscount, fixedDiscount]);
    
    useEffect(() => {
        if (!amount || parseFloat(amount) === 0) {
            setPercentDiscount('');
            setFixedDiscount('');
        }
    }, [amount]);

    useEffect(() => { /* fetchData không đổi */
        const fetchData = async () => {
            try {
                const accTypeSnapshot = await getDocs(collection(firestore, 'accounttypes'));
                const accTypeMap = new Map(accTypeSnapshot.docs.map(doc => [doc.id, doc.data().AccountTypeName]));
                const accSnapshot = await getDocs(collection(firestore, 'accounts'));
                setAccounts(accSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, name: data.AccountName, type: data.AccountTypeID, typeName: accTypeMap.get(data.AccountTypeID) || 'Khác', isCashbackEligible: data.IsCashbackEligible };
                }));
                const pplSnapshot = await getDocs(collection(firestore, 'people'));
                setPeople(pplSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().PersonName })));
                const subCatSnapshot = await getDocs(collection(firestore, 'subcategories'));
                const catSnapshot = await getDocs(collection(firestore, 'categories'));
                const catMap = new Map(catSnapshot.docs.map(doc => [doc.id, doc.data().TransactionNature]));
                setSubCategories(subCatSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().SubCategoryName, nature: catMap.get(doc.data().CategoryID) })));
            } catch (err) { setError('Lỗi tải dữ liệu cho form.'); } 
            finally { setLoading(false); }
        };
        fetchData();
     }, []);

    const clearForm = () => {
        setAmount(''); setNotes(''); setFromAccountId(''); setToAccountId('');
        setSubCategoryId(''); setPersonId(''); setShowPersonField(false);
        setApplyCashback(false); setPercentDiscount(''); setFixedDiscount('');
        setShowClearConfirm(false);
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setError(''); setSuccessMessage('');
        if (!amount || parseFloat(amount) <= 0) { setError('Số tiền không hợp lệ.'); setSubmitting(false); return; }
        if (transactionType === 'expense' && !fromAccountId) { setError('Vui lòng chọn tài khoản chi.'); setSubmitting(false); return; }
        if (transactionType === 'income' && !toAccountId) { setError('Vui lòng chọn tài khoản nhận.'); setSubmitting(false); return; }
        if (transactionType === 'transfer' && (!fromAccountId || !toAccountId)) { setError('Vui lòng chọn đủ tài khoản nguồn và đích.'); setSubmitting(false); return; }
        if (transactionType === 'transfer' && fromAccountId === toAccountId) { setError('Không thể chuyển khoản đến cùng một tài khoản.'); setSubmitting(false); return; }
        if (!subCategoryId) { setError('Vui lòng chọn danh mục.'); setSubmitting(false); return; }
        if (showPersonField && !personId) { setError('Vui lòng chọn đối tượng.'); setSubmitting(false); return; }
        
        try {
            const newTransactionData: any = {
                Amount: parseFloat(amount), FinalPrice: finalPrice, Date: date, Notes: notes, SubCategoryID: subCategoryId,
                Timestamp: serverTimestamp(), Status: 'Active', Run: false, IsBack: applyCashback,
                PercentDiscount: parseFloat(percentDiscount) || 0, FixedDiscount: parseFloat(fixedDiscount) || 0,
            };
            if (transactionType === 'expense') newTransactionData.FromAccountID = fromAccountId;
            if (transactionType === 'income') newTransactionData.ToAccountID = toAccountId;
            if (transactionType === 'transfer') { newTransactionData.FromAccountID = fromAccountId; newTransactionData.ToAccountID = toAccountId; }
            if (showPersonField && personId) newTransactionData.PersonID = personId;
            await addDoc(collection(firestore, 'transactions'), newTransactionData);
            setSuccessMessage('Thêm giao dịch thành công!');
            setTimeout(() => router.push('/transactions'), 1500);
        } catch (err) { setError('Thêm giao dịch thất bại.'); } 
        finally { setSubmitting(false); }
    };
    
    const accountOptions = useMemo(() => accounts.map(a => ({ id: a.id, name: a.name, group: a.typeName })), [accounts]);
    const fromAccountOptionsForTransfer = useMemo(() => accountOptions.filter(acc => !acc.group?.includes('Credit')), [accountOptions]);
    const peopleOptions = useMemo(() => people.map(p => ({ id: p.id, name: p.name })), [people]);
    const categoryOptions = useMemo(() => {
        if (transactionType === 'expense') return subCategories.filter(c => c.nature === 'EX' || c.nature === 'DEBT').map(c => ({id: c.id, name: c.name}));
        if (transactionType === 'income') return subCategories.filter(c => c.nature === 'IN' || c.nature === 'REPA').map(c => ({id: c.id, name: c.name}));
        return subCategories.filter(c => c.nature === 'TF').map(c => ({id: c.id, name: c.name}));
    }, [subCategories, transactionType]);

    if (loading) return <main className="min-h-screen bg-slate-900 flex justify-center items-center"><p className="text-white">Đang tải...</p></main>

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <GlobalStyles />
            <div className="w-full max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-emerald-400">Giao Dịch Mới</h1>
                  <Tooltip text="Hủy và quay lại">
                    <button onClick={() => isFormDirty ? setShowCancelConfirm(true) : router.back()} className="text-slate-400 hover:text-red-400 text-2xl transition-colors"><FaTimes /></button>
                  </Tooltip>
                </div>
                <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-8">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-lg">
                        <button type="button" onClick={() => setTransactionType('expense')} className={`flex justify-center items-center gap-2 py-2 rounded-lg ${transactionType === 'expense' ? 'bg-red-500' : 'hover:bg-slate-700'}`}><FaArrowUp /> Chi Tiêu</button>
                        <button type="button" onClick={() => setTransactionType('income')} className={`flex justify-center items-center gap-2 py-2 rounded-lg ${transactionType === 'income' ? 'bg-green-500' : 'hover:bg-slate-700'}`}><FaArrowDown /> Thu Nhập</button>
                        <button type="button" onClick={() => setTransactionType('transfer')} className={`flex justify-center items-center gap-2 py-2 rounded-lg ${transactionType === 'transfer' ? 'bg-blue-500' : 'hover:bg-slate-700'}`}><FaExchangeAlt /> Chuyển Khoản</button>
                    </div>

                    <div className="space-y-6">
                        {transactionType === 'expense' && <CustomSelect icon={<FaRegBuilding/>} options={accountOptions} value={fromAccountId} onChange={setFromAccountId} label="Từ Tài Khoản" placeholder="-- Chọn tài khoản --" />}
                        {transactionType === 'income' && <CustomSelect icon={<FaMoneyBillWave/>} options={accountOptions} value={toAccountId} onChange={setToAccountId} label="Vào Tài Khoản" placeholder="-- Chọn tài khoản --" />}
                        {transactionType === 'transfer' && (
                            <div className="space-y-6">
                                <CustomSelect icon={<FaRegBuilding/>} options={fromAccountOptionsForTransfer} value={fromAccountId} onChange={setFromAccountId} label="Từ Tài Khoản (Không dùng thẻ tín dụng)" placeholder="-- Chọn tài khoản nguồn --" />
                                <CustomSelect icon={<FaMoneyBillWave/>} options={accountOptions} value={toAccountId} onChange={setToAccountId} label="Đến Tài Khoản" placeholder="-- Chọn tài khoản đích --" />
                            </div>
                        )}
                        <AmountInput value={amount} onChange={setAmount} />

                         {transactionType === 'expense' && isCashbackAccountSelected && (
                            <CashbackFields 
                                fromAccountId={fromAccountId} transactionDate={date} amount={parseFloat(amount) || 0}
                                isEnabled={applyCashback} onToggle={setApplyCashback}
                                percentDiscount={percentDiscount} onPercentChange={setPercentDiscount}
                                fixedDiscount={fixedDiscount} onFixedChange={setFixedDiscount}
                            />
                        )}

                        {applyCashback && (
                             <div className="bg-slate-900/50 p-4 rounded-lg">
                                <label className="text-sm font-medium text-slate-300">Thành tiền (sau giảm giá)</label>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">{new Intl.NumberFormat('vi-VN').format(finalPrice)} VND</p>
                            </div>
                        )}

                        <CustomSelect icon={<FaTag/>} options={categoryOptions} value={subCategoryId} onChange={setSubCategoryId} label="Danh mục" placeholder="-- Chọn danh mục --" />
                        
                        <div>
                           <label className="block text-sm font-medium text-slate-300 mb-2">Ghi chú & Ngày</label>
                           <div className="grid grid-cols-3 gap-4 items-center">
                                <div className="col-span-2 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaStickyNote /></span>
                                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} required className="w-full p-3 pl-10 bg-slate-900/50 border-b-2 border-slate-600 outline-none" placeholder="Nội dung giao dịch..."/>
                                    {notes && <button type="button" onClick={() => setNotes('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><FaTimesCircle /></button>}
                                </div>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-3 bg-slate-900/50 border-b-2 border-slate-600 outline-none" />
                           </div>
                        </div>
                    </div>
                    
                    {transactionType === 'expense' && (
                        <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
                            <ToggleSwitch id="person-toggle" label="Giao dịch cho người khác?" checked={showPersonField} onChange={setShowPersonField} color="bg-purple-500" />
                            {showPersonField && <CustomSelect icon={<FaUsers/>} options={peopleOptions} value={personId} onChange={setPersonId} label="" placeholder="-- Chọn đối tượng --" />}
                        </div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button type="button" onClick={() => setShowClearConfirm(true)} disabled={!isFormDirty} className="w-1/3 flex justify-center items-center gap-3 bg-slate-600 hover:bg-slate-500 font-bold py-3 rounded-lg disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"><FaTrash /> Xóa Hết</button>
                        <button type="submit" disabled={submitting} className="w-2/3 flex justify-center items-center gap-3 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg disabled:bg-slate-500"><FaSave /> {submitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}</button>
                    </div>
                    {error && <p className="text-red-400 text-center flex items-center justify-center gap-2"><FaExclamationCircle /> {error}</p>}
                    {successMessage && <p className="text-green-400 text-center flex items-center justify-center gap-2"><FaCheckCircle /> {successMessage}</p>}
                </form>
            </div>
            {(showCancelConfirm || showClearConfirm) && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-sm text-center">
                        <h3 className="text-lg font-bold text-white mb-2">{showCancelConfirm ? "Xác nhận Hủy" : "Xác nhận Xóa Form"}</h3>
                        <p className="text-slate-300 mb-6">{showCancelConfirm ? "Bạn có chắc muốn hủy và mất toàn bộ thông tin đã nhập?" : "Toàn bộ thông tin đã nhập sẽ bị xóa."}</p>
                        <div className="flex gap-4">
                            <button onClick={() => {setShowCancelConfirm(false); setShowClearConfirm(false)}} className="w-1/2 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg">Ở lại</button>
                            <button onClick={showCancelConfirm ? () => router.back() : clearForm} className="w-1/2 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg">Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
export default AddTransactionPage;