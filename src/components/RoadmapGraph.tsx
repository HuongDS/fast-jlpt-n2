"use client";

import React, { useEffect, useState } from "react";
import { BOOKS_DATA, Section } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { 
  CheckCircle2, 
  Flag, 
  TrendingUp, 
  Check, 
  Calendar,
  Sparkles
} from "lucide-react";

interface RoadmapGraphProps {
  onSelectSection: (section: Section) => void;
}

export const RoadmapGraph: React.FC<RoadmapGraphProps> = ({ onSelectSection }) => {
  const [mounted, setMounted] = useState(false);
  const completedSections = useProgressStore((state) => state.completedSections);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Collect all sections sequentially
  const allSections: { section: Section; bookTitle: string; bookBadge: string; bookId: string }[] = [];
  BOOKS_DATA.forEach((book) => {
    book.sections.forEach((sec) => {
      allSections.push({
        section: sec,
        bookTitle: book.title,
        bookBadge: book.badge,
        bookId: book.id,
      });
    });
  });

  const totalSteps = allSections.length;
  const completedCount = mounted
    ? allSections.filter((item) => completedSections.includes(item.section.id)).length
    : 0;
  const overallPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Find index of first uncompleted step (current step)
  const currentStepIndex = allSections.findIndex(
    (item) => !completedSections.includes(item.section.id)
  );

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Timeline Chinh Phục JLPT N2</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Lộ trình Chuỗi Milestone (Roadmap)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đường nối liền liên tục các mốc bài học từ đầu đến ngày thi chính thức <strong>06/12/2026</strong>.
          </p>
        </div>

        {/* Overall % Progress Badge */}
        <div className="flex items-center space-x-3.5 bg-slate-50/90 px-4 py-2.5 rounded-2xl border border-gray-200 self-start sm:self-auto shadow-2xs">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng tiến độ
            </div>
            <div className="text-xs font-bold text-slate-700">
              {completedCount}/{totalSteps} bài hoàn thành
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
            {overallPercentage}%
          </div>
        </div>
      </div>

      {/* Horizontal Connected Timeline */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 text-xs font-bold text-slate-500">
          <span className="uppercase tracking-wider">Chuỗi Node Milestone liên tục</span>
          <span className="text-purple-700 font-semibold hidden sm:inline">
            Bấm vào bất kỳ Node nào để mở bài học
          </span>
        </div>

        {/* Scrollable Track */}
        <div className="relative overflow-x-auto pb-6 pt-8 -mx-2 px-2 scrollbar-thin snap-x">
          <div className="flex items-start min-w-max relative px-2">
            {/* Background connecting line (Đi xuyên tâm tất cả các hình tròn top-6 = 24px) */}
            <div 
              className="absolute top-6 h-[3px] bg-slate-200 -z-0 rounded-full" 
              style={{ left: "80px", right: "80px" }}
            />
            
            {/* Active filled connecting line */}
            <div 
              className="absolute top-6 h-[3px] bg-purple-600 -z-0 rounded-full transition-all duration-500"
              style={{
                left: "80px",
                width: `${completedCount > 0 ? Math.min(completedCount, totalSteps) * 160 : 0}px`,
              }}
            />

            {/* Nodes */}
            {allSections.map((item, index) => {
              const isCompleted = mounted && completedSections.includes(item.section.id);
              const isCurrent = mounted && index === currentStepIndex;

              return (
                <div
                  key={item.section.id}
                  onClick={() => onSelectSection(item.section)}
                  className="w-40 min-w-[160px] shrink-0 snap-center relative z-10 flex flex-col items-center group cursor-pointer"
                >
                  {/* TIẾP THEO Floating Tag */}
                  {isCurrent && (
                    <span className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-purple-700 text-white text-[9px] font-black shadow-md uppercase tracking-wider animate-bounce">
                      TIẾP THEO
                    </span>
                  )}

                  {/* Node Circle */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-200 transform group-hover:scale-110 shadow-sm relative z-10 ${
                      isCompleted
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-emerald-200"
                        : isCurrent
                        ? "bg-purple-700 text-white ring-4 ring-purple-200 shadow-lg shadow-purple-300 font-extrabold scale-110"
                        : "bg-white text-slate-500 border-2 border-gray-200 group-hover:border-purple-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Title & Subtitle Below (Rộng 100%, căn giữa, không đè chữ) */}
                  <div className="mt-3.5 text-center px-2 w-full">
                    <span
                      className={`block text-xs font-bold truncate transition-colors ${
                        isCompleted
                          ? "text-emerald-700"
                          : isCurrent
                          ? "text-purple-800 font-black"
                          : "text-slate-700 group-hover:text-slate-900"
                      }`}
                      title={item.section.title}
                    >
                      {item.section.title}
                    </span>
                    <span 
                      className="block text-[11px] text-slate-400 truncate mt-0.5"
                      title={item.section.subtitle}
                    >
                      {item.section.subtitle}
                    </span>
                    <span className="inline-block text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md mt-1">
                      {item.bookBadge}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Final Target Destination: 06/12/2026 */}
            <div className="w-40 min-w-[160px] shrink-0 snap-center relative z-10 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-md relative z-10 ${
                  overallPercentage === 100
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-100"
                    : "bg-rose-50 text-rose-600 border-2 border-rose-300 ring-4 ring-rose-50"
                }`}
                title="Ngày thi chính thức: 06/12/2026 (Chủ Nhật)"
              >
                <Flag className="w-6 h-6 text-rose-600 fill-rose-500/20" />
              </div>
              <div className="mt-3.5 text-center px-2 w-full">
                <span className="block text-xs font-black text-rose-600">06/12/2026</span>
                <span className="block text-[11px] font-bold text-slate-600 mt-0.5">Ngày thi N2</span>
                <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md mt-1">
                  Đích đến
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Book-by-Book Progress Mini Breakdown */}
      <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {BOOKS_DATA.map((book) => {
          const bookCompleted = mounted
            ? book.sections.filter((s) => completedSections.includes(s.id)).length
            : 0;
          const bookPct = Math.round((bookCompleted / book.sections.length) * 100);

          return (
            <div
              key={book.id}
              className="p-3.5 rounded-2xl bg-slate-50/80 border border-gray-100 space-y-2 hover:bg-slate-100/60 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 truncate pr-2">{book.title}</span>
                <span className="font-mono font-bold text-slate-700 text-xs">{bookPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-700 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${bookPct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>{bookCompleted}/{book.sections.length} bài hoàn thành</span>
                <a href={`/book/${book.id}`} className="text-purple-600 font-semibold hover:underline">
                  Chi tiết →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
