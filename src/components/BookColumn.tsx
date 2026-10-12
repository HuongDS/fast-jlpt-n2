"use client";

import React from "react";
import Link from "next/link";
import { Book, Section } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  ChevronRight, 
  Languages, 
  BookOpenCheck, 
  GraduationCap,
  BookMarked,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface BookColumnProps {
  book: Book;
  onSelectSection: (section: Section) => void;
}

export const BookColumn: React.FC<BookColumnProps> = ({ book, onSelectSection }) => {
  const completedSections = useProgressStore((state) => state.completedSections);
  const toggleSection = useProgressStore((state) => state.toggleSection);

  const getBookTheme = (bookId: string) => {
    switch (bookId) {
      case "kanji-soumatome":
        return {
          icon: <Languages className="w-5 h-5 text-emerald-600" />,
          progressColor: "bg-emerald-500",
          headerBg: "from-emerald-500/5 to-transparent",
          activeBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
          badgeBorder: "border-emerald-200 bg-emerald-50 text-emerald-800",
          kanji: "漢"
        };
      case "grammar-soumatome":
        return {
          icon: <BookOpenCheck className="w-5 h-5 text-blue-600" />,
          progressColor: "bg-blue-500",
          headerBg: "from-blue-500/5 to-transparent",
          activeBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200",
          badgeBorder: "border-blue-200 bg-blue-50 text-blue-800",
          kanji: "文"
        };
      case "grammar-shinkanzen":
        return {
          icon: <GraduationCap className="w-5 h-5 text-purple-600" />,
          progressColor: "bg-purple-500",
          headerBg: "from-purple-500/5 to-transparent",
          activeBtn: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200",
          badgeBorder: "border-purple-200 bg-purple-50 text-purple-800",
          kanji: "典"
        };
      case "word-shinkanzen":
      default:
        return {
          icon: <BookMarked className="w-5 h-5 text-amber-600" />,
          progressColor: "bg-amber-500",
          headerBg: "from-amber-500/5 to-transparent",
          activeBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
          badgeBorder: "border-amber-200 bg-amber-50 text-amber-800",
          kanji: "語"
        };
    }
  };

  const theme = getBookTheme(book.id);
  const completedCount = book.sections.filter((s) => completedSections.includes(s.id)).length;
  const progressPercent = Math.round((completedCount / book.sections.length) * 100);

  return (
    <div className="flex flex-col h-full rounded-3xl bg-white/90 backdrop-blur-md border border-gray-200/90 shadow-xs p-5 transition-all hover:shadow-md">
      {/* Header */}
      <div className={`relative rounded-2xl p-4 mb-4 border border-gray-100 bg-gradient-to-b ${theme.headerBg} overflow-hidden`}>
        {/* Chữ Hán mờ trang trí */}
        <span className="absolute -bottom-3 -right-2 text-6xl font-black font-japanese text-slate-900/4 pointer-events-none select-none">
          {theme.kanji}
        </span>

        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBorder}`}>
            {book.badge}
          </span>
          <span className="text-xs font-bold text-slate-700">
            {completedCount}/{book.sections.length} bài
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
            {theme.icon}
          </div>
          <div>
            <Link
              href={`/book/${book.id}`}
              className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight leading-snug hover:text-purple-700 transition-colors inline-flex items-center gap-1 group"
            >
              <span>{book.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-[11px] text-slate-400 line-clamp-1">{book.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
          <div
            className={`${theme.progressColor} h-1.5 rounded-full transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 max-h-[560px] scrollbar-thin">
        {book.sections.map((section) => {
          const isDone = completedSections.includes(section.id);

          return (
            <div
              key={section.id}
              onClick={() => onSelectSection(section)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                isDone
                  ? "bg-emerald-50/50 border-emerald-200/80 text-slate-700 hover:bg-emerald-50/80"
                  : "bg-white border-gray-200/80 hover:border-purple-300 hover:shadow-xs hover:-translate-y-0.2"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                      isDone ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {section.title}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-900 transition-colors line-clamp-1 mt-1">
                    {section.subtitle}
                  </h5>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-gray-100 whitespace-nowrap">
                  {section.flashcards.length} mục
                </span>
              </div>

              {/* Preview keywords */}
              {section.previewItems && section.previewItems.length > 0 && (
                <div className="flex items-center space-x-1 my-1.5 overflow-hidden">
                  {section.previewItems.slice(0, 3).map((item, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[10px] font-bold font-japanese px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-gray-100 group-hover:bg-purple-50 group-hover:text-purple-800 whitespace-nowrap"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-100/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(section.id);
                  }}
                  className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors py-0.5 px-1 -ml-1 rounded-md hover:bg-slate-100"
                  title={isDone ? "Đánh dấu chưa học" : "Đánh dấu đã học"}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                      <span className="font-bold text-emerald-700">Đã học</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                      <span>Chưa học</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shadow-2xs ${
                      isDone
                        ? "text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50"
                        : `${theme.activeBtn} active:scale-95`
                    }`}
                  >
                    <span>{isDone ? "Ôn lại" : "Học ngay"}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
