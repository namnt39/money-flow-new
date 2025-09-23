// Fixed Build Error: 23/09/2025 12:00 (GMT+7)
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowUp, FaArrowDown, FaExchangeAlt, FaTimes, FaTag } from 'react-icons/fa';
import CustomSelect, { SelectOption } from '@/components/CustomSelect'; // Placeholder, will be used later
// FIX: Corrected the import to use a named import { AddCategoryModal }
import { AddCategoryModal } from '@/components/AddCategoryModal'; 

// This is a placeholder component for demonstration
const MockupField = ({ label }: { label: string }) => (
    <div className="p-4 bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg text-center text-slate-400">
        {label}
    </div>
);

export default function AddTransactionPage() {
    const router = useRouter();
    const [transactionType, setTransactionType] = useState('expense');
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

    return (
        <>
            <AddCategoryModal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} />
            <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white">New Transaction</h1>
                        <button onClick={() => router.back()} className="text-slate-400 hover:text-white"><FaTimes /></button>
                    </div>

                    {/* Transaction Type Selector */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-lg">
                         <button onClick={() => setTransactionType('expense')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${transactionType === 'expense' ? 'bg-red-600' : 'text-red-400 hover:bg-slate-700'}`}><FaArrowUp /> Expense</button>
                         <button onClick={() => setTransactionType('income')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${transactionType === 'income' ? 'bg-green-600' : 'text-green-400 hover:bg-slate-700'}`}><FaArrowDown /> Income</button>
                         <button onClick={() => setTransactionType('transfer')} className={`py-2 rounded-md font-semibold flex justify-center items-center gap-2 ${transactionType === 'transfer' ? 'bg-blue-600' : 'text-blue-400 hover:bg-slate-700'}`}><FaExchangeAlt /> Transfer</button>
                    </div>

                    {/* Amount Input Mockup */}
                    <MockupField label="Amount Input" />
                    
                    {/* Category Dropdown with "Add New" functionality */}
                     <div>
                         <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2"><FaTag/> Category</label>
                         <CustomSelect
                            options={[]} // Will be populated from Firestore later
                            value=""
                            onChange={() => {}}
                            placeholder="Select a category..."
                            label=""
                            icon={<></>}
                            canAddNew={true}
                            addNewLabel="Create New Category"
                            onAddNew={() => setIsAddCategoryModalOpen(true)}
                        />
                    </div>

                    {/* Mockups for other fields */}
                    <MockupField label="Account Selection" />
                    <MockupField label="Partner / People Selection" />
                    <MockupField label="Notes & Date Fields" />
                    <MockupField label="Cashback / Debt Fields" />
                    
                    <button type="submit" className="w-full font-bold py-3 rounded-lg bg-emerald-600/50 text-emerald-300 cursor-not-allowed">
                        Save Transaction (Disabled)
                    </button>
                </div>
            </main>
        </>
    );
}

