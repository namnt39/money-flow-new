// Updated: 22/09/2025 11:50 (GMT+7)
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

interface MiniCalculatorProps {
    onClose: () => void;
    onCalculate: (value: string) => void;
    initialValue: string;
}

export const MiniCalculator = ({ onClose, onCalculate, initialValue }: MiniCalculatorProps) => {
    const [display, setDisplay] = useState(initialValue || '0');
    const [history, setHistory] = useState('');
    const [firstOperand, setFirstOperand] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const formatNumber = (numStr: string) => {
        if (numStr.includes('Infinity') || numStr.includes('NaN')) return "Error";
        const [integerPart, decimalPart] = numStr.split('.');
        if (!integerPart) return '';
        const formattedInteger = new Intl.NumberFormat('en-US').format(BigInt(integerPart.replace(/,/g, '')));
        return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
    };

    const resetCalculator = () => {
        setDisplay('0'); setHistory(''); setFirstOperand(null);
        setOperator(null); setWaitingForSecondOperand(false);
    };
    
    // FIX: Moved 'calculate' function before 'handleInput' to resolve "used before assigned" error.
    const calculate = useCallback((secondOperand: number, chain: boolean = false) => {
        if (operator && firstOperand !== null) {
            let result = 0;
            if (operator === '+') result = firstOperand + secondOperand;
            else if (operator === '-') result = firstOperand - secondOperand;
            else if (operator === '*') result = firstOperand * secondOperand;
            else if (operator === '/') result = secondOperand === 0 ? Infinity : firstOperand / secondOperand;
            
            const resultStr = String(result);
            setHistory(`${formatNumber(String(firstOperand))} ${operator} ${formatNumber(String(secondOperand))} =`);
            setDisplay(resultStr);
            setFirstOperand(result);
            if(!chain) {
                setOperator(null);
            }
            setWaitingForSecondOperand(true);
        }
    }, [operator, firstOperand]);
    
    const handleInput = useCallback((key: string) => {
        if (/\d/.test(key)) {
            if (waitingForSecondOperand) {
                setDisplay(key);
                setWaitingForSecondOperand(false);
            } else {
                // Prevent excessively long numbers
                if (display.replace(/,/g, '').length >= 15) return;
                setDisplay(display === '0' ? key : display + key);
            }
        } else if (key === '.') {
            if (!display.includes('.')) {
                setDisplay(display + '.');
            }
        } else if (['/', '*', '-', '+'].includes(key)) {
            const currentValue = parseFloat(display.replace(/,/g, ''));
            if (operator && !waitingForSecondOperand) {
                calculate(currentValue, true);
            } else {
                setFirstOperand(currentValue);
            }
            setHistory(`${formatNumber(String(currentValue))} ${key}`);
            setOperator(key);
            setWaitingForSecondOperand(true);
        } else if (key === '=' || key === 'Enter') {
             calculate(parseFloat(display.replace(/,/g, '')));
        } else if (key === 'Backspace') {
            setDisplay(display.slice(0, -1) || '0');
        } else if (key.toLowerCase() === 'c' || key === 'Delete' || key === 'Escape') {
             if (key === 'Escape') {
                 onClose();
             } else {
                resetCalculator();
             }
        }
    }, [display, operator, firstOperand, waitingForSecondOperand, calculate]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
            }
            handleInput(event.key)
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInput]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    
    const isResultZero = parseFloat(display) === 0;

    return (
        <div ref={ref} className="absolute top-full right-0 mt-2 z-20">
            <div className="bg-slate-800 rounded-lg p-4 w-64 text-center border border-slate-600 shadow-lg">
                <div className="bg-slate-900 p-3 rounded-md text-right mb-4">
                    <div className="text-slate-400 text-sm h-6 break-all">{history}</div>
                    <div className="text-white text-3xl font-mono break-all">{formatNumber(display)}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-white">
                    <button type="button" onClick={resetCalculator} className="p-3 bg-red-500/80 hover:bg-red-500 rounded-md text-lg col-span-2">C</button>
                    <button type="button" onClick={() => handleInput('Backspace')} className="p-3 bg-slate-600 hover:bg-slate-500 rounded-md text-lg">DEL</button>
                    <button type="button" onClick={() => handleInput('/')} className={`p-3 rounded-md text-lg transition-colors ${operator === '/' ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-400'}`}>÷</button>
                    
                    {['7','8','9'].map(key => <button type="button" key={key} onClick={() => handleInput(key)} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-lg">{key}</button>)}
                    <button type="button" onClick={() => handleInput('*')} className={`p-3 rounded-md text-lg transition-colors ${operator === '*' ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-400'}`}>×</button>

                    {['4','5','6'].map(key => <button type="button" key={key} onClick={() => handleInput(key)} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-lg">{key}</button>)}
                    <button type="button" onClick={() => handleInput('-')} className={`p-3 rounded-md text-lg transition-colors ${operator === '-' ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-400'}`}>-</button>

                    {['1','2','3'].map(key => <button type="button" key={key} onClick={() => handleInput(key)} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-lg">{key}</button>)}
                    <button type="button" onClick={() => handleInput('+')} className={`p-3 rounded-md text-lg transition-colors ${operator === '+' ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-400'}`}>+</button>

                    <button type="button" onClick={() => handleInput('0')} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-lg col-span-2">0</button>
                    <button type="button" onClick={() => handleInput('.')} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-lg">.</button>
                    <button type="button" onClick={() => handleInput('=')} className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-md text-lg">=</button>

                </div>
                <button 
                    type="button" 
                    onClick={() => { onCalculate(display.replace(/[^0-9.]/g, '')); onClose(); }} 
                    disabled={isResultZero}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed">
                        Apply Value
                </button>
            </div>
        </div>
    );
};

