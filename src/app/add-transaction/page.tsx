// Updated: 22/09/2025 15:45 (GMT+7)
// src/app/add-transaction/page.tsx
"use client";
import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { FaSave, FaExclamationCircle, FaCheckCircle, FaArrowDown, FaArrowUp, FaExchangeAlt, FaTag, FaRegBuilding, FaMoneyBillWave, FaTimes, FaUsers, FaStickyNote, FaCalculator, FaCalendarAlt, FaHistory, FaHandshake, FaPlus, FaTrash } from 'react-icons/fa';
import { AmountInput } from '@/components/AmountInput';
import CustomSelect from '@/components/CustomSelect';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { Tooltip } from '@/components/Tooltip';
import { MiniCalculator } from '@/components/MiniCalculator';

// Interfaces
interface Account { id: string; name: string; type: string; typeName: string; }
interface Person { id: string; name: string; }
interface Category { id: string; name: string; categoryId: string; nature: 'IN' | 'EX' | 'TF'; specialLogic?: 'DEBT_TRACKING' | 'CREDIT_PAYMENT' | 'INTERNAL_TRANSFER'; ownerType?: 'PERSONAL' | 'EXTERNAL'; }

// Mockup Component for Split Transaction
const SplitTransactionMockup = () => (
    <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border-l-4 border-purple-500 mt-4">
        <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-purple-400">Split Transaction Details</h3>
             <p className="text-sm text-slate-400">Total: 100,000 | Remaining: 0</p>
        </div>
        <p className="text-xs text-slate-400 bg-slate-800 p-2 rounded-md">
            <strong>Logic Suggestion:</strong> A main transaction will be saved with `isSplit: true`. The details below will be saved in a `splits` sub-collection.
        </p>
        <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5"><input type="text" readOnly value="Mine (Expense)" className="w-full p-2 bg-slate-700 rounded-md text-slate-300"/></div>
            <div className="col-span-5"><input type="text" readOnly value="50,000" className="w-full p-2 bg-slate-700 rounded-md text-right"/></div>
            <div className="col-span-2"><button type="button" className="w-full p-2 bg-slate-600 rounded-md flex justify-center items-center" disabled><FaTrash/></button></div>
        </div>
         <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5"><input type="text" readOnly value="Lam (Debt)" className="w-full p-2 bg-slate-700 rounded-md text-slate-300"/></div>
            <div className="col-span-5"><input type="text" readOnly value="50,000" className="w-full p-2 bg-slate-700 rounded-md text-right"/></div>
            <div className="col-span-2"><button type="button" className="w-full p-2 bg-slate-600 rounded-md flex justify-center items-center"><FaTrash/></button></div>
        </div>
        <button type="button" className="w-full p-2 bg-sky-600 hover:bg-sky-500 rounded-md flex justify-center items-center gap-2"><FaPlus/> Add Person</button>
    </div>
);


