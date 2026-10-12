"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, Flame, RotateCcw, Sparkles, Map, BookMarked, Layers, PenTool, Settings, Shield } from "lucide-react";
import { useProgressStore } from "@/store/useProgressStore";
import { FastJlptLogo } from "@/components/FastJlptLogo";

export const CountdownHeader: React.FC = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const resetAllProgress = useProgressStore((state) => state.resetAllProgress);
  const setAiModalOpen = useProgressStore((state) => state.setAiModalOpen);

  // Ngày thi chính thức: 06/12/2026 lúc 09:00:00 (Chủ Nhật)
  const targetExamDate = new Date("2026-12-06T09:00:00+07:00").getTime();

  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    setMounted(true);

    const calculateDays = () => {
      const now = Date.now();
      const difference = targetExamDate - now;
      if (difference > 0) {
        setDaysLeft(Math.floor(difference / (1000 * 60 * 60 * 24)));
      } else {
        setDaysLeft(0);
      }
    };

    calculateDays();
    const interval = setInterval(calculateDays, 60000);
    return () => clearInterval(interval);
  }, [targetExamDate]);

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học tập và ôn tập không?")) {
      resetAllProgress();
    }
  };

  const scrollToSection = (id: string) => {
    if (pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-gray-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link href="/" className="focus:outline-hidden">
            <FastJlptLogo size="md" subtitle="Ôn thi cấp tốc • Spaced Repetition" />
          </Link>
        </div>

        {/* Quick Section Nav Links */}
        <nav className="hidden lg:flex items-center space-x-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => scrollToSection("roadmap")}
            className="px-3 py-1.5 rounded-xl hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center space-x-1.5"
          >
            <Map className="w-3.5 h-3.5 text-slate-400" />
            <span>Lộ trình Milestone</span>
          </button>

          <button
            onClick={() => scrollToSection("curriculum")}
            className="px-3 py-1.5 rounded-xl hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center space-x-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>4 Giáo trình</span>
          </button>

          <button
            onClick={() => scrollToSection("notebook")}
            className="px-3 py-1.5 rounded-xl hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center space-x-1.5"
          >
            <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sổ tay & Dịch</span>
          </button>

          <Link
            href="/practice"
            className="px-3 py-1.5 rounded-xl hover:text-emerald-700 hover:bg-emerald-50 text-emerald-800 transition-all flex items-center space-x-1.5 border border-emerald-200/60"
          >
            <PenTool className="w-3.5 h-3.5 text-emerald-600" />
            <span>Luyện dịch AI</span>
          </Link>

          <Link
            href="/games/grammar-sort"
            className="px-3 py-1.5 rounded-xl hover:text-purple-700 hover:bg-purple-50 text-purple-800 transition-all flex items-center space-x-1.5 border border-purple-200/60 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Xếp hình ngữ pháp ★</span>
          </Link>

          <Link
            href="/games/kanji-defense"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-700 hover:bg-indigo-50 text-indigo-800 transition-all flex items-center space-x-1.5 border border-indigo-200/60 font-bold"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Kanji Defense ⚔️</span>
          </Link>
        </nav>

        {/* Right Actions: Days Left Badge + AI Config + Reset */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Days Left Pill */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {mounted ? (
                <>Còn <strong className="font-mono text-sm">{daysLeft}</strong> ngày thi</>
              ) : (
                "Đang tính..."
              )}
            </span>
          </div>

          {/* AI Settings Button */}
          <button
            onClick={() => setAiModalOpen(true)}
            title="Cài đặt AI chấm dịch"
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            title="Đặt lại toàn bộ tiến độ"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-gray-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
