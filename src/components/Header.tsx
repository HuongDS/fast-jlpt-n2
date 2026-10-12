"use client";

import React, { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { BOOKS_DATA, getAllFlashcards } from "@/data/books";
import { Sparkles, CheckCircle2, RotateCcw, Flame } from "lucide-react";
import { FastJlptLogo } from "@/components/FastJlptLogo";

export const Header: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const completedSections = useProgressStore((state) => state.completedSections);
  const srsData = useProgressStore((state) => state.srsData);
  const resetAllProgress = useProgressStore((state) => state.resetAllProgress);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur-md border-b border-gray-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <FastJlptLogo size="sm" subtitle={null} />
        </div>
      </header>
    );
  }

  const totalSections = BOOKS_DATA.reduce((acc, b) => acc + b.sections.length, 0);
  const totalCards = getAllFlashcards().length;

  const now = Date.now();
  const dueCount = Object.values(srsData).filter((item) => item.nextReviewDate <= now).length;
  const learnedCardsCount = Object.keys(srsData).length;

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học và ôn tập không?")) {
      resetAllProgress();
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur-md border-b border-gray-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <FastJlptLogo size="md" subtitle="Ôn thi cấp tốc • Spaced Repetition" />

        {/* Stats & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          {/* Progress Counters */}
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-600">
            <div className="flex items-center space-x-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm" title="Số bài học đã check-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Bài đã học: <strong className="text-slate-900">{completedSections.length}</strong>/{totalSections}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm" title="Thẻ đã đưa vào chu kỳ Spaced Repetition">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Thẻ nhớ: </span>
              <span>
                <strong className="text-slate-900">{learnedCardsCount}</strong>/{totalCards}
              </span>
            </div>
          </div>

          {/* Reset progress */}
          <button
            onClick={handleReset}
            title="Đặt lại dữ liệu tiến độ"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
