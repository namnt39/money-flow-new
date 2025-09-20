// Updated: 21/09/2025 01:23 (GMT+7)
"use client";
import { useState, useMemo, useRef, useEffect } from 'react';
import { FaPlus, FaChevronDown, FaCreditCard, FaUniversity, FaMoneyBillWave, FaQuestionCircle } from 'react-icons/fa';
import { Tooltip } from './Tooltip';

export interface SelectOption { id: string; name: string; group?: string; }

interface CustomSelectProps {
    options: SelectOption[]; value: string; onChange: (value: string) => void;
    placeholder: string; label: string; icon?: React.ReactNode;
}

const groupIcons: { [key: string]: React.ReactNode } = {
    'Credit': <FaCreditCard />,
    'Account': <FaUniversity />,
    'Savings': <FaMoneyBillWave />
}

// SỬA LỖI: Đổi thành export default
export default function CustomSelect({ options, value, onChange, placeholder, label, icon }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Tất cả');
    const ref = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find(opt => opt.id === value), [options, value]);
    const groups = useMemo(() => ['Tất cả', ...Array.from(new Set(options.map(o => o.group).filter((g): g is string => Boolean(g))))], [options]);

    const filteredOptions = useMemo(() => {
        let opts = options;
        if (activeTab !== 'Tất cả') {
            opts = opts.filter(opt => opt.group === activeTab);
        }
        return opts.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        onChange(optionId); setIsOpen(false); setSearchTerm('');
    };
    
    useEffect(() => {
        if(isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
            const currentGroup = selectedOption?.group;
            if (currentGroup && groups.includes(currentGroup)) {
                setActiveTab(currentGroup);
            } else {
                setActiveTab('Tất cả');
            }
        }
    }, [isOpen, selectedOption, groups]);

    return (
        <div ref={ref} className="relative w-full">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">{icon}{label}</label>
            <div className="flex items-center">
                 <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 bg-slate-900/50 border-b-2 border-slate-600 focus:border-emerald-500 outline-none transition text-left">
                    <span className={selectedOption ? 'text-white' : 'text-slate-400'}>{selectedOption?.name || placeholder}</span>
                    <FaChevronDown className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <Tooltip text="Tạo mới (sắp có)">
                    <button type="button" className="ml-2 p-3 bg-sky-600 hover:bg-sky-500 rounded-lg">
                        <FaPlus />
                    </button>
                </Tooltip>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-72 flex flex-col">
                    <div className="p-2 border-b border-slate-700">
                        <input ref={searchInputRef} type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md" />
                    </div>
                    {groups.length > 1 && (
                        <div className="flex gap-2 p-2 bg-slate-900/50 border-b border-slate-700">
                            {groups.map(group => (
                                <button type="button" key={group} onClick={() => setActiveTab(group)} 
                                        className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors ${activeTab === group ? 'bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    {groupIcons[group] || <FaQuestionCircle />}
                                    <span className="hidden sm:inline">{group}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <ul className="overflow-y-auto flex-grow">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <li key={option.id} onClick={() => handleSelect(option.id)} className="px-4 py-2 hover:bg-slate-700 cursor-pointer">{option.name}</li>
                        )) : <li className="px-4 py-2 text-slate-500">Không có kết quả</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};
