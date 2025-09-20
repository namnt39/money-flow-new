// Updated: 21/09/2025 11:49 (GMT+7)
"use client";

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

interface Transaction {
  id: string; Date: any; Amount: number; FinalPrice: number; Notes: string;
  PersonID?: string; FromAccountID?: string; ToAccountID?: string; SubCategoryID?: string;
  PersonName?: string; FromAccountName?: string; ToAccountName?: string; SubCategoryName?: string;
  CategoryNature?: 'IN' | 'EX' | 'TF';
  PercentDiscount?: number; FixedDiscount?: number;
}

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); setError(null);
        
        const accountsMap = new Map((await getDocs(collection(firestore, 'accounts'))).docs.map(doc => [doc.id, doc.data().AccountName]));
        const peopleMap = new Map((await getDocs(collection(firestore, 'people'))).docs.map(doc => [doc.id, doc.data().PersonName]));
        
        const subCategoriesSnapshot = await getDocs(collection(firestore, 'subcategories'));
        const categoriesSnapshot = await getDocs(collection(firestore, 'categories'));
        const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.id, doc.data().TransactionNature]));
        const subCategoriesMap = new Map(subCategoriesSnapshot.docs.map(doc => {
            const data = doc.data();
            return [doc.id, { name: data.SubCategoryName, nature: categoriesMap.get(data.CategoryID) }];
        }));

        const q = query(collection(firestore, 'transactions'), orderBy('Timestamp', 'desc'), limit(100)); 
        const transactionsSnapshot = await getDocs(q);
        
        const transactionsData = transactionsSnapshot.docs.map(doc => {
          const trans = { id: doc.id, ...doc.data() } as Transaction;
          const subCategoryInfo = trans.SubCategoryID ? subCategoriesMap.get(trans.SubCategoryID) : undefined;
          
          trans.PersonName = trans.PersonID ? peopleMap.get(trans.PersonID) : '';
          trans.FromAccountName = trans.FromAccountID ? accountsMap.get(trans.FromAccountID) : '';
          trans.ToAccountName = trans.ToAccountID ? accountsMap.get(trans.ToAccountID) : '';
          trans.SubCategoryName = subCategoryInfo?.name || '';
          trans.CategoryNature = subCategoryInfo?.nature;
          
          return trans;
        });
        
        setTransactions(transactionsData);
      } catch (err: any) {
        setError("Không thể tải dữ liệu. Index của Firestore có thể đang được tạo, vui lòng chờ và thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  
  const formatDate = (dateInput: any) => {
    if (dateInput && typeof dateInput.toDate === 'function') return dateInput.toDate().toLocaleDateString('vi-VN');
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('-');
        if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateInput;
  }

  const getAmountColor = (nature: string | undefined) => {
      switch(nature) {
          case 'IN': return 'text-green-400';
          case 'EX': return 'text-red-400';
          case 'TF': return 'text-blue-400';
          default: return 'text-slate-400';
      }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-screen-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <h1 className="text-3xl font-bold text-emerald-400">Lịch sử Giao dịch</h1>
            <div className="flex items-center gap-4">
                <Link href="/" className="text-sky-400 hover:text-sky-300"> &larr; Về Trang chủ </Link>
                <Link href="/add-transaction" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg"><FaPlus /> Thêm Mới</Link>
            </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          {loading && <p className="text-center">Đang tải 100 giao dịch gần nhất...</p>}
          {error && <p className="text-center text-red-400">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="p-3">Ngày</th><th className="p-3">Mô tả</th><th className="p-3">Danh mục</th>
                    <th className="p-3">Đối tượng</th><th className="p-3">Tài khoản nguồn</th><th className="p-3">Tài khoản đích</th>
                    <th className="p-3 text-right">Giá gốc</th><th className="p-3 text-right">Giảm giá</th><th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trans) => (
                    <tr key={trans.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-3 whitespace-nowrap">{formatDate(trans.Date)}</td>
                      <td className="p-3 max-w-xs truncate" title={trans.Notes}>{trans.Notes}</td>
                      <td className="p-3">{trans.SubCategoryName}</td>
                      <td className="p-3">{trans.PersonName}</td>
                      <td className="p-3">{trans.FromAccountName}</td>
                      <td className="p-3">{trans.ToAccountName}</td>
                      <td className="p-3 text-right font-sans text-slate-400">{formatCurrency(trans.Amount)}</td>
                      <td className="p-3 text-right font-sans text-yellow-400">
                        {trans.PercentDiscount ? `${trans.PercentDiscount}%` : ''}
                        {trans.FixedDiscount ? ` ${formatCurrency(trans.FixedDiscount)}` : ''}
                      </td>
                      <td className={`p-3 text-right font-sans font-bold ${getAmountColor(trans.CategoryNature)}`}>
                        {formatCurrency(trans.FinalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
export default TransactionsPage;
