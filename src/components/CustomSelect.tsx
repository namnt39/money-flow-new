// Updated: 22/09/2025 22:25 (GMT+7)
// src/components/CustomSelect.tsx
"use client";
import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { 
    FaPlus, FaCreditCard, FaUniversity, FaMoneyBillWave, FaQuestionCircle, 
    FaUser, FaUsers, FaTimes, FaSearch, FaCheckCircle, FaUserFriends, FaUsersCog 
} from 'react-icons/fa';

export interface SelectOption {
    id: string;
    name: string;
    group?: string;
    imageUrl?: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    icon: React.ReactNode;
    canAddNew?: boolean;
    addNewLabel?: string;
    onAddNew?: () => void;
}

const groupIcons: { [key: string]: React.ReactNode } = {
    'Credit': <FaCreditCard />,
    'Account': <FaUniversity />,
    'Savings': <FaMoneyBillWave />,
    'PERSONAL': <FaUser />,
    'EXTERNAL': <FaUsers />,
    'SINGLE': <FaUserFriends />,
    'GROUP': <FaUsersCog />,
};

// --- Modal Component ---
const SelectorModal = ({
    isOpen, onClose, items, onSelect, title, onAddNew, canAddNew, addNewLabel, activeTransactionType
}: {
    isOpen: boolean,
    onClose: () => void,
    items: SelectOption[],
    onSelect: (id: string) => void,
    title: string,
    onAddNew?: () => void,
    canAddNew?: boolean,
    addNewLabel?: string,
    activeTransactionType: string,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const modalContentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const groups = useMemo(() => {
        // For 'transfer' type categories, don't show tabs as they are all PERSONAL
        if (title.includes("Category") && activeTransactionType === 'transfer') {
            return [];
        }
        const groupSet = new Set(items.map(o => o.group).filter(Boolean));
        return groupSet.size > 1 ? ['All', ...Array.from(groupSet)] : [];
    }, [items, title, activeTransactionType]);

    const filteredItems = useMemo(() => {
        let opts = items;
        if (activeTab !== 'All') opts = opts.filter(opt => opt.group === activeTab);
        return opts.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm, activeTab]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
            setSearchTerm('');
            if (groups.length > 0) setActiveTab('All');
        }
    }, [isOpen, groups]);
    
    const renderGroupName = (group: string) => group.charAt(0).toUpperCase() + group.slice(1).toLowerCase();

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
            <div ref={modalContentRef} className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-700 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><FaTimes /></button>
                </div>
                <div className="p-2 border-b border-slate-700 flex-shrink-0">
                     <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input ref={searchInputRef} type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 bg-slate-900 border border-slate-600 rounded-md"/>
                    </div>
                </div>
                {groups.length > 0 && (
                    <div className="flex gap-1 p-2 bg-slate-900/50 border-b border-slate-700 overflow-x-auto flex-shrink-0">
                        {groups.map(group => (
                            <button type="button" key={group} onClick={() => setActiveTab(group!)} className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${activeTab === group ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {groupIcons[group!] || <FaQuestionCircle />}
                                <span>{renderGroupName(group as string)}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="p-2 overflow-y-auto flex-grow">
                    {filteredItems.length > 0 ? (
                        <ul className="space-y-1">
                            {filteredItems.map(item => (
                                <li key={item.id} onClick={() => onSelect(item.id)} className="p-3 rounded-lg hover:bg-slate-700 cursor-pointer text-white flex items-center gap-3">
                                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-auto object-contain"/>}
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (<p className="text-slate-400 text-center py-4">No results found.</p>)}
                </div>
                 {canAddNew && onAddNew && (
                    <div className="p-2 border-t border-slate-700 flex-shrink-0">
                        <button onClick={onAddNew} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors text-sm font-bold">
                            <FaPlus /> {addNewLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
export default function CustomSelectV2(props: CustomSelectProps & { activeTransactionType?: string }) {
    const { options, value, onChange, placeholder, label, icon, canAddNew, addNewLabel, onAddNew, activeTransactionType = '' } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const selectedOption = useMemo(() => options.find(opt => opt.id === value), [options, value]);

    const handleSelect = (selectedId: string) => {
        onChange(selectedId);
        setIsModalOpen(false);
    };

    return (
        <Fragment>
            <div className="relative">
                 <label htmlFor={label} className="absolute -top-2 left-3 px-1 bg-slate-800 text-xs text-slate-400">{label}</label>
                 <div className="flex items-center">
                    <span className="absolute left-4 text-slate-400">{icon}</span>
                    <button type="button" id={label} onClick={() => setIsModalOpen(true)} className="w-full flex justify-between items-center bg-transparent border-2 border-slate-600 rounded-lg py-3 pl-11 pr-10 focus:border-sky-500 outline-none transition text-left min-h-[52px]">
                        <div className="flex items-center gap-3">
                            {selectedOption?.imageUrl && <img src={selectedOption.imageUrl} alt={selectedOption.name} className="w-10 h-auto object-contain"/>}
                            <span className={selectedOption ? 'text-white' : 'text-slate-400'}>{selectedOption?.name || placeholder}</span>
                        </div>
                    </button>
                    {value && <FaCheckCircle className="absolute right-4 text-emerald-500" />}
                 </div>
            </div>
            <SelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                items={options}
                onSelect={handleSelect}
                title={`Select ${label}`}
                canAddNew={canAddNew}
                addNewLabel={addNewLabel}
                onAddNew={onAddNew}
                activeTransactionType={activeTransactionType}
            />
        </Fragment>
    );
};
