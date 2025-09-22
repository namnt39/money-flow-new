// Updated: 21/09/2025 21:00 (GMT+7) - Fix UI alignment and enhance suggestions
"use client";
import { useMemo, useState } from 'react';
import { FaTimesCircle } from 'react-icons/fa';
import { Tooltip } from '@/components/Tooltip';

const numberToVietnameseText = (num: number): string => {
    if (isNaN(num) || num === 0) return '';
    const units = ['', ' nghìn', ' triệu', ' tỷ'];
    const chunks = [];
    while (num > 0) { chunks.push(num % 1000); num = Math.floor(num / 1000); }
    if (chunks.length === 0) return '';
    let result = '';
    const significantChunks = chunks.reverse().slice(0, 2);
    const startingUnitIndex = chunks.length - 1;
    significantChunks.forEach((chunk, index) => {
        if (chunk > 0) {
            const unitIndex = startingUnitIndex - index;
            result += `${chunk}${units[unitIndex]} `;
        }
    });
    return result.trim();
};

interface AmountInputProps {
    value: string | number;
    onChange: (value: string) => void;
    id?: string;
    label?: string;
    placeholder?: string;
    size?: 'large' | 'small';
    showSuggestions?: boolean;
    required?: boolean;
}

export const AmountInput = ({ 
    value, onChange, id, label, placeholder = '0', size = 'large', showSuggestions = true, required = false 
}: AmountInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasTyped, setHasTyped] = useState(false);

    const numericValue = useMemo(() => {
        const num = Number(String(value).replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
    }, [value]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        onChange(rawValue);
        if (showSuggestions) setHasTyped(true);
    };

    const suggestions = useMemo(() => {
        if (!showSuggestions || !numericValue || numericValue === 0 || !isFocused || !hasTyped) return [];
        let base = numericValue;
        const results = [];
        if (base < 1000) {
            results.push(base * 1000, base * 10000, base * 100000);
        } else if (base < 1000000) {
             results.push(base * 1000, base * 10000);
        } else {
            results.push(base * 1000);
        }
        return results.slice(0, 3);
    }, [numericValue, isFocused, hasTyped, showSuggestions]);
    
    const formattedValue = new Intl.NumberFormat('vi-VN').format(numericValue);
    const textValue = numberToVietnameseText(numericValue);

    const inputClasses = size === 'large' 
        ? "w-full p-3 pl-4 bg-slate-900/50 border-b-2 border-slate-600 focus:border-emerald-500 outline-none text-2xl transition"
        : "w-full p-3 bg-slate-900 border border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500";

    return (
        <div className="relative">
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
            <div className="relative flex items-center">
                <input 
                    type="text" id={id}
                    value={value === '' || value === 0 ? '' : new Intl.NumberFormat('vi-VN').format(Number(value))}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => { setTimeout(() => setIsFocused(false), 150); if (showSuggestions) setHasTyped(false); }}
                    required={required}
                    className={inputClasses}
                    placeholder={placeholder}
                    inputMode="numeric"
                />
                 {numericValue > 0 && 
                    <div className="absolute right-3 h-full flex items-center">
                        <Tooltip text="Clear amount">
                            <button type="button" onClick={() => onChange('0')} className="text-slate-500 hover:text-white"><FaTimesCircle /></button>
                        </Tooltip>
                    </div>
                }
            </div>
            
            {size === 'large' && numericValue > 0 && (
                <div className="flex justify-between items-center text-slate-400 text-sm mt-2 px-1">
                    <span className="italic">{textValue}</span>
                    <span className="font-semibold">{formattedValue} VND</span>
                </div>
            )}

            {size === 'small' && isFocused && textValue && ( <div className="text-xs text-slate-400 mt-1 px-1 h-4">{textValue}</div> )}
            {size === 'small' && !isFocused && <div className="h-4 mt-1"></div>}

            {suggestions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                    {suggestions.map(s => (
                        <button type="button" key={s} onMouseDown={() => { onChange(s.toString()); if (showSuggestions) setHasTyped(false); }} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition">
                            {new Intl.NumberFormat('vi-VN').format(s)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};