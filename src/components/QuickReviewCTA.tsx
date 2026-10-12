"use client";

import React, { useEffect, useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { Zap, Clock, Sparkles } from "lucide-react";

interface QuickReviewCTAProps {
  onStartReview: () => void;
}

export const QuickReviewCTA: React.FC<QuickReviewCTAProps> = ({ onStartReview }) => {
  const [mounted, setMounted] = useState(false);
  const srsData = useProgressStore((state) => state.srsData);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = Date.now();
  const dueItems = Object.values(srsData).filter((item) => item.nextReviewDate <= now);
  const dueCount = dueItems.length;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4">
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-gray-200/90 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:shadow-md hover:border-gray-300">
        {/* Left Info */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Spaced Repetition</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Ôn tập kiến thức đến hạn
          </h2>
          <p className="text-sm text-slate-500 max-w-md">
            Lặp lại ngắt quãng để ghi nhớ vĩnh viễn ngữ pháp và chữ Hán N2 mà không bị quá tải.
          </p>
        </div>

        {/* Right CTA Button */}
        <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
          <button
            onClick={onStartReview}
            className="group relative inline-flex items-center justify-center space-x-3 w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl shadow-sm transition-all duration-200"
          >
            <Zap className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Ôn tập nhanh</span>
            {mounted && dueCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-full">
                {dueCount}
              </span>
            )}
          </button>
          
          <div className="mt-2 text-xs text-slate-400 font-medium">
            {mounted ? (
              dueCount > 0 ? (
                <span className="text-amber-600 font-medium">
                  • Có {dueCount} câu hỏi đến hạn ôn tập hôm nay
                </span>
              ) : (
                <span>• Đã hoàn thành mọi thẻ đến hạn (Bấm để ôn tự do)</span>
              )
            ) : (
              <span>• Đang tải dữ liệu ôn tập...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
