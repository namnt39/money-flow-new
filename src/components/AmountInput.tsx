// Updated: 21/09/2025 01:13 (GMT+7)
"use client";
import { useMemo, useState } from 'react';
import { FaCalculator, FaTimesCircle } from 'react-icons/fa';
import { Tooltip } from './Tooltip';

const numberToVietnameseText = (num: number): string => {
    if (num === 0) return '';
    const units = ['', 'nghìn', 'triệu', 'tỷ'];
    let text = '';
    let i = 0;
    while (num > 0) {
        const chunk = num % 1000;
        if (chunk > 0) {
            let chunkText = i > 0 ? `${chunk}` : `${chunk}`;
            if(i === 1 && chunk < 100 && chunk >=10) chunkText = `${chunk}`;
            text = `${chunkText} ${units[i]} ${text}`;
        }
        num = Math.floor(num / 1000);
        i++;
    }
    return text.trim();
};

const CalculatorMockup = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-lg z-20">
        <div className="w-full h-12 bg-slate-800 rounded-md mb-4 text-right p-2 text-2xl text-white">0</div>
        <div className="grid grid-cols-4 gap-2 text-white">
            <button className="p-3 bg-slate-700 rounded-md">7</button><button className="p-3 bg-slate-700 rounded-md">8</button><button className="p-3 bg-slate-700 rounded-md">9</button><button className="p-3 bg-amber-500 rounded-md">/</button>
            <button className="p-3 bg-slate-700 rounded-md">4</button><button className="p-3 bg-slate-700 rounded-md">5</button><button className="p-3 bg-slate-700 rounded-md">6</button><button className="p-3 bg-amber-500 rounded-md">*</button>
            <button className="p-3 bg-slate-700 rounded-md">1</button><button className="p-3 bg-slate-700 rounded-md">2</button><button className="p-3 bg-slate-700 rounded-md">3</button><button className="p-3 bg-amber-500 rounded-md">-</button>
            <button className="p-3 bg-slate-700 rounded-md col-span-2">0</button><button className="p-3 bg-slate-700 rounded-md">.</button><button className="p-3 bg-amber-500 rounded-md">+</button>
            <button className="p-3 bg-emerald-600 rounded-md col-span-4">=</button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">Đây là mockup, chức năng sẽ được thêm sau.</p>
        <button onClick={onClose} className="absolute -top-2 -right-2 text-white bg-red-500 rounded-full p-1"><FaTimesCircle /></button>
    </div>
);


export const AmountInput = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
    const [showCalc, setShowCalc] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [hasTyped, setHasTyped] = useState(false);
    const numericValue = useMemo(() => parseInt(value.replace(/[^0-9]/g, ''), 10) || 0, [value]);

    const suggestions = useMemo(() => {
        if (!numericValue || numericValue === 0 || !isFocused || !hasTyped) return [];
        let base = numericValue;
        const results = [];
        if (base < 1000) {
            results.push(base * 1000, base * 10000, base * 100000);
        } else {
            results.push(base * 1000, base * 10000);
        }
        return results.slice(0, 3);
    }, [numericValue, isFocused, hasTyped]);
    
    const formattedValue = new Intl.NumberFormat('vi-VN').format(numericValue);
    const textValue = numberToVietnameseText(numericValue);

    return (
        <div className="relative">
            <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">Số tiền</label>
            <div className="relative">
                <input 
                    type="text" id="amount" 
                    value={numericValue === 0 ? '' : new Intl.NumberFormat('vi-VN').format(numericValue)}
                    onChange={(e) => { onChange(e.target.value.replace(/[^0-9]/g, '')); setHasTyped(true); }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => { setIsFocused(false); setHasTyped(false); }}
                    required className="w-full p-3 pl-4 bg-slate-900/50 border-b-2 border-slate-600 focus:border-emerald-500 outline-none text-2xl transition"
                    placeholder="0"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    {numericValue > 0 && 
                        <Tooltip text="Xóa số tiền">
                            <button type="button" onClick={() => onChange('0')} className="text-slate-500 hover:text-white"><FaTimesCircle /></button>
                        </Tooltip>
                    }
                    <Tooltip text="Mở máy tính">
                         <button type="button" onClick={() => setShowCalc(!showCalc)} className="text-slate-400 hover:text-white"><FaCalculator /></button>
                    </Tooltip>
                </div>
            </div>
            
            {numericValue > 0 && (
                <div className="flex justify-between items-center text-slate-400 text-sm mt-2 px-1">
                    <span className="italic">{textValue}</span>
                    <span className="font-semibold">{formattedValue} VND</span>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                    {suggestions.map(s => (
                        <button type="button" key={s} onMouseDown={() => { onChange(s.toString()); setHasTyped(false); }} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition">
                            {new Intl.NumberFormat('vi-VN').format(s)}
                        </button>
                    ))}
                </div>
            )}
            {showCalc && <CalculatorMockup onClose={() => setShowCalc(false)}/>}
        </div>
    );
};
