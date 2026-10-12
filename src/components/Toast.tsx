"use client";

import React, { useEffect } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";

export const Toast: React.FC = () => {
  const toastMessage = useProgressStore((state) => state.toastMessage);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  if (!toastMessage) return null;

  const isDuplicate = toastMessage.includes("đã có trong sổ tay");

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
        isDuplicate
          ? "bg-amber-900/90 text-amber-100 border-amber-700/60 ring-1 ring-amber-500/20"
          : "bg-slate-900/90 text-white border-slate-700/60 ring-1 ring-white/10"
      }`}>
        {isDuplicate ? (
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
