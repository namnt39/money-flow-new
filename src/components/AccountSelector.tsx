"use client";
import { useState, useMemo, useRef, useEffect } from 'react';
import { FaPlus, FaChevronDown } from 'react-icons/fa';

export interface AccountOption { id: string; name: string; group: string; }
interface AccountSelectorProps {
    options: AccountOption[];
    value: string;
    onChange: (value: string) => void;
    label: string;
}

export const AccountSelector = ({ options, value, onChange, label }: AccountSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const groups = useMemo(() => [...new Set(options.map(opt => opt.group))], [options]);
    const [activeTab, setActiveTab] = useState(groups[0]);

    useEffect(() => { setActiveTab(groups[0]) }, [groups]);

    const selectedOption = useMemo(() => options.find(opt => opt.id === value), [options, value]);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => 
            opt.group === activeTab && 
            opt.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, activeTab]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative w-full">
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div ref={ref} className="flex items-center gap-2">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex-grow flex justify-between items-center p-3 bg-slate-700 border border-slate-600 rounded-md text-left">
                    <span className={selectedOption ? 'text-white' : 'text-slate-400'}>{selectedOption?.name || '-- Chọn tài khoản --'}</span>
                    <FaChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <button type="button" className="p-3 bg-sky-600 hover:bg-sky-500 rounded-md" title="Tạo tài khoản mới (sắp có)">
                    <FaPlus />
                </button>
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-72 flex flex-col">
                    <div className="flex-shrink-0 border-b border-slate-700 p-1">
                        <div className="grid grid-cols-3 gap-1">
                          {groups.map(group => (
                              <button type="button" key={group} onClick={() => setActiveTab(group)} className={`text-xs py-1 rounded ${activeTab === group ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                  {group}
                              </button>
                          ))}
                        </div>
                    </div>
                    <div className="flex-shrink-0 p-2">
                        <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-slate-900 rounded-md"/>
                    </div>
                    <ul className="flex-grow overflow-y-auto">
                        {filteredOptions.map(option => (
                            <li key={option.id} onClick={() => handleSelect(option.id)} className="px-4 py-2 hover:bg-slate-700 cursor-pointer">{option.name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};