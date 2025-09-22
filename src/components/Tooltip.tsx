"use client";
import React from 'react';

// FIX: Added 'export' to make the component available for other files to import.
export const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
    return (
        <div className="relative flex items-center group">
            {children}
            <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                {text}
            </div>
        </div>
    );
};