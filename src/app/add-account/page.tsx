// Updated: 22/09/2025 13:30 (GMT+7)
// src/app/add-account/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { FaSave, FaExclamationCircle, FaCheckCircle, FaTimes, FaUniversity, FaCreditCard, FaPiggyBank, FaSearch, FaShieldAlt, FaImage } from 'react-icons/fa';
import { AmountInput } from '@/components/AmountInput';
import { ToggleSwitch } from '@/components/ToggleSwitch';

// Interfaces
interface SelectOption { id: string; name: string; }

// Modal Component
const SelectorModal = ({ isOpen, onClose, items, onSelect, title }: { isOpen: boolean, onClose: () => void, items: SelectOption[], onSelect: (id: string, name: string) => void, title: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><FaTimes /></button>
                </div>
                <div className="p-4 max-h-80 overflow-y-auto">
                    {items.length > 0 ? (
                        <ul className="space-y-2">
                            {items.map(item => (
                                <li key={item.id} onClick={() => onSelect(item.id, item.name)} className="p-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors text-white">
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    ) : ( <p className="text-slate-400 text-center">No matching accounts found.</p> )}
                </div>
            </div>
        </div>
    );
};


const AddAccountPage = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('ACC');
    
    // Form States
    const [accountName, setAccountName] = useState('');
    const [initialBalance, setInitialBalance] = useState<string>('');
    const [accountTypeId, setAccountTypeId] = useState('ACC-NYMAY19');
    const [imageUrl, setImageUrl] = useState('');
    
    // Credit-specific States
    const [limit, setLimit] = useState<string>('');
    const [statementDay, setStatementDay] = useState<string>('');
    const [isSecured, setIsSecured] = useState(false);
    const [securedByAccountId, setSecuredByAccountId] = useState('');
    const [securedByAccountName, setSecuredByAccountName] = useState('');
    const [accountRole, setAccountRole] = useState('Standalone');
    const [parentAccountId, setParentAccountId] = useState('');
    const [parentAccountName, setParentAccountName] = useState('');
    const [deadline, setDeadline] = useState(''); // FIX: Added missing state
    const [annualFee, setAnnualFee] = useState<string>(''); // FIX: Added missing state
    const [isCashbackEligible, setIsCashbackEligible] = useState(false); // FIX: Added missing state
    const [cashbackPercentage, setCashbackPercentage] = useState<string>(''); // FIX: Added missing state
    const [maxCashbackAmount, setMaxCashbackAmount] = useState<string>(''); // FIX: Added missing state
    const [minSpendForCashback, setMinSpendForCashback] = useState<string>(''); // FIX: Added missing state
    
    // Data from Firestore
    const [parentAccounts, setParentAccounts] = useState<SelectOption[]>([]);
    const [savingsAccounts, setSavingsAccounts] = useState<SelectOption[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isParentSelectorOpen, setIsParentSelectorOpen] = useState(false);
    const [isSecuredBySelectorOpen, setIsSecuredBySelectorOpen] = useState(false);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            const accountsSnapshot = await getDocs(collection(firestore, 'accounts'));
            const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

            const credits = allAccounts
                .filter(acc => acc.AccountTypeID && acc.AccountTypeID.startsWith('CRE') && acc.AccountRole === 'Standalone')
                .map(acc => ({ id: acc.id, name: acc.AccountName }));
            setParentAccounts(credits);

            const savings = allAccounts
                .filter(acc => acc.AccountTypeID && acc.AccountTypeID.startsWith('SAV'))
                .map(acc => ({ id: acc.id, name: acc.AccountName }));
            setSavingsAccounts(savings);
        };
        fetchPrerequisites();
    }, []);

    const createFilteredList = (sourceList: SelectOption[]) => useMemo(() => {
        if (accountName.length < 3) return [];
        const prefix = accountName.substring(0, 3).toLowerCase();
        return sourceList.filter(acc => acc.name.toLowerCase().startsWith(prefix));
    }, [accountName, sourceList]);

    const filteredParentAccounts = createFilteredList(parentAccounts);
    const filteredSavingsAccounts = createFilteredList(savingsAccounts);
    
    useEffect(() => {
        if (filteredParentAccounts.length === 1 && accountRole === 'Child') {
            setParentAccountId(filteredParentAccounts[0].id);
            setParentAccountName(filteredParentAccounts[0].name);
        }
    }, [filteredParentAccounts, accountRole]);

    useEffect(() => {
        if (filteredSavingsAccounts.length === 1 && isSecured) {
            setSecuredByAccountId(filteredSavingsAccounts[0].id);
            setSecuredByAccountName(filteredSavingsAccounts[0].name);
        }
    }, [filteredSavingsAccounts, isSecured]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountName) { setError('Account Name is required.'); return; }
        setSubmitting(true);
        setError('');
        setSuccessMessage('');
        try {
            const newAccountData = {
                AccountName: accountName, AccountTypeID: accountTypeId,
                InitialBalance: Number(initialBalance) || 0,
                CurrentBalance: Number(initialBalance) || 0,
                SumInflow: 0, SumOutflow: 0, IsActive: true,
                ImageUrl: imageUrl || null,
                AccountRole: activeTab === 'CRE' ? accountRole : 'Standalone',
                ParentAccountRef: activeTab === 'CRE' && accountRole === 'Child' ? parentAccountId : null,
                StandaloneLimit: activeTab === 'CRE' && accountRole === 'Standalone' ? (Number(limit) || null) : null,
                IsSecuredCredit: activeTab === 'CRE' ? isSecured : false,
                SecuredByAccountRef: activeTab === 'CRE' && isSecured ? securedByAccountId : null,
                StatementDay: activeTab === 'CRE' ? (Number(statementDay) || null) : null,
                Deadline: activeTab === 'CRE' ? deadline : null,
                AnnualFee: activeTab === 'CRE' ? (Number(annualFee) || 0) : null,
                IsCashbackEligible: activeTab === 'CRE' ? isCashbackEligible : false,
                CashbackPercentage: activeTab === 'CRE' && isCashbackEligible ? (Number(cashbackPercentage) || 0) : 0,
                MaxCashbackAmount: activeTab === 'CRE' && isCashbackEligible ? (Number(maxCashbackAmount) || null) : null,
                MinSpendForCashback: activeTab === 'CRE' && isCashbackEligible ? (Number(minSpendForCashback) || null) : null,
            };
            await addDoc(collection(firestore, 'accounts'), newAccountData);
            setSuccessMessage('Account created successfully!');
            setTimeout(() => router.push('/accounts'), 1500);
        } catch (err: any) {
            setError(`Failed to create account: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    const TABS = [
        { id: 'ACC-NYMAY19', prefix: 'ACC', label: 'Account', icon: <FaUniversity /> },
        { id: 'CRE-YNMAY19', prefix: 'CRE', label: 'Credit', icon: <FaCreditCard /> },
        { id: 'SAV-YNMAY19', prefix: 'SAV', label: 'Savings/Others', icon: <FaPiggyBank /> },
    ];
    
    const handleTabClick = (typeId: string, typePrefix: string) => {
        setActiveTab(typePrefix); setAccountTypeId(typeId);
        setAccountName(''); setInitialBalance(''); setImageUrl(''); setLimit('');
        setStatementDay(''); setIsSecured(false); setSecuredByAccountId('');
        setSecuredByAccountName(''); setAccountRole('Standalone');
        setParentAccountId(''); setParentAccountName('');
        setDeadline(''); setAnnualFee('');
        setIsCashbackEligible(false); setCashbackPercentage('');
        setMaxCashbackAmount(''); setMinSpendForCashback('');
    };

    return (
        <>
            <SelectorModal isOpen={isParentSelectorOpen} onClose={() => setIsParentSelectorOpen(false)} items={filteredParentAccounts} onSelect={(id, name) => { setParentAccountId(id); setParentAccountName(name); setIsParentSelectorOpen(false); }} title="Select Parent Account" />
            <SelectorModal isOpen={isSecuredBySelectorOpen} onClose={() => setIsSecuredBySelectorOpen(false)} items={filteredSavingsAccounts} onSelect={(id, name) => { setSecuredByAccountId(id); setSecuredByAccountName(name); setIsSecuredBySelectorOpen(false); }} title="Select Secured By Account" />

            <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
                <div className="w-full max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-3xl font-bold text-emerald-400">Add New Account</h1>
                      <button type="button" onClick={() => router.back()} className="text-slate-500 hover:text-red-500 text-2xl"><FaTimes /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
                        <div className="flex items-center border border-slate-600 rounded-lg p-1">
                            {TABS.map(tab => (<button key={tab.prefix} type="button" onClick={() => handleTabClick(tab.id, tab.prefix)} className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-md transition-colors font-semibold ${activeTab === tab.prefix ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>{tab.icon} {tab.label}</button>))}
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="accountName" className="block text-sm font-medium text-slate-300 mb-2">Account Name</label>
                                <input id="accountName" type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg" required />
                            </div>
                            <div>
                                <label htmlFor="imageUrl" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaImage/> Image URL (Optional)</label>
                                <input id="imageUrl" type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/card.png" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg" />
                            </div>
                        </div>

                        {activeTab !== 'CRE' && <AmountInput id="initialBalance" label="Initial Balance" value={initialBalance} onChange={setInitialBalance} size="small" showSuggestions={true} />}
                        
                        {activeTab === 'CRE' && (
                            <div className="space-y-4">
                                <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border border-slate-700">
                                    <h3 className="font-bold text-sky-400">Card & Limit Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <AmountInput id="annualFee" label="Annual Fee (0 for free)" value={annualFee} onChange={setAnnualFee} size="small" showSuggestions={true} />
                                        <div>
                                            <label htmlFor="accountRole" className="block text-sm font-medium text-slate-300 mb-2">Card Role</label>
                                            <select id="accountRole" value={accountRole} onChange={e => setAccountRole(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg h-[50px]">
                                                <option value="Standalone">Standalone</option>
                                                <option value="Child">Child (Shared Limit)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {accountRole === 'Child' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Parent Card</label>
                                            <button type="button" onClick={() => setIsParentSelectorOpen(true)} disabled={accountName.length < 3} className="w-full text-left p-3 bg-slate-900 border border-slate-700 rounded-lg disabled:bg-slate-800 flex justify-between items-center">
                                               <span className={parentAccountName ? 'text-white' : 'text-slate-500'}>{parentAccountName || 'Select Parent Account...'}</span><FaSearch />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <AmountInput id="limit" label="Credit Limit" value={limit} onChange={setLimit} size="small" showSuggestions={true} />
                                            <ToggleSwitch id="isSecured" label="Secured Card (Thẻ thế chấp)" checked={isSecured} onChange={setIsSecured} />
                                            {isSecured && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Secured By Account</label>
                                                    <button type="button" onClick={() => setIsSecuredBySelectorOpen(true)} disabled={accountName.length < 3} className="w-full text-left p-3 bg-slate-900 border border-slate-700 rounded-lg disabled:bg-slate-800 flex justify-between items-center">
                                                       <span className={securedByAccountName ? 'text-white' : 'text-slate-500'}>{securedByAccountName || 'Select Savings Account...'}</span><FaShieldAlt />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border border-slate-700">
                                    <h3 className="font-bold text-sky-400">Billing & Cashback</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="statementDay" className="block text-sm font-medium text-slate-300 mb-2">Statement Day</label>
                                            <input id="statementDay" type="number" min="1" max="31" value={statementDay} onChange={e => setStatementDay(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg" />
                                        </div>
                                        <div>
                                            <label htmlFor="deadline" className="block text-sm font-medium text-slate-300 mb-2">First Payment Deadline</label>
                                            <input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg" />
                                        </div>
                                    </div>
                                    <ToggleSwitch id="cashback-toggle" label="Eligible for Cashback" checked={isCashbackEligible} onChange={setIsCashbackEligible} />
                                    {isCashbackEligible && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                            <AmountInput id="cashbackPercentage" label="% Cashback" value={cashbackPercentage} onChange={setCashbackPercentage} size="small" showSuggestions={false} required={isCashbackEligible} />
                                            <AmountInput id="maxCashbackAmount" label="Max Cashback" value={maxCashbackAmount} onChange={setMaxCashbackAmount} size="small" showSuggestions={true} required={isCashbackEligible} />
                                            <AmountInput id="minSpendForCashback" label="Min Spend" value={minSpendForCashback} onChange={setMinSpendForCashback} size="small" showSuggestions={true} required={isCashbackEligible}/>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="pt-4"><button type="submit" disabled={submitting} className="w-full flex justify-center items-center gap-3 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg disabled:bg-slate-600"> <FaSave /> {submitting ? 'Saving...' : 'Save Account'}</button></div>
                        {error && <p className="text-red-400 text-center"><FaExclamationCircle className="inline mr-2" />{error}</p>}
                        {successMessage && <p className="text-green-400 text-center"><FaCheckCircle className="inline mr-2" />{successMessage}</p>}
                    </form>
                </div>
            </main>
        </>
    );
};

export default AddAccountPage;

