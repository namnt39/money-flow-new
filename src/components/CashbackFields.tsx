// Updated: 21/09/2025 01:45 (GMT+7)
"use client";

import { useState, useEffect, useMemo } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { firestore } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaTimesCircle } from 'react-icons/fa';
import { Tooltip } from '@/components/Tooltip'; // FIX: Changed to absolute path alias
interface CashbackFieldsProps {
    fromAccountId: string; transactionDate: string; amount: number;
    percentDiscount: string; fixedDiscount: string;
    onPercentChange: (value: string) => void; onFixedChange: (value: string) => void;
    isEnabled: boolean; onToggle: (isEnabled: boolean) => void;
}

const SACOMBANK_ACCOUNT_ID = 'SAC-CA12A-CRE';
const SACOMBANK_CASHBACK_RATE = 5;
const SACOMBANK_MAX_CASHBACK = 500000;
const SACOMBANK_STATEMENT_DAY = 11;

export const CashbackFields = (props: CashbackFieldsProps) => {
    const { fromAccountId, transactionDate, isEnabled, onToggle, amount } = props;
    const [hint, setHint] = useState('');
    const [usedBudget, setUsedBudget] = useState(0);
    const [remainingBudget, setRemainingBudget] = useState(0);

    const maxCashbackForThisTxn = useMemo(() => {
        if (!amount) return 0;
        return (amount * SACOMBANK_CASHBACK_RATE) / 100;
    }, [amount]);
    
    const finalBudgetForThisTxn = useMemo(() => Math.min(remainingBudget, maxCashbackForThisTxn), [remainingBudget, maxCashbackForThisTxn]);

    useEffect(() => {
        if (fromAccountId !== SACOMBANK_ACCOUNT_ID || !isEnabled) {
            setHint(''); return;
        }
        const calculateHint = async () => {
            setHint('Đang tính toán...');
            try {
                const transDate = new Date(transactionDate);
                let startCycle = new Date(transDate);
                if (transDate.getDate() < SACOMBANK_STATEMENT_DAY) {
                    startCycle.setMonth(startCycle.getMonth() - 1, SACOMBANK_STATEMENT_DAY);
                } else {
                    startCycle.setDate(SACOMBANK_STATEMENT_DAY);
                }
                const cycleTag = `${startCycle.getFullYear()}-${String(startCycle.getMonth() + 1).padStart(2, '0')}`;
                
                const ledgerQuery = query(collection(firestore, 'cashbackledger'), where('AccountID', '==', fromAccountId), where('CycleTag', '==', cycleTag));
                const querySnapshot = await getDocs(ledgerQuery);
                
                let totalCashbackEarnedInCycle = 0;
                if (!querySnapshot.empty) {
                    totalCashbackEarnedInCycle = querySnapshot.docs[0].data().SumBackEarned || 0;
                }
                
                setUsedBudget(totalCashbackEarnedInCycle);
                const budget = SACOMBANK_MAX_CASHBACK - totalCashbackEarnedInCycle;
                setRemainingBudget(budget);

                const equivalentPercent = amount > 0 ? ((finalBudgetForThisTxn / amount) * 100).toFixed(2) : 0;

                if (finalBudgetForThisTxn <= 0) {
                    setHint(`⚠️ Đã hết ngân sách cashback kỳ này.`);
                } else {
                    setHint(`✅ Ngân sách tối đa: ${new Intl.NumberFormat('vi-VN').format(finalBudgetForThisTxn)} VND (~${equivalentPercent}%)`);
                }
            } catch (error) {
                setHint("Lỗi tính toán ngân sách cashback.");
            }
        };
        if(amount > 0) calculateHint();
        else setHint('Nhập số tiền để tính cashback.');

    }, [fromAccountId, transactionDate, isEnabled, amount, finalBudgetForThisTxn]);

    const totalDiscountApplied = (parseFloat(props.percentDiscount) || 0) * amount / 100 + (parseFloat(props.fixedDiscount) || 0);
    const isOverBudget = totalDiscountApplied > finalBudgetForThisTxn && finalBudgetForThisTxn >= 0;

    const handlePercentChange = (value: string) => {
        let numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) numValue = 0;
        if (numValue > 100) numValue = 100;

        const otherDiscount = parseFloat(props.fixedDiscount) || 0;
        const potentialNewTotal = (numValue * amount / 100) + otherDiscount;

        if (potentialNewTotal > finalBudgetForThisTxn) {
            let cappedPercent = ((finalBudgetForThisTxn - otherDiscount) / amount) * 100;
            if (cappedPercent < 0) cappedPercent = 0;
            props.onPercentChange(cappedPercent.toFixed(2));
        } else {
            props.onPercentChange(value);
        }
    }
    
    const handleFixedChange = (value: string) => {
        const rawValue = value.replace(/[^0-9]/g, '');
        let numValue = parseInt(rawValue, 10);
        if (isNaN(numValue) || numValue < 0) numValue = 0;

        const otherDiscount = (parseFloat(props.percentDiscount) || 0) * amount / 100;
        const potentialNewTotal = numValue + otherDiscount;
        
        if (potentialNewTotal > finalBudgetForThisTxn) {
            let cappedFixed = finalBudgetForThisTxn - otherDiscount;
            if (cappedFixed < 0) cappedFixed = 0;
            props.onFixedChange(Math.floor(cappedFixed).toString());
        } else {
             props.onFixedChange(rawValue);
        }
    }

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
            <ToggleSwitch id="cashback-toggle" label="Áp dụng Cashback/Giảm giá" checked={isEnabled} onChange={onToggle} color="bg-sky-500" />
            {isEnabled && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-300 mb-2 block">Giảm giá (%)</label>
                            <div className="relative flex items-center">
                                <input type="number" step="0.01" min="0" max="100" placeholder="VD: 3.5" value={props.percentDiscount} onBlur={e => handlePercentChange(e.target.value)} onChange={e => props.onPercentChange(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md hide-arrows pr-8"/>
                                {props.percentDiscount && 
                                    <Tooltip text="Xóa %">
                                        <button type="button" onClick={() => props.onPercentChange('')} className="absolute right-2 text-slate-500 hover:text-white"><FaTimesCircle /></button>
                                    </Tooltip>
                                }
                            </div>
                        </div>
                         <div>
                            <label className="text-sm text-slate-300 mb-2 block">Giảm giá (VND)</label>
                             <div className="relative flex items-center">
                                <input type="text" placeholder="VD: 50,000" 
                                    value={props.fixedDiscount ? new Intl.NumberFormat('vi-VN').format(parseInt(props.fixedDiscount)) : ''}
                                    onBlur={e => handleFixedChange(e.target.value)}
                                    onChange={e => props.onFixedChange(e.target.value.replace(/[^0-9]/g, ''))} 
                                    className="w-full p-2 bg-slate-700 rounded-md pr-8"
                                />
                                {props.fixedDiscount && 
                                    <Tooltip text="Xóa VND">
                                        <button type="button" onClick={() => props.onFixedChange('')} className="absolute right-2 text-slate-500 hover:text-white"><FaTimesCircle /></button>
                                    </Tooltip>
                                }
                            </div>
                        </div>
                    </div>
                    {hint && <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-400' : 'text-amber-300'}`}>{hint}</p>}
                    {usedBudget > 0 && <p className="text-xs text-slate-400">Đã dùng trong kỳ: {new Intl.NumberFormat('vi-VN').format(usedBudget)} VND</p>}
                </>
            )}
        </div>
    );
};