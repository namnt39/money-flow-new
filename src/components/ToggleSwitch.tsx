// Updated: 21/09/2025 01:39 (GMT+7)
"use client";

interface ToggleSwitchProps {
    id: string; // SỬA LỖI: Thêm ID để tránh conflict
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    color?: string;
}

export const ToggleSwitch = ({ id, checked, onChange, label, color = 'bg-emerald-500' }: ToggleSwitchProps) => (
    <label htmlFor={id} className="flex items-center cursor-pointer">
        <div className="relative">
            <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-14 h-8 rounded-full transition ${checked ? color : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-3 text-slate-300 font-medium">{label}</div>
    </label>
);