"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { auth } from '@/lib/firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { Dashboard } from '@/components/Dashboard'; // <-- Import component mới

// Component UserProfile có thể giữ lại đây hoặc tách ra file riêng
const UserProfile = ({ user }: { user: User }) => (
    <div className="flex items-center space-x-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-8">
        <img src={user.photoURL || ''} alt={user.displayName || 'User Avatar'} className="w-16 h-16 rounded-full border-2 border-teal-400" />
        <div>
            <p className="font-bold text-lg text-white">{user.displayName}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
            <button onClick={() => signOut(auth)} className="mt-2 text-sm text-red-400 hover:text-red-300">Đăng xuất</button>
        </div>
    </div>
);

const HomePage: NextPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); // Dừng loading khi đã có thông tin user (kể cả là null)
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Lỗi đăng nhập Google: ", error);
    }
  };

  if (loading) {
    return (
        <main className="min-h-screen bg-slate-900 flex justify-center items-center">
            <p className="text-white text-xl">Đang tải...</p>
        </main>
    )
  }

  return (
    <>
      <Head>
        <title>Money Flow - Quản lý Tài chính Cá nhân</title>
      </Head>
      <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto">
          <header className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              Sep Money Flow 2.0
            </h1>
          </header>

          {user ? <UserProfile user={user} /> : (
            <div className="flex justify-center w-full">
                <button onClick={handleSignIn} className="mb-8 bg-blue-600 hover:bg-blue-500 font-bold py-3 px-6 rounded-lg">
                    🚀 Đăng nhập bằng Google
                </button>
            </div>
          )}
          
          {/* Gọi component Dashboard và truyền trạng thái đăng nhập vào */}
          <Dashboard isEnabled={!!user} />

        </div>
      </main>
    </>
  );
};

export default HomePage;