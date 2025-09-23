// src/components/AddCategoryModal.tsx
"use client";

import { FaTimes, FaSave } from 'react-icons/fa';

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// FIX: Changed to a named export to prevent import/export mismatches.
export const AddCategoryModal = ({ isOpen, onClose }: AddCategoryModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-700">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white">Create New Category</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><FaTimes /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* This is a MOCKUP form */}
                    <div>
                        <label className="text-sm text-slate-300 mb-2 block">Category Name</label>
                        <input type="text" placeholder="e.g., Groceries" className="w-full p-2 bg-slate-700 rounded-md" />
                    </div>
                     <div>
                        <label className="text-sm text-slate-300 mb-2 block">Image URL</label>
                        <input type="text" placeholder="https://example.com/icon.png" className="w-full p-2 bg-slate-700 rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-sm text-slate-300 mb-2 block">Transaction Nature</label>
                           <select className="w-full p-2 bg-slate-700 rounded-md">
                                <option>EX (Expense)</option>
                                <option>IN (Income)</option>
                                <option>TF (Transfer)</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-sm text-slate-300 mb-2 block">Owner Type</label>
                           <select className="w-full p-2 bg-slate-700 rounded-md">
                                <option>PERSONAL</option>
                                <option>EXTERNAL</option>
                           </select>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm text-slate-300 mb-2 block">Special Logic (Optional)</label>
                        <input type="text" placeholder="e.g., DEBT_LEND" className="w-full p-2 bg-slate-700 rounded-md" />
                    </div>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-b-lg">
                    <button onClick={onClose} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold transition-colors">
                        <FaSave /> Save Category
                    </button>
                </div>
            </div>
        </div>
    );
}