const getMonthTag = (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}${year}`;
}

const TagFields = ({ date, transactionType, tag, onTagChange, repaymentTag, onRepaymentTagChange }: { date: string, transactionType: string, tag: string, onTagChange: (t: string) => void, repaymentTag: string, onRepaymentTagChange: (t: string) => void }) => {
    const [useLastMonth, setUseLastMonth] = useState(false);
    useEffect(() => {
        const transactionDate = new Date(date);
        if (useLastMonth) transactionDate.setMonth(transactionDate.getMonth() - 1);
        onTagChange(getMonthTag(transactionDate));
    }, [date, useLastMonth, onTagChange]);
    
    const recentRepayTags = useMemo(() => {
        const tags = [];
        const today = new Date();
        for (let i = 0; i < 3; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            tags.push(getMonthTag(d));
        }
        return tags;
    }, []);

    if (transactionType === 'expense') return (
        <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-lg space-y-4 mt-4">
            <ToggleSwitch id="last-month-toggle" label="Record debt for last month?" checked={useLastMonth} onChange={setUseLastMonth} color="bg-amber-500"/>
            <div><label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaCalendarAlt/> Debt Period</label><input type="text" value={tag} onChange={(e) => onTagChange(e.target.value.toUpperCase())} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md" placeholder="e.g. SEP25"/></div>
        </div>
    )
    
    if(transactionType === 'income') return (
        <div className="bg-emerald-900/30 border border-emerald-800 p-4 rounded-lg space-y-2 mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaHistory/> Repayment Period</label>
            <div className="flex gap-2">
                {recentRepayTags.map(rt => (<button type="button" key={rt} onClick={() => onRepaymentTagChange(rt)} className={`flex-1 py-2 rounded-lg text-sm ${repaymentTag === rt ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{rt}</button>))}
            </div>
        </div>
    )
    return null;
}

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
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [tag, setTag] = useState('');
    const [repaymentTag, setRepaymentTag] = useState('');
    const [showCalculator, setShowCalculator] = useState(false);
    const [isSplitMode, setIsSplitMode] = useState(false);

    useEffect(() => { 
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const [accTypeSnapshot, pplSnapshot, accSnapshot, catSnapshot, subCatSnapshot] = await Promise.all([
                    getDocs(collection(firestore, 'accounttypes')),
                    getDocs(collection(firestore, 'people')),
                    getDocs(collection(firestore, 'accounts')),
                    getDocs(collection(firestore, 'categories')),
                    getDocs(collection(firestore, 'subcategories')),
                ]);

                const accTypeMap = new Map(accTypeSnapshot.docs.map(doc => [doc.id, doc.data().AccountTypeName]));
                
                setPeople(pplSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    name: doc.data()?.PersonName || 'Unknown Person' 
                })));

                setAccounts(accSnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    return { 
                        id: doc.id, 
                        name: data.AccountName || 'Unknown Account',
                        type: data.AccountTypeID,
                        typeName: accTypeMap.get(data.AccountTypeID) || 'Other' 
                    } as Account;
                }));
                
                const catMap = new Map(catSnapshot.docs.map(doc => [doc.id, doc.data()]));
                
                const allSubCategories = subCatSnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    const parentCategory = catMap.get(data.CategoryID) || {};
                    return { 
                        id: doc.id, 
                        name: data.SubCategoryName || 'Unknown Category',
                        categoryId: data.CategoryID,
                        nature: parentCategory.TransactionNature,
                        specialLogic: parentCategory.specialLogic,
                        ownerType: parentCategory.ownerType
                    };
                }) as Category[];
                setCategories(allSubCategories);

            } catch (err: any) { 
                console.error("Firebase fetch error in add-transaction:", err);
                setError('Failed to load form data. Check browser console for details.'); 
            } 
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const selectedCategory = useMemo(() => categories.find(sc => sc.id === subCategoryId), [subCategoryId, categories]);
    
    useEffect(() => {
        if (transactionType === 'transfer') {
            const transferCategory = categories.find(c => c.specialLogic === 'INTERNAL_TRANSFER');
            if (transferCategory) setSubCategoryId(transferCategory.id);
        } else { setSubCategoryId(''); }
    }, [transactionType, categories]);
    
    const handleSubmit = async (e: React.FormEvent) => { /* Submit logic */ };
    
    const accountOptions = useMemo(() => accounts.map(a => ({ id: a.id, name: a.name, group: a.typeName })), [accounts]);
    const peopleOptions = useMemo(() => people.map(p => ({ id: p.id, name: p.name })), [people]);
    
    const categoryOptions = useMemo(() => {
        let relevantNature: 'IN' | 'EX' | 'TF' = 'EX';
        if(transactionType === 'income') relevantNature = 'IN';
        if(transactionType === 'transfer') relevantNature = 'TF';
        return categories
            .filter(c => c.nature === relevantNature)
            .map(c => ({id: c.id, name: c.name, group: c.ownerType }));
    }, [categories, transactionType]);
    
    const fromAccountOptionsForTransfer = useMemo(() => accountOptions.filter(acc => acc.group !== 'Credit'), [accountOptions]);
    const toAccountOptionsForTransfer = useMemo(() => accountOptions, [accountOptions]);
    
    const shouldShowPersonField = selectedCategory?.ownerType === 'EXTERNAL';
    const shouldShowDebtFields = selectedCategory?.specialLogic === 'DEBT_TRACKING';
    
    if (loading) return <main className="min-h-screen bg-slate-900 flex justify-center items-center"><p>Loading form...</p></main>
    if (error) return <main className="min-h-screen bg-slate-900 flex justify-center items-center"><p className="text-red-400">{error}</p></main>;

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <div className="w-full max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-bold text-emerald-400">New Transaction</h1>
                  <button type="button" onClick={() => router.back()} className="text-slate-500 hover:text-red-500 text-2xl"><FaTimes /></button>
                </div>
                <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-lg">
                        <button type="button" onClick={() => setTransactionType('expense')} className={`flex justify-center items-center gap-2 py-2 rounded-md font-semibold ${transactionType === 'expense' ? 'bg-red-600 text-white' : 'hover:bg-slate-700 text-red-400'}`}><FaArrowUp /> Expense</button>
                        <button type="button" onClick={() => setTransactionType('income')} className={`flex justify-center items-center gap-2 py-2 rounded-md font-semibold ${transactionType === 'income' ? 'bg-green-600 text-white' : 'hover:bg-slate-700 text-green-400'}`}><FaArrowDown /> Income</button>
                        <button type="button" onClick={() => setTransactionType('transfer')} className={`flex justify-center items-center gap-2 py-2 rounded-md font-semibold ${transactionType === 'transfer' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-blue-400'}`}><FaExchangeAlt /> Transfer</button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-grow"> <AmountInput value={amount} onChange={setAmount} /> </div>
                            <div className="relative flex-shrink-0"><Tooltip text="Calculator"><button type="button" onClick={() => setShowCalculator(s => !s)} className="text-xl p-3 h-[49px] bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/40"><FaCalculator/></button></Tooltip>{showCalculator && <MiniCalculator onClose={() => setShowCalculator(false)} onCalculate={setAmount} initialValue={amount} />}</div>
                        </div>
                        {transactionType !== 'transfer' && <CustomSelect icon={<FaTag/>} options={categoryOptions} value={subCategoryId} onChange={setSubCategoryId} label="Category" placeholder="-- Select category --" />}
                        {transactionType === 'expense' && <CustomSelect icon={<FaRegBuilding/>} options={accountOptions} value={fromAccountId} onChange={setFromAccountId} label="From Account" placeholder="-- Select source account --" canAddNew={true} />}
                        {transactionType === 'income' && <CustomSelect icon={<FaMoneyBillWave/>} options={accountOptions} value={toAccountId} onChange={setToAccountId} label="To Account" placeholder="-- Select destination account --" canAddNew={true} defaultTab={selectedCategory?.specialLogic === 'CREDIT_PAYMENT' ? 'Credit' : 'All'} />}
                        {transactionType === 'transfer' && (
                            <div className="space-y-4">
                                <CustomSelect icon={<FaTag/>} options={categoryOptions} value={subCategoryId} onChange={setSubCategoryId} label="Transfer Type" placeholder="-- Select transfer type --" />
                                <CustomSelect icon={<FaRegBuilding/>} options={fromAccountOptionsForTransfer} value={fromAccountId} onChange={setFromAccountId} label="From Account" placeholder="-- Select source account --" />
                                <CustomSelect icon={<FaMoneyBillWave/>} options={toAccountOptionsForTransfer} value={toAccountId} onChange={setToAccountId} label="To Account" placeholder="-- Select destination account --" defaultTab={selectedCategory?.specialLogic === 'CREDIT_PAYMENT' ? 'Credit' : 'Account'} />
                            </div>
                        )}
                    </div>
                    
                    {(shouldShowPersonField || shouldShowDebtFields) && (
                        <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
                           {shouldShowPersonField && <CustomSelect icon={<FaHandshake/>} options={peopleOptions} value={personId} onChange={setPersonId} label="Partner" placeholder="-- Select a person --" />}
                           {shouldShowDebtFields && <TagFields date={date} transactionType={transactionType} tag={tag} onTagChange={setTag} repaymentTag={repaymentTag} onRepaymentTagChange={setRepaymentTag} />}
                        </div>
                    )}
                    
                     <div><div className="grid grid-cols-3 gap-4 items-center"><div className="col-span-2 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaStickyNote /></span><input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} required className="w-full p-3 pl-10 bg-slate-900/50 border-b-2 border-slate-600 outline-none" placeholder="Transaction details..."/></div><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-3 bg-slate-900/50 border-b-2 border-slate-600 outline-none" /></div></div>
                    {transactionType === 'expense' && (<div className="bg-slate-900/50 p-4 rounded-lg"><ToggleSwitch id="split-toggle" label="Split Transaction" checked={isSplitMode} onChange={setIsSplitMode} color="bg-purple-500" />{isSplitMode && <SplitTransactionMockup />}</div>)}
                    <div className="pt-4"><button type="submit" disabled={submitting} className="w-full flex justify-center items-center gap-3 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"><FaSave /> {submitting ? 'Saving...' : 'Save Transaction'}</button></div>
                </form>
            </div>
        </main>
    );
};
export default AddTransactionPage;