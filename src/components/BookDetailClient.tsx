"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, BookOpen, Languages, BookOpenCheck, GraduationCap, BookMarked } from "lucide-react";
import { Book, Section } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { StudyScreen } from "@/components/StudyScreen";
import { MaziiLookup } from "@/components/MaziiLookup";
import { Toast } from "@/components/Toast";
import { FastJlptLogoMark } from "@/components/FastJlptLogo";

interface BookDetailClientProps {
  book: Book;
}

export const BookDetailClient: React.FC<BookDetailClientProps> = ({ book }) => {
  const completedSections = useProgressStore((state) => state.completedSections);
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const completedCount = book.sections.filter((s) => completedSections.includes(s.id)).length;
  const progressPercent = Math.round((completedCount / book.sections.length) * 100);

  const getBookIcon = (iconName: string) => {
    switch (iconName) {
      case "Languages":
        return <Languages className="w-6 h-6 text-emerald-600" />;
      case "BookOpenCheck":
        return <BookOpenCheck className="w-6 h-6 text-blue-600" />;
      case "GraduationCap":
        return <GraduationCap className="w-6 h-6 text-purple-600" />;
      case "BookMarked":
        return <BookMarked className="w-6 h-6 text-amber-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-slate-600" />;
    }
  };

  // If studying a section, display StudyScreen full-screen
  if (activeSection) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <StudyScreen
          mode="section"
          section={activeSection}
          onBackToDashboard={() => setActiveSection(null)}
        />
        <MaziiLookup />
        <Toast />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <FastJlptLogoMark size="xs" />
            <span className="font-bold text-slate-800">Về Dashboard</span>
          </Link>

          <span className="text-xs font-bold text-slate-700">Chi tiết Giáo trình</span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Book Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-gray-200 shadow-2xs">
                {getBookIcon(book.iconName)}
              </div>
              <div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${book.badgeColor}`}>
                  {book.badge}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  {book.title}
                </h1>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tiến độ</span>
              <span className="text-2xl font-black text-purple-700 font-mono">
                {progressPercent}%
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            {book.description}
          </p>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Đã hoàn thành {completedCount} / {book.sections.length} bài</span>
              <span>{completedCount === book.sections.length ? "Hoàn thành 100%" : "Đang tiến hành"}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-700 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* List of Lessons (Sections) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Danh sách các bài học ({book.sections.length} bài)
            </h2>
            <span className="text-xs text-slate-400">
              Bắt buộc qua bước Pre-check Flashcard để mở khóa bài test
            </span>
          </div>

          <div className="space-y-3">
            {book.sections.map((sec, idx) => {
              const isCompleted = completedSections.includes(sec.id);

              return (
                <div
                  key={sec.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? "bg-white/90 border-emerald-200/90 shadow-2xs"
                      : "bg-white border-gray-200 hover:border-gray-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : idx + 1}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {sec.title}: {sec.subtitle}
                      </h3>
                      {sec.previewItems && sec.previewItems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {sec.previewItems.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-[11px] font-bold font-japanese px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-gray-200/60"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {sec.flashcards.length} flashcard kiến thức & câu hỏi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    {isCompleted && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Đã check-in
                      </span>
                    )}

                    <button
                      onClick={() => setActiveSection(sec)}
                      className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        isCompleted
                          ? "text-slate-700 bg-slate-100 hover:bg-slate-200"
                          : "text-white bg-purple-700 hover:bg-purple-800 shadow-sm"
                      }`}
                    >
                      <span>{isCompleted ? "Ôn lại bài" : "Bắt đầu học"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast />

      {/* Mazii Global Lookup */}
      <MaziiLookup />
    </main>
  );
};
