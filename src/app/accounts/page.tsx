"use client";

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';

// Định nghĩa "hình dạng" của Account và AccountType
interface Account {
  id: string;
  AccountName: string;
  AccountTypeID: string;
  AccountTypeName?: string; // Thêm trường này để chứa tên sau khi join
  CurrentBalance: number;
  CreditLimit?: number;
  IsActive: boolean;
}

interface AccountType {
  AccountTypeID: string;
  AccountTypeName: string;
}

const AccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // --- LOGIC NÂNG CẤP: Lấy dữ liệu từ cả 2 collection ---
        
        // 1. Lấy dữ liệu từ 'accounttypes'
        const accountTypesCollectionRef = collection(firestore, 'accounttypes');
        const accountTypesSnapshot = await getDocs(accountTypesCollectionRef);
        
        // Tạo một "map" để tra cứu nhanh: { "CRE-YNMAY19": "Credit", ... }
        const accountTypesMap = new Map<string, string>();
        accountTypesSnapshot.forEach(doc => {
          const data = doc.data() as AccountType;
          accountTypesMap.set(data.AccountTypeID, data.AccountTypeName);
        });

        // 2. Lấy dữ liệu từ 'accounts'
        const accountsCollectionRef = collection(firestore, 'accounts');
        const q = query(accountsCollectionRef, orderBy('AccountName'));
        const accountsSnapshot = await getDocs(q);
        
        // 3. Join dữ liệu
        const accountsData = accountsSnapshot.docs.map(doc => {
          const account = { id: doc.id, ...doc.data() } as Account;
          // Dùng map để tìm tên tương ứng và gán vào trường mới
          account.AccountTypeName = accountTypesMap.get(account.AccountTypeID) || 'N/A';
          return account;
        });
        
        setAccounts(accountsData);
      } catch (err: any) {
        console.error("Lỗi khi lấy dữ liệu: ", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">Quản lý Tài khoản</h1>
          <Link href="/" className="text-sky-400 hover:text-sky-300 transition-colors">&larr; Quay về Trang chủ</Link>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          {loading && <p className="text-center text-slate-400">Đang tải dữ liệu...</p>}
          {error && <p className="text-center text-red-400">{error}</p>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-600">
                  <tr>
                    <th className="p-4">Tên Tài khoản</th>
                    {/* --- THÊM CỘT MỚI --- */}
                    <th className="p-4">Loại Tài khoản</th>
                    <th className="p-4">Số dư Hiện tại</th>
                    <th className="p-4">Hạn mức Tín dụng</th>
                    <th className="p-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-4 font-medium">{account.AccountName}</td>
                      {/* --- HIỂN THỊ DỮ LIỆU ĐÃ JOIN --- */}
                      <td className="p-4 text-slate-400">{account.AccountTypeName}</td>
                      <td className="p-4 text-emerald-400 font-mono">{formatCurrency(account.CurrentBalance)}</td>
                      <td className="p-4 font-mono">{formatCurrency(account.CreditLimit)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${account.IsActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {account.IsActive ? 'Hoạt động' : 'Vô hiệu'}
                        </span>
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

export default AccountsPage;