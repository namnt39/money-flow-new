// Updated: 22/09/2025 14:10 (GMT+7)
// src/app/accounts/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { FaPlus, FaSync, FaExclamationCircle, FaCheckCircle, FaList, FaTh } from 'react-icons/fa';

// Interface chi tiết cho một tài khoản
interface Account {
  id: string; AccountName: string; AccountTypeID: string;
  AccountTypeName?: string; CurrentBalance: number;
  InitialBalance: number; SumInflow: number; SumOutflow: number;
  StandaloneLimit?: number; IsActive: boolean; ImageUrl?: string;
  IsSecuredCredit?: boolean;
}

const AccountSummary = ({ accounts }: { accounts: Account[] }) => {
    const summary = useMemo(() => {
        const creditCards = accounts.filter(a => a.AccountTypeName === 'Credit');
        const otherAccounts = accounts.filter(a => a.AccountTypeName !== 'Credit');

        const totalCreditLimit = creditCards.reduce((sum, acc) => sum + (acc.StandaloneLimit || 0), 0);
        const totalCreditBalance = creditCards.reduce((sum, acc) => sum + acc.CurrentBalance, 0);
        const totalOtherBalance = otherAccounts.reduce((sum, acc) => sum + acc.CurrentBalance, 0);

        return { totalCreditLimit, totalCreditBalance, totalOtherBalance };
    }, [accounts]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400">Total Other Balances</h3>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalOtherBalance)}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400">Total Credit Limit</h3>
                <p className="text-2xl font-bold text-sky-400">{formatCurrency(summary.totalCreditLimit)}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400">Total Credit Balances</h3>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalCreditBalance)}</p>
            </div>
        </div>
    );
};

const AccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const accountTypesSnapshot = await getDocs(collection(firestore, 'accounttypes'));
        const accountTypesMap = new Map(accountTypesSnapshot.docs.map(doc => [doc.id, doc.data().AccountTypeName]));
        
        const accountsSnapshot = await getDocs(query(collection(firestore, 'accounts'), orderBy('AccountName')));
        
        const accountsData = accountsSnapshot.docs.map(doc => {
            const data = doc.data();
            // FIX: Added safety checks to prevent crash on missing data
            return {
                id: doc.id,
                AccountName: data.AccountName || 'Unnamed Account',
                AccountTypeID: data.AccountTypeID || '',
                AccountTypeName: accountTypesMap.get(data.AccountTypeID) || 'N/A',
                CurrentBalance: data.CurrentBalance || 0,
                InitialBalance: data.InitialBalance || 0,
                SumInflow: data.SumInflow || 0,
                SumOutflow: data.SumOutflow || 0,
                StandaloneLimit: data.StandaloneLimit,
                IsActive: data.IsActive ?? true,
                ImageUrl: data.ImageUrl,
                IsSecuredCredit: data.IsSecuredCredit,
            } as Account;
        });
        setAccounts(accountsData);
    } catch (err) {
        console.error("Fetch data error:", err);
        setError("Could not load account data. Please check console for details.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshBalances = async () => {
    setIsRefreshing(true);
    setMessage('Starting balance refresh...');
    try {
        const transactionsSnapshot = await getDocs(collection(firestore, 'transactions'));
        const inflows = new Map<string, number>();
        const outflows = new Map<string, number>();

        transactionsSnapshot.forEach(txDoc => {
            const tx = txDoc.data();
            if (tx.ToAccountID && tx.FinalPrice > 0) inflows.set(tx.ToAccountID, (inflows.get(tx.ToAccountID) || 0) + tx.FinalPrice);
            if (tx.FromAccountID && tx.FinalPrice > 0) outflows.set(tx.FromAccountID, (outflows.get(tx.FromAccountID) || 0) + tx.FinalPrice);
        });
        
        const batch = writeBatch(firestore);
        accounts.forEach(acc => {
            const totalInflow = inflows.get(acc.id) || 0;
            const totalOutflow = outflows.get(acc.id) || 0;
            const newBalance = (acc.InitialBalance || 0) + totalInflow - totalOutflow;
            batch.update(doc(firestore, 'accounts', acc.id), { SumInflow: totalInflow, SumOutflow: totalOutflow, CurrentBalance: newBalance });
        });

        await batch.commit();
        setMessage('All account balances have been successfully refreshed!');
        fetchData();
    } catch (err: any) {
        setError(`An error occurred during refresh: ${err.message}`);
    } finally {
        setIsRefreshing(false);
    }
  };


  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-screen-xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Accounts Management</h1>
                <p className="text-sm text-slate-400">Your financial accounts overview.</p>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={handleRefreshBalances} disabled={isRefreshing} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600">
                    <FaSync className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
                </button>
                <Link href="/add-account" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg"><FaPlus /> Add New Account</Link>
            </div>
        </div>
        
        {(message && !error) && <div className="mb-4 p-3 bg-green-900/50 border-green-700 rounded-lg text-green-300 text-sm flex items-center gap-2"><FaCheckCircle /> {message}</div>}
        {error && <div className="mb-4 p-3 bg-red-900/50 border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2"><FaExclamationCircle /> {error}</div>}

        <AccountSummary accounts={accounts} />

        <div className="flex justify-end mb-4">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'list' ? 'bg-slate-600' : ''}`}><FaList/></button>
                <button onClick={() => setViewMode('card')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'card' ? 'bg-slate-600' : ''}`}><FaTh/></button>
            </div>
        </div>

        {viewMode === 'list' ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-600">
                      <tr className="text-slate-400 text-sm">
                        <th className="p-4">Account Name</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Inflow</th>
                        <th className="p-4 text-right">Outflow</th>
                        <th className="p-4 text-right">Current Balance</th>
                        <th className="p-4 text-right">Credit Limit</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <tr><td colSpan={7} className="text-center p-6">Loading...</td></tr>}
                      {!loading && accounts.map((account) => (
                        <tr key={account.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="p-4 font-medium"><Link href={`/accounts/${account.id}`} className="hover:text-sky-400 flex items-center gap-2">{account.ImageUrl && <img src={account.ImageUrl} alt={account.AccountName} className="w-8 h-auto rounded-sm"/>} {account.AccountName}</Link></td>
                          <td className="p-4 text-slate-400">{account.AccountTypeName}</td>
                          <td className="p-4 text-right font-mono text-green-400">{formatCurrency(account.SumInflow)}</td>
                          <td className="p-4 text-right font-mono text-red-400">{formatCurrency(account.SumOutflow)}</td>
                          <td className="p-4 text-right font-mono font-bold text-emerald-400">{formatCurrency(account.CurrentBalance)}</td>
                          <td className="p-4 text-right font-mono text-sky-400">{formatCurrency(account.StandaloneLimit)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${account.IsActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {account.IsActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(account => (
                    <Link href={`/accounts/${account.id}`} key={account.id} className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-sky-500 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="font-bold text-white">{account.AccountName}</h3>
                           <span className={`px-2 py-1 text-xs rounded-full ${account.IsActive ? 'bg-green-500/20 text-green-400' : ''}`}>{account.IsActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">{account.AccountTypeName}</p>
                         {account.ImageUrl && <img src={account.ImageUrl} alt={account.AccountName} className="h-12 object-contain mb-4 rounded-md"/>}
                        <div className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(account.CurrentBalance)}</div>
                        {account.AccountTypeName === 'Credit' && <p className="text-xs text-sky-400 mt-1">Limit: {formatCurrency(account.StandaloneLimit)}</p>}
                    </Link>
                ))}
            </div>
        )}
      </div>
    </main>
  );
};

export default AccountsPage;

