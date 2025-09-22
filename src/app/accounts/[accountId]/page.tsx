// Created: 22/09/2025 12:50 (GMT+7)
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { firestore } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

interface Transaction { id: string; [key: string]: any; }
interface Account { id: string; [key: string]: any; }

const AccountDetailPage = () => {
    const params = useParams();
    const accountId = params.accountId as string;
    const [account, setAccount] = useState<Account | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAccountData = useCallback(async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const accountRef = doc(firestore, 'accounts', accountId);
            const accountSnap = await getDoc(accountRef);

            if (accountSnap.exists()) {
                const accountData = { id: accountSnap.id, ...accountSnap.data() };
                setAccount(accountData as Account);
                
                const fromQuery = query(collection(firestore, 'transactions'), where('FromAccountID', '==', accountId));
                const toQuery = query(collection(firestore, 'transactions'), where('ToAccountID', '==', accountId));

                const [fromSnapshot, toSnapshot] = await Promise.all([getDocs(fromQuery), getDocs(toQuery)]);
                
                const allTransactions = new Map<string, Transaction>();
                fromSnapshot.forEach(d => allTransactions.set(d.id, { id: d.id, ...d.data() } as Transaction));
                toSnapshot.forEach(d => allTransactions.set(d.id, { id: d.id, ...d.data() } as Transaction));
                
                const sortedTransactions = Array.from(allTransactions.values())
                    .sort((a, b) => (b.Timestamp?.toMillis() || 0) - (a.Timestamp?.toMillis() || 0));

                setTransactions(sortedTransactions);
            }
        } catch (error) {
            console.error("Error fetching account details:", error);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        fetchAccountData();
    }, [fetchAccountData]);

    const formatCurrency = (value: number | undefined | null) => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('vi-VN').format(value);
    }
    
    const AccountDetailSummary = () => {
        if(!account) return null;
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Current Balance</h3><p className="text-xl font-bold text-emerald-400">{formatCurrency(account.CurrentBalance)}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Inflow</h3><p className="text-xl font-bold text-green-400">{formatCurrency(account.SumInflow)}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Outflow</h3><p className="text-xl font-bold text-red-400">{formatCurrency(account.SumOutflow)}</p></div>
                 {account.AccountTypeID?.startsWith('CRE') && <div className="bg-slate-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Credit Limit</h3><p className="text-xl font-bold text-sky-400">{formatCurrency(account.StandaloneLimit)}</p></div>}
            </div>
        )
    };

    if (loading) return <div className="text-center p-10">Loading account details...</div>;
    if (!account) return <div className="text-center p-10">Account not found.</div>;

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <div className="w-full max-w-screen-xl mx-auto">
                <Link href="/accounts" className="flex items-center gap-2 text-sky-400 hover:text-sky-300 mb-6">
                    <FaArrowLeft /> Back to Accounts
                </Link>
                <div className="flex items-center gap-4 mb-6">
                    {account.ImageUrl && <img src={account.ImageUrl} alt={account.AccountName} className="w-24 h-auto rounded-lg" />}
                    <div>
                        <h1 className="text-3xl font-bold">{account.AccountName}</h1>
                        <p className="text-slate-400">Transaction history for this account.</p>
                    </div>
                </div>
                <AccountDetailSummary />
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                     <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
                     {/* Smart Filters will be implemented here */}
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400">
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="py-2">{tx.Date}</td>
                                        <td className="py-2">{tx.Notes || 'N/A'}</td>
                                        <td className={`py-2 text-right font-mono ${tx.FromAccountID === accountId ? 'text-red-400' : 'text-green-400'}`}>
                                            {tx.FromAccountID === accountId ? '-' : '+'}
                                            {formatCurrency(tx.FinalPrice)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
        </main>
    );
};

export default AccountDetailPage;

