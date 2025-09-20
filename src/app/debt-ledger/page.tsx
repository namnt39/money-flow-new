"use client";

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';

// Định nghĩa "hình dạng" của một dòng trong Sổ Nợ
interface DebtLedgerEntry {
  id: string;
  PersonID: string;
  PersonName?: string; // Sẽ được join vào
  PeriodTag: string;
  SumDebt: number;
  SumRepaid: number;
  RemainingDebt: number;
  Status: string;
}

const DebtLedgerPage = () => {
  const [ledgerEntries, setLedgerEntries] = useState<DebtLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Lấy dữ liệu People để tạo map tra cứu tên
        const peopleSnapshot = await getDocs(collection(firestore, 'people'));
        const peopleMap = new Map(peopleSnapshot.docs.map(doc => [doc.id, doc.data().PersonName]));

        // 2. Lấy dữ liệu Sổ Nợ, sắp xếp theo kỳ và tên người
        const ledgerCollectionRef = collection(firestore, 'debtledger');
        const q = query(ledgerCollectionRef, orderBy('PeriodTag', 'desc'), orderBy('PersonID'));
        const ledgerSnapshot = await getDocs(q);
        
        // 3. Join dữ liệu
        const ledgerData = ledgerSnapshot.docs.map(doc => {
          const entry = { id: doc.id, ...doc.data() } as DebtLedgerEntry;
          entry.PersonName = peopleMap.get(entry.PersonID) || entry.PersonID; // Hiển thị ID nếu không tìm thấy tên
          return entry;
        });
        
        setLedgerEntries(ledgerData);
      } catch (err: any) {
        console.error("Lỗi khi lấy dữ liệu Sổ Nợ: ", err);
        setError("Không thể tải dữ liệu Sổ Nợ. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  const getStatusChip = (status: string) => {
    if (status.includes('Fully Repaid')) {
        return 'bg-green-500/20 text-green-400';
    }
    if (status === 'Open') {
        return 'bg-yellow-500/20 text-yellow-400';
    }
    return 'bg-slate-600/50 text-slate-300';
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">Sổ Nợ Tổng Hợp</h1>
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
                    <th className="p-4">Kỳ Nợ</th>
                    <th className="p-4">Đối Tượng</th>
                    <th className="p-4 text-right">Tổng Nợ</th>
                    <th className="p-4 text-right">Đã Trả</th>
                    <th className="p-4 text-right">Còn Lại</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-4 font-semibold">{entry.PeriodTag}</td>
                      <td className="p-4">{entry.PersonName}</td>
                      <td className="p-4 text-right font-mono text-red-400">{formatCurrency(entry.SumDebt)}</td>
                      <td className="p-4 text-right font-mono text-green-400">{formatCurrency(entry.SumRepaid)}</td>
                      <td className="p-4 text-right font-mono font-bold text-yellow-400">{formatCurrency(entry.RemainingDebt)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusChip(entry.Status)}`}>
                          {entry.Status}
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

export default DebtLedgerPage;