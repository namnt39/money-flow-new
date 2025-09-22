// Updated: 22/09/2025 22:25 (GMT+7)
// src/app/add-transaction/page-v2.tsx
"use client";
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    FaSave, FaArrowDown, FaArrowUp, FaExchangeAlt, FaTag, FaRegBuilding, 
    FaMoneyBillWave, FaTimes, FaStickyNote, FaCalculator, FaCalendarAlt, 
    FaHistory, FaHandshake, FaPlus, FaTrash, FaCheckCircle 
} from 'react-icons/fa';
import CustomSelect, { SelectOption } from '@/components/CustomSelect'; // Import phiên bản mới
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { MiniCalculator } from '@/components/MiniCalculator';

// --- Interfaces ---
interface Account { id: string; name: string; type: string; typeName: string; imageUrl?: string; }
interface Person { id: string; name: string; personType?: 'SINGLE' | 'GROUP'; }
interface Category { id: string; name: string; categoryId: string; nature: 'IN' | 'EX' | 'TF'; specialLogic?: string; ownerType?: 'PERSONAL' | 'EXTERNAL'; }
type FormState = {
    transactionType: string; amount: string; notes: string; date: string;
    fromAccountId: string; toAccountId: string; subCategoryId: string; personId: string;
};

// --- InputField Component (New) ---
interface InputFieldProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    icon: React.ReactNode;
    type?: 'text' | 'date';
    hasValue: boolean;
}
const InputField = ({ id, value, onChange, placeholder, label, icon, type = 'text', hasValue }: InputFieldProps) => (
    <div className="relative">
        <label htmlFor={id} className="absolute -top-2 left-3 px-1 bg-slate-800 text-xs text-slate-400">{label}</label>
        <div className="flex items-center">
            <span className="absolute left-4 text-slate-400">{icon}</span>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent border-2 border-slate-600 rounded-lg py-3 pl-11 pr-10 focus:border-sky-500 outline-none transition"
            />
            {hasValue && <FaCheckCircle className="absolute right-4 text-emerald-500" />}
        </div>
    </div>
);

// --- AmountField Component (New) ---
const AmountField = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const [showCalc, setShowCalc] = useState(false);
    const textValue = useMemo(() => {
        const num = Number(String(value).replace(/[^0-9]/g, ''));
        if (isNaN(num) || num === 0) return '';
        const units = ['', ' nghìn', ' triệu', ' tỷ'];
        let tempNum = num;
        const chunks = [];
        while (tempNum > 0) { chunks.push(tempNum % 1000); tempNum = Math.floor(tempNum / 1000); }
        if (chunks.length === 0) return '';
        let result = '';
        const significantChunks = chunks.reverse().slice(0, 2);
        const startingUnitIndex = chunks.length - 1;
        significantChunks.forEach((chunk, index) => {
            if (chunk > 0) result += `${chunk}${units[startingUnitIndex - index]} `;
        });
        return result.trim();
    }, [value]);

    return (
        <div className="relative">
             <div className="flex items-center">
                <input
                    type="text"
                    value={value === '' || value === '0' ? '' : new Intl.NumberFormat('vi-VN').format(Number(value))}
                    onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className="w-full bg-slate-900 text-white text-3xl font-bold p-3 text-center outline-none rounded-lg"
                    inputMode="numeric"
                />
                 <div className="absolute right-3 flex items-center gap-2">
                    {value && value !== '0' && (
                        <button type="button" onClick={() => onChange('0')} className="text-slate-500 hover:text-white text-lg p-2"><FaTimes /></button>
                    )}
                    <button type="button" onClick={() => setShowCalc(s => !s)} className="text-amber-400 hover:text-amber-300 text-lg p-2"><FaCalculator/></button>
                 </div>
             </div>
             {textValue && <p className="text-center text-slate-400 mt-1 text-sm">{textValue} VND</p>}
             {showCalc && <MiniCalculator onClose={() => setShowCalc(false)} onCalculate={onChange} initialValue={value} />}
        </div>
    );
};


const AddTransactionPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ... (State definitions remain largely the same)
    const [formState, setFormState] = useState<FormState>({
        transactionType: 'expense', amount: '', notes: '',
        date: new Date().toISOString().split('T')[0], fromAccountId: '',
        toAccountId: '', subCategoryId: '', personId: ''
    });

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSplitMode, setIsSplitMode] = useState(false);

    const updateFormState = (field: keyof FormState, value: string) => setFormState(p => ({ ...p, [field]: value }));
    const saveState = useCallback(() => sessionStorage.setItem('addTxForm', JSON.stringify(formState)), [formState]);
    const loadState = useCallback(() => {
        const saved = sessionStorage.getItem('addTxForm');
        if (saved) setFormState(JSON.parse(saved));
    }, []);

    useEffect(() => {
        loadState();
        const fetchData = async () => {
            setLoading(true);
            try {
                 const [accTypes, ppl, accs, cats, subCats] = await Promise.all([
                    getDocs(collection(firestore, 'accounttypes')), getDocs(collection(firestore, 'people')),
                    getDocs(collection(firestore, 'accounts')), getDocs(collection(firestore, 'categories')),
                    getDocs(collection(firestore, 'subcategories')),
                ]);

                const accTypeMap = new Map(accTypes.docs.map(d => [d.id, d.data().AccountTypeName]));
                setPeople(ppl.docs.map(d => ({ id: d.id, ...d.data() } as Person)));
                setAccounts(accs.docs.map(d => ({ id: d.id, typeName: accTypeMap.get(d.data().AccountTypeID), ...d.data() } as Account)));
                const catMap = new Map(cats.docs.map(d => [d.id, d.data()]));
                setCategories(subCats.docs.map(d => {
                    const parent = catMap.get(d.data().CategoryID) || {};
                    return { id: d.id, ...d.data(), ...parent } as Category;
                }));
            } finally { setLoading(false); }
        };
        fetchData();
    }, [loadState]);

    useEffect(() => {
        const newId = searchParams.get('newAccountId');
        const field = searchParams.get('targetField') as keyof FormState;
        if (newId && field) {
            updateFormState(field, newId);
            router.replace('/add-transaction/page-v2', undefined);
        }
    }, [searchParams, router]);
    
    const handleAddNew = (path: string, field: keyof FormState) => {
        saveState();
        router.push(`${path}?fromField=${field}`);
    };
    
    const handleTransactionTypeChange = (type: string) => {
        setFormState(prev => ({
            ...prev, transactionType: type, subCategoryId: '', fromAccountId: '', toAccountId: '', personId: ''
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

    // ... (Loading/Error UI)

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">New Transaction</h1>
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-white"><FaTimes /></button>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-lg">
                    {/* Transaction Type Buttons */}
                    <button type="button" onClick={() => handleTransactionTypeChange('expense')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'expense' ? 'bg-red-600' : 'text-red-400 hover:bg-slate-700'}`}><FaArrowUp /> Expense</button>
                    <button type="button" onClick={() => handleTransactionTypeChange('income')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'income' ? 'bg-green-600' : 'text-green-400 hover:bg-slate-700'}`}><FaArrowDown /> Income</button>
                    <button type="button" onClick={() => handleTransactionTypeChange('transfer')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${formState.transactionType === 'transfer' ? 'bg-blue-600' : 'text-blue-400 hover:bg-slate-700'}`}><FaExchangeAlt /> Transfer</button>
                </div>

                <AmountField value={formState.amount} onChange={(v) => updateFormState('amount', v)} />
                
                <div className="space-y-4">
                    <CustomSelect icon={<FaTag/>} options={categoryOptions} value={formState.subCategoryId} onChange={(v) => updateFormState('subCategoryId', v)} label="Category" placeholder="Select a category" canAddNew addNewLabel="Create New Category"/>
                    <CustomSelect icon={<FaRegBuilding/>} options={accountOptions} value={formState.fromAccountId} onChange={(v) => updateFormState('fromAccountId', v)} label="From Account" placeholder="Select source account" canAddNew onAddNew={() => handleAddNew('/add-account', 'fromAccountId')} addNewLabel="Create New Account" />
                    <CustomSelect icon={<FaMoneyBillWave/>} options={accountOptions} value={formState.toAccountId} onChange={(v) => updateFormState('toAccountId', v)} label="To Account" placeholder="Select destination account" canAddNew onAddNew={() => handleAddNew('/add-account', 'toAccountId')} addNewLabel="Create New Account"/>
                    <CustomSelect icon={<FaHandshake/>} options={peopleOptions} value={formState.personId} onChange={(v) => updateFormState('personId', v)} label="Partner" placeholder="Select a person" canAddNew addNewLabel="Create New Person"/>
                    
                    <InputField id="notes" value={formState.notes} onChange={(v) => updateFormState('notes', v)} placeholder="Add a note..." label="Notes" icon={<FaStickyNote />} hasValue={!!formState.notes} />
                    <InputField id="date" value={formState.date} onChange={(v) => updateFormState('date', v)} placeholder="" label="Date" icon={<FaCalendarAlt />} type="date" hasValue={!!formState.date} />

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <ToggleSwitch id="split-toggle" label="Split Transaction" checked={isSplitMode} onChange={setIsSplitMode} color="bg-purple-500" />
                        {isSplitMode && <div className="text-center p-4 text-purple-300">Split Form Mockup Here</div>}
                    </div>
                </div>
                
                <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-3 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg text-white">
                    <FaSave /> Save Transaction
                </button>
            </div>
        </main>
    );
};
export default AddTransactionPage;
