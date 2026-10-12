"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProgressStore } from "@/store/useProgressStore";
import { BOOKS_DATA, getAllFlashcards } from "@/data/books";
import {
  Zap,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Award,
  ShieldCheck,
  Languages,
  PenTool,
  RotateCcw
} from "lucide-react";
import { FastJlptLogoMark } from "@/components/FastJlptLogo";

interface DashboardHeroProps {
  onStartReview: () => void;
  onExploreCurriculum: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  onStartReview,
  onExploreCurriculum,
}) => {
  const [mounted, setMounted] = useState(false);
  const srsData = useProgressStore((state) => state.srsData);
  const completedSections = useProgressStore((state) => state.completedSections);

  // Ngày thi chính thức: 06/12/2026 lúc 09:00:00 (Chủ Nhật)
  const targetExamDate = new Date("2026-12-06T09:00:00+07:00").getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);

    const calculateTime = () => {
      const now = Date.now();
      const difference = targetExamDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetExamDate]);

  // Thống kê SRS
  const now = Date.now();
  const dueItems = Object.values(srsData).filter((item) => item.nextReviewDate <= now);
  const dueCount = dueItems.length;

  // Thống kê tổng quan giáo trình
  const totalSectionsCount = BOOKS_DATA.reduce((acc, b) => acc + b.sections.length, 0);
  const completedCount = completedSections.length;
  const masteryPercentage = totalSectionsCount > 0 ? Math.round((completedCount / totalSectionsCount) * 100) : 0;
  const totalCardsCount = getAllFlashcards().length;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-purple-50/40 to-indigo-50/50 text-slate-800 shadow-sm border border-purple-100/80 p-6 sm:p-8 lg:p-10 transition-all">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-60 h-60 rounded-full bg-emerald-200/20 blur-2xl pointer-events-none" />

      {/* Chữ Hán chìm mờ nghệ thuật phong cách Nhật Bản */}
      <div className="absolute top-4 right-1/4 text-8xl sm:text-9xl font-japanese font-black text-purple-950/[0.03] select-none pointer-events-none">
        合格
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* ================= CỘT TRÁI: VALUE PROPOSITION & CTA ================= */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Target Exam Badge */}
          <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/80 text-purple-800 text-xs font-semibold backdrop-blur-md shadow-2xs">
            <FastJlptLogoMark size="xs" className="w-5 h-5 shadow-xs" />
            <span>Mục tiêu N2 • Thi chính thức 06/12/2026</span>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-black tracking-tight leading-tight sm:leading-tight text-slate-900">
              Hệ Thống Luyện Thi{" "}
              <span className="bg-gradient-to-r from-purple-700 via-indigo-700 to-emerald-600 bg-clip-text text-transparent">
                JLPT N2 Siêu Tốc
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Phương pháp <strong className="text-slate-800 font-semibold">Spaced Repetition (SRS)</strong> kết hợp trọn bộ 4 giáo trình{" "}
              <em className="text-slate-700 font-medium">Soumatome & Shinkanzen Master</em>. Ghi nhớ sâu, phản xạ nhanh và không lo học trước quên sau.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            {/* Primary SRS Review Button */}
            <button
              onClick={onStartReview}
              className="group relative inline-flex items-center space-x-2.5 px-6 sm:px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-purple-500/25 hover:shadow-purple-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300 group-hover:scale-110 transition-transform" />
              <span>Ôn tập ngắt quãng (SRS)</span>
              {mounted && (
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                  dueCount > 0 
                    ? "bg-amber-400 text-slate-950 animate-pulse" 
                    : "bg-white/25 text-white"
                }`}>
                  {dueCount > 0 ? `${dueCount} thẻ đến hạn` : "Sẵn sàng"}
                </span>
              )}
            </button>

            {/* Explore Curriculum Button */}
            <button
              onClick={onExploreCurriculum}
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-sm border border-gray-200/90 hover:border-gray-300 shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Vào giáo trình bài học</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* AI Practice Link */}
            <Link
              href="/practice"
              className="inline-flex items-center space-x-2 px-4 py-3.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 text-purple-700 hover:text-purple-900 font-semibold text-xs border border-purple-200/70 transition-all"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-600" />
              <span>Luyện dịch AI</span>
            </Link>

            {/* Grammar Sort Game Link */}
            <Link
              href="/games/grammar-sort"
              className="inline-flex items-center space-x-2 px-4 py-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 hover:text-amber-950 font-bold text-xs border border-amber-200/80 transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Xếp hình Ngữ pháp ★</span>
            </Link>

            {/* Kanji Typing Defense Game Link */}
            <Link
              href="/games/kanji-defense"
              className="inline-flex items-center space-x-2 px-4 py-3.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-900 hover:text-indigo-950 font-bold text-xs border border-indigo-200/80 transition-all shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kanji Defense ⚔️</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-4 border-t border-purple-100/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kho kiến thức</span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">5.400+</span>
              <span className="text-[10px] text-slate-500 block">Thẻ Hán tự, ngữ pháp</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bài học chuẩn</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">165</span>
              <span className="text-[10px] text-slate-500 block">Bài học 4 giáo trình</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lộ trình học</span>
              <span className="text-base sm:text-lg font-black text-purple-700 font-mono">8 Tuần</span>
              <span className="text-[10px] text-slate-500 block">Bám sát đề thi JLPT</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bảo mật</span>
              <span className="text-base sm:text-lg font-black text-indigo-700 font-mono">100%</span>
              <span className="text-[10px] text-slate-500 block">Lưu offline trên máy</span>
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI: DIGITAL EXAM COUNTDOWN CARD ================= */}
        <div className="lg:col-span-5 w-full">
          <div className="rounded-3xl bg-white/95 backdrop-blur-xl border border-purple-100/90 p-5 sm:p-6 shadow-md shadow-purple-900/5 space-y-5">
            {/* Header Box */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Đếm ngược kỳ thi JLPT N2
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    06/12/2026 (Chủ Nhật)
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Chính thức
              </span>
            </div>

            {/* Digital Clock Grid (4 Khối số lớn sắc nét) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
              {/* Ngày */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 border border-gray-200/80 shadow-2xs flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                  {mounted ? timeLeft.days : "--"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Ngày
                </span>
              </div>

              {/* Giờ */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 border border-gray-200/80 shadow-2xs flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono text-purple-700 tracking-tight">
                  {mounted ? String(timeLeft.hours).padStart(2, "0") : "--"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Giờ
                </span>
              </div>

              {/* Phút */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 border border-gray-200/80 shadow-2xs flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700 tracking-tight">
                  {mounted ? String(timeLeft.minutes).padStart(2, "0") : "--"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Phút
                </span>
              </div>

              {/* Giây */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 border border-gray-200/80 shadow-2xs flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 tracking-tight">
                  {mounted ? String(timeLeft.seconds).padStart(2, "0") : "--"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Giây
                </span>
              </div>
            </div>

            {/* Learner Progress Mini Dashboard */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-gray-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tiến độ hoàn thành giáo trình</span>
                </span>
                <span className="text-emerald-700 font-bold font-mono">
                  {masteryPercentage}% ({completedCount}/{totalSectionsCount} bài)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-2 rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Trạng thái SRS hôm nay:</span>
                <span className={dueCount > 0 ? "text-amber-700 font-bold" : "text-emerald-700 font-semibold"}>
                  {dueCount > 0 ? `${dueCount} thẻ cần ôn lại` : "Đã hoàn thành mọi thẻ đến hạn ✓"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
