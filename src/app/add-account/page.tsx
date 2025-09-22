// Updated: 22/09/2025 19:15 (GMT+7)
// src/app/add-transaction/page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSave, FaExclamationCircle, FaArrowDown, FaArrowUp, FaExchangeAlt, FaTag, FaRegBuilding, FaMoneyBillWave, FaTimes, FaStickyNote, FaCalculator, FaCalendarAlt, FaHistory, FaHandshake, FaPlus, FaTrash } from 'react-icons/fa';
import { AmountInput } from '@/components/AmountInput';
import CustomSelect from '@/components/CustomSelect';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { Tooltip } from '@/components/Tooltip';
import { MiniCalculator } from '@/components/MiniCalculator';

// Interfaces
interface Account { id: string; name: string; type: string; typeName: string; imageUrl?: string; }
interface Person { id: string; name: string; personType?: 'SINGLE' | 'GROUP'; }
interface Category { id: string; name: string; categoryId: string; nature: 'IN' | 'EX' | 'TF'; specialLogic?: string; ownerType?: 'PERSONAL' | 'EXTERNAL'; }
type FormState = {
    transactionType: string; amount: string; notes: string; date: string;
    fromAccountId: string; toAccountId: string; subCategoryId: string; personId: string;
};

// ... (Các component mockup và helper functions giữ nguyên)
const SplitTransactionMockup = () => ( <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border-l-4 border-purple-500 mt-4">{/* Mockup content */}</div> );

const getMonthTag = (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}${year}`;
};

interface TagFieldsProps {
    date: string;
    onTagChange: (t: string) => void;
    onRepaymentTagChange: (t: string) => void;
}

const TagFields = ({ date, onTagChange, onRepaymentTagChange }: TagFieldsProps) => {
    const [useLastMonth, setUseLastMonth] = useState(false);
    const [tag, setInternalTag] = useState('');
    const [repaymentTag, setInternalRepaymentTag] = useState('');

    useEffect(() => {
        const transactionDate = new Date(date);
        if (useLastMonth) transactionDate.setMonth(transactionDate.getMonth() - 1);
        const newTag = getMonthTag(transactionDate);
        setInternalTag(newTag);
        onTagChange(newTag);
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

    const handleRepayTagClick = (rt: string) => {
        setInternalRepaymentTag(rt);
        onRepaymentTagChange(rt);
    };

    return (
        <div className="space-y-4">
            <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-lg space-y-4">
                <p className="text-xs text-amber-300 font-bold">FOR EXPENSE (DEBT_TRACKING)</p>
                <ToggleSwitch id="last-month-toggle" label="Record debt for last month?" checked={useLastMonth} onChange={setUseLastMonth} color="bg-amber-500"/>
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaCalendarAlt/> Debt Period</label>
                    <input type="text" value={tag} onChange={(e) => { setInternalTag(e.target.value.toUpperCase()); onTagChange(e.target.value.toUpperCase());}} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md" placeholder="e.g. SEP25"/>
                </div>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-800 p-4 rounded-lg space-y-2">
                 <p className="text-xs text-green-300 font-bold">FOR INCOME (DEBT_TRACKING)</p>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaHistory/> Repayment Period</label>
                <div className="flex gap-2">
                    {recentRepayTags.map(rt => (<button type="button" key={rt} onClick={() => handleRepayTagClick(rt)} className={`flex-1 py-2 rounded-lg text-sm ${repaymentTag === rt ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{rt}</button>))}
                </div>
            </div>
        </div>
    );
};


const AddTransactionPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [formState, setFormState] = useState<FormState>({
        transactionType: 'expense', amount: '', notes: '',
        date: new Date().toISOString().split('T')[0], fromAccountId: '',
        toAccountId: '', subCategoryId: '', personId: ''
    });

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [tag, setTag] = useState('');
    const [repaymentTag, setRepaymentTag] = useState('');
    const [isSplitMode, setIsSplitMode] = useState(false);

    const updateFormState = (field: keyof FormState, value: string) => {
        setFormState(prevState => ({ ...prevState, [field]: value }));
    };
    
    const saveState = useCallback(() => {
        sessionStorage.setItem('addTransactionFormState', JSON.stringify(formState));
    }, [formState]);
    
    const loadState = useCallback(() => {
        const savedState = sessionStorage.getItem('addTransactionFormState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                setFormState(prevState => ({ ...prevState, ...state }));
            } catch (e) { console.error("Failed to parse state", e); }
        }
    }, []);

    useEffect(() => {
        loadState();
        const fetchData = async () => {
            setLoading(true);
            try {
                const [accTypeSnapshot, pplSnapshot, accSnapshot, catSnapshot, subCatSnapshot] = await Promise.all([
                    getDocs(collection(firestore, 'accounttypes')), getDocs(collection(firestore, 'people')),
                    getDocs(collection(firestore, 'accounts')), getDocs(collection(firestore, 'categories')),
                    getDocs(collection(firestore, 'subcategories')),
                ]);

                const accTypeMap = new Map(accTypeSnapshot.docs.map(doc => [doc.id, doc.data().AccountTypeName]));
                setPeople(pplSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data()?.PersonName || 'N/A', personType: doc.data()?.personType || 'SINGLE' })));
                setAccounts(accSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, name: data.AccountName || 'N/A', type: data.AccountTypeID, typeName: accTypeMap.get(data.AccountTypeID) || 'Other', imageUrl: data.ImageUrl } as Account;
                }));
                const catMap = new Map(catSnapshot.docs.map(doc => [doc.id, doc.data()]));
                setCategories(subCatSnapshot.docs.map(doc => {
                    const data = doc.data(); const parent = catMap.get(data.CategoryID);
                    return { id: doc.id, name: data.SubCategoryName, categoryId: data.CategoryID, nature: parent?.TransactionNature, specialLogic: parent?.specialLogic, ownerType: parent?.ownerType || 'PERSONAL' } as Category;
                }));
            } finally { setLoading(false); }
        };
        fetchData();
    }, [loadState]);

    useEffect(() => {
        const newAccountId = searchParams.get('newAccountId');
        const targetField = searchParams.get('targetField') as keyof FormState;
        if (newAccountId && targetField) {
            updateFormState(targetField, newAccountId);
            const newUrl = window.location.pathname;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }, [searchParams]);

    const handleAddNew = (path: string, field: keyof FormState) => {
        saveState();
        router.push(`${path}?fromField=${field}`);
    };

    const handleTransactionTypeChange = (type: string) => {
        setFormState(prev => ({
            ...prev, transactionType: type, subCategoryId: '', fromAccountId: '',
            toAccountId: '', personId: ''
        }));
    };

    const accountOptions = useMemo(() => accounts.map(a => ({ id: a.id, name: a.name, group: a.typeName, imageUrl: a.imageUrl })), [accounts]);
    const peopleOptions = useMemo(() => people.map(p => ({ id: p.id, name: p.name, group: p.personType })), [people]);
    const categoryOptions = useMemo(() => {
        const nature = formState.transactionType === 'income' ? 'IN' : formState.transactionType === 'expense' ? 'EX' : 'TF';
        return categories
            .filter(c => c.nature === nature)
            .map(c => ({id: c.id, name: c.name, group: c.ownerType }));
    }, [categories, formState.transactionType]);

    if (loading) return <main className="min-h-screen bg-slate-900 flex justify-center items-center"><p>Loading form...</p></main>;
    if (error) return <main className="min-h-screen bg-slate-900 flex justify-center items-center"><p className="text-red-400">{error}</p></main>;

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <div className="w-full max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-emerald-400">Add Transaction (Show All Fields)</h1>
                    <button type="button" onClick={() => router.back()} className="text-slate-500 hover:text-red-500 text-2xl"><FaTimes /></button>
                </div>
                <form className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-lg">
                        <button type="button" onClick={() => handleTransactionTypeChange('expense')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'expense' ? 'bg-red-600' : 'text-red-400 hover:bg-slate-700'}`}><FaArrowUp /> Expense</button>
                        <button type="button" onClick={() => handleTransactionTypeChange('income')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'income' ? 'bg-green-600' : 'text-green-400 hover:bg-slate-700'}`}><FaArrowDown /> Income</button>
                        <button type="button" onClick={() => handleTransactionTypeChange('transfer')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'transfer' ? 'bg-blue-600' : 'text-blue-400 hover:bg-slate-700'}`}><FaExchangeAlt /> Transfer</button>
                    </div>

                    <div className="space-y-4">
                        <AmountInput value={formState.amount} onChange={(v) => updateFormState('amount', v)} />
                        
                        <CustomSelect icon={<FaTag/>} options={categoryOptions} value={formState.subCategoryId} onChange={(v) => updateFormState('subCategoryId', v)} label="Category" placeholder="-- Select category --" canAddNew addNewLabel="Create New Category"/>
                        <CustomSelect icon={<FaRegBuilding/>} options={accountOptions} value={formState.fromAccountId} onChange={(v) => updateFormState('fromAccountId', v)} label="From Account" placeholder="-- Select source account --" canAddNew onAddNew={() => handleAddNew('/add-account', 'fromAccountId')} addNewLabel="Create New Account" />
                        <CustomSelect icon={<FaMoneyBillWave/>} options={accountOptions} value={formState.toAccountId} onChange={(v) => updateFormState('toAccountId', v)} label="To Account" placeholder="-- Select destination account --" canAddNew onAddNew={() => handleAddNew('/add-account', 'toAccountId')} addNewLabel="Create New Account"/>
                        <CustomSelect icon={<FaHandshake/>} options={peopleOptions} value={formState.personId} onChange={(v) => updateFormState('personId', v)} label="Partner" placeholder="-- Select a person --" canAddNew addNewLabel="Create New Person"/>
                        
                        <TagFields date={formState.date} onTagChange={setTag} onRepaymentTagChange={setRepaymentTag} />

                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <ToggleSwitch id="split-toggle" label="Split Transaction" checked={isSplitMode} onChange={setIsSplitMode} color="bg-purple-500" />
                            {isSplitMode && <SplitTransactionMockup />}
                        </div>
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-4 border-t border-slate-700">
                        <div className="md:col-span-2 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaStickyNote /></span>
                            <input type="text" value={formState.notes} onChange={(e) => updateFormState('notes', e.target.value)} required className="w-full p-3 pl-10 bg-slate-700/50 border border-slate-600 rounded-lg" placeholder="Transaction details..."/>
                        </div>
                        <input type="date" value={formState.date} onChange={(e) => updateFormState('date', e.target.value)} required className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg" />
                    </div>
                    
                    <div className="pt-4"><button type="submit" disabled={submitting} className="w-full flex justify-center items-center gap-3 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"><FaSave /> {submitting ? 'Saving...' : 'Save Transaction'}</button></div>
                </form>
            </div>
        </main>
    );
};
export default AddTransactionPage;

