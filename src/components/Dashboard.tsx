// Updated: 20/09/2025 23:07
"use client";

import Link from 'next/link';
import { useState } from 'react';
import Papa from 'papaparse';
import { firestore } from '@/lib/firebaseConfig';
import { collection, doc, writeBatch } from "firebase/firestore";

const FeatureCard = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-teal-400 mb-2">{title}</h3>
        <p className="text-slate-400 mb-4">{description}</p>
        <div className="space-y-4">{children}</div>
    </div>
);

const cleanRow = (row: any): any => {
    const cleanedRow: { [key: string]: any } = {};
    for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            const value = row[key];
            if (value.toUpperCase() === 'TRUE') cleanedRow[key] = true;
            else if (value.toUpperCase() === 'FALSE') cleanedRow[key] = false;
            else if (!isNaN(parseFloat(value.replace(/,/g, ''))) && isFinite(Number(value.replace(/,/g, '')))) {
                if(value.trim() !== '') cleanedRow[key] = parseFloat(value.replace(/,/g, ''));
                else cleanedRow[key] = null;
            } else {
                cleanedRow[key] = value;
            }
        }
    }
    return cleanedRow;
};


export const Dashboard = ({ isEnabled }: { isEnabled: boolean }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setUploadMessage('Đang đọc và phân tích file...');
        const collectionNameMatch = file.name.match(/ - (.*?)\.csv/);
        const collectionName = collectionNameMatch ? collectionNameMatch[1].toLowerCase().replace(/\s+/g, '') : "imported_data";
        let primaryKey = '';
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                if (results.meta.fields && results.meta.fields.length > 0) primaryKey = results.meta.fields[0];
                if(!primaryKey) { setUploadMessage(`❌ Lỗi: Không thể xác định cột ID.`); setIsUploading(false); return; }
                setUploadMessage(`Đã phân tích ${results.data.length} dòng. Bắt đầu tải lên collection "${collectionName}"...`);
                try {
                    const batch = writeBatch(firestore);
                    results.data.forEach((row: any) => {
                        const processedRow = cleanRow(row);
                        const docId = processedRow[primaryKey];
                        if (docId) {
                            const docRef = doc(firestore, collectionName, docId);
                            batch.set(docRef, processedRow);
                        }
                    });
                    await batch.commit();
                    setUploadMessage(`✅ Tải lên ${results.data.length} bản ghi thành công!`);
                } catch (error: any) { setUploadMessage(`❌ Có lỗi xảy ra: ${error.message}`); } 
                finally { setIsUploading(false); event.target.value = ''; }
            },
            error: (error: any) => { setUploadMessage(`❌ Lỗi khi đọc file CSV: ${error.message}`); setIsUploading(false); }
        });
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!isEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
            {/* Cột bên trái */}
            <div className="space-y-8">
                <FeatureCard title="1. AI Data Import" description="Tải lên bất kỳ file CSV nào để tự động import.">
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/60'}`}>
                            {isUploading ? <p>Đang xử lý...</p> : <span>Nhấn để tải lên file CSV</span>}
                            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileUpload} accept=".csv" disabled={isUploading}/>
                        </label>
                    </div>
                    {uploadMessage && <p className="text-center text-sm text-slate-300 mt-2">{uploadMessage}</p>}
                </FeatureCard>
                <FeatureCard title="2. AI Smart Input" description="Nhập giao dịch bằng ngôn ngữ tự nhiên.">
                    <p className="text-center text-slate-500">(Tính năng sẽ được xây dựng)</p>
                </FeatureCard>
            </div>
            {/* Cột bên phải */}
            <div className="space-y-8">
                <FeatureCard title="Chức năng chính" description="Truy cập các bảng dữ liệu và thực hiện thao tác.">
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/transactions" className="aspect-square flex justify-center items-center p-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">Giao dịch</Link>
                        <Link href="/accounts" className="aspect-square flex justify-center items-center p-3 rounded-lg bg-green-600 hover:bg-green-500 transition-colors">Tài khoản</Link>
                        <Link href="/debt-ledger" className="aspect-square flex justify-center items-center p-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 transition-colors">Sổ nợ</Link>
                        <button disabled className="aspect-square flex justify-center items-center p-3 rounded-lg bg-sky-600/50 text-slate-400 cursor-not-allowed">Đối tác</button>
                    </div>
                </FeatureCard>
            </div>
        </div>
    );
};
