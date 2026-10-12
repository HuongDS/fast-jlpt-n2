"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Book, Section, BOOKS_DATA } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import {
  Languages,
  BookOpenCheck,
  GraduationCap,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  List,
  Columns4,
  ExternalLink,
  Flame,
  Award
} from "lucide-react";
import { BookColumn } from "@/components/BookColumn";

interface CurriculumHubProps {
  onSelectSection: (section: Section) => void;
}

export const CurriculumHub: React.FC<CurriculumHubProps> = ({ onSelectSection }) => {
  const completedSections = useProgressStore((state) => state.completedSections);
  const toggleSection = useProgressStore((state) => state.toggleSection);

  // Sách đang được chọn xem chi tiết (mặc định sách đầu tiên: Kanji Soumatome)
  const [activeBookId, setActiveBookId] = useState<string>(BOOKS_DATA[0]?.id || "kanji-soumatome");

  // Chế độ xem: "focus-grid" (Lưới chi tiết có tab tuần) | "focus-list" (Danh sách thu gọn) | "four-columns" (4 cột so sánh)
  const [viewMode, setViewMode] = useState<"focus-grid" | "focus-list" | "four-columns">("focus-grid");

  // Bộ lọc tuần / nhóm
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>("all");

  // Tìm kiếm bài học
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeBook = useMemo(() => {
    return BOOKS_DATA.find((b) => b.id === activeBookId) || BOOKS_DATA[0];
  }, [activeBookId]);

  // Lấy icon chuyên biệt theo book
  const getBookVisual = (bookId: string) => {
    switch (bookId) {
      case "kanji-soumatome":
        return {
          icon: <Languages className="w-6 h-6 text-emerald-600" />,
          kanjiChar: "漢",
          gradientBg: "from-emerald-500/10 via-teal-500/5 to-transparent",
          activeBorder: "border-emerald-500 ring-2 ring-emerald-200 shadow-emerald-100",
          accentColor: "emerald",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          cardHover: "hover:border-emerald-300 hover:shadow-emerald-50",
          btnGradient: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200",
          progressColor: "bg-emerald-500",
          pillBg: "bg-emerald-50 text-emerald-800 border-emerald-100",
        };
      case "grammar-soumatome":
        return {
          icon: <BookOpenCheck className="w-6 h-6 text-blue-600" />,
          kanjiChar: "文",
          gradientBg: "from-blue-500/10 via-indigo-500/5 to-transparent",
          activeBorder: "border-blue-500 ring-2 ring-blue-200 shadow-blue-100",
          accentColor: "blue",
          badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
          cardHover: "hover:border-blue-300 hover:shadow-blue-50",
          btnGradient: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200",
          progressColor: "bg-blue-500",
          pillBg: "bg-blue-50 text-blue-800 border-blue-100",
        };
      case "grammar-shinkanzen":
        return {
          icon: <GraduationCap className="w-6 h-6 text-purple-600" />,
          kanjiChar: "典",
          gradientBg: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
          activeBorder: "border-purple-500 ring-2 ring-purple-200 shadow-purple-100",
          accentColor: "purple",
          badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
          cardHover: "hover:border-purple-300 hover:shadow-purple-50",
          btnGradient: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200",
          progressColor: "bg-purple-500",
          pillBg: "bg-purple-50 text-purple-800 border-purple-100",
        };
      case "word-shinkanzen":
      default:
        return {
          icon: <BookMarked className="w-6 h-6 text-amber-600" />,
          kanjiChar: "語",
          gradientBg: "from-amber-500/10 via-orange-500/5 to-transparent",
          activeBorder: "border-amber-500 ring-2 ring-amber-200 shadow-amber-100",
          accentColor: "amber",
          badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
          cardHover: "hover:border-amber-300 hover:shadow-amber-50",
          btnGradient: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-200",
          progressColor: "bg-amber-500",
          pillBg: "bg-amber-50 text-amber-800 border-amber-100",
        };
    }
  };

  // Danh sách các Tuần/Nhóm duy nhất của sách đang chọn để làm bộ lọc
  const availableGroups = useMemo(() => {
    if (!activeBook) return [];
    const groups = new Set<string>();
    activeBook.sections.forEach((sec) => {
      if (sec.week) {
        groups.add(`Tuần ${sec.week}`);
      } else if (sec.groupTitle) {
        // Rút gọn groupTitle
        const simple = sec.groupTitle.split(":")[0];
        groups.add(simple);
      }
    });
    return Array.from(groups);
  }, [activeBook]);

  // Lọc bài học theo Tuần và Từ khóa tìm kiếm
  const filteredSections = useMemo(() => {
    if (!activeBook) return [];
    return activeBook.sections.filter((sec) => {
      // 1. Lọc theo tuần
      if (selectedWeekFilter !== "all") {
        const matchesWeek = sec.week ? `Tuần ${sec.week}` === selectedWeekFilter : false;
        const matchesGroup = sec.groupTitle ? sec.groupTitle.includes(selectedWeekFilter) : false;
        if (!matchesWeek && !matchesGroup) return false;
      }
      // 2. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = sec.title.toLowerCase().includes(q);
        const inSubtitle = sec.subtitle.toLowerCase().includes(q);
        const inPreviews = sec.previewItems?.some((p) => p.toLowerCase().includes(q));
        if (!inTitle && !inSubtitle && !inPreviews) return false;
      }
      return true;
    });
  }, [activeBook, selectedWeekFilter, searchQuery]);

  const activeVisual = getBookVisual(activeBook.id);

  // Thống kê tiến độ sách đang chọn
  const activeCompletedCount = activeBook.sections.filter((s) => completedSections.includes(s.id)).length;
  const activeTotalCount = activeBook.sections.length;
  const activePercent = activeTotalCount > 0 ? Math.round((activeCompletedCount / activeTotalCount) * 100) : 0;

  return (
    <section className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-100/70 text-purple-700">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kho Giáo Trình & Lộ Trình Bài Học
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            4 cuốn giáo trình JLPT N2 then chốt • 165 bài học toàn diện • 5.400+ từ vựng & mẫu câu
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-2xl border border-gray-200 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode("focus-grid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === "focus-grid"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Xem theo Lưới thẻ chi tiết"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Lưới thẻ bài học</span>
          </button>

          <button
            onClick={() => setViewMode("focus-list")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === "focus-list"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Xem theo Danh sách tinh gọn"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Danh sách thu gọn</span>
          </button>

          <button
            onClick={() => setViewMode("four-columns")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === "four-columns"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Xem song song 4 cột"
          >
            <Columns4 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">So sánh 4 cuốn</span>
          </button>
        </div>
      </div>

      {/* 2. Top Hero Book Selector (4 Thẻ giáo trình sang trọng) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BOOKS_DATA.map((book) => {
          const isSelected = book.id === activeBookId && viewMode !== "four-columns";
          const visual = getBookVisual(book.id);
          const completedCount = book.sections.filter((s) => completedSections.includes(s.id)).length;
          const totalSec = book.sections.length;
          const pct = totalSec > 0 ? Math.round((completedCount / totalSec) * 100) : 0;
          const totalCards = book.sections.reduce((acc, s) => acc + s.flashcards.length, 0);

          return (
            <div
              key={book.id}
              onClick={() => {
                setActiveBookId(book.id);
                setSelectedWeekFilter("all");
                if (viewMode === "four-columns") setViewMode("focus-grid");
              }}
              className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-300 overflow-hidden border ${
                isSelected
                  ? `bg-white ${visual.activeBorder} shadow-md scale-[1.02]`
                  : "bg-white/80 border-gray-200/90 hover:border-gray-300 hover:bg-white hover:shadow-xs hover:scale-[1.01]"
              }`}
            >
              {/* Nền gradient góc nhẹ */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${visual.gradientBg} pointer-events-none opacity-60`}
              />

              {/* Chữ Hán thư pháp nghệ thuật chìm mờ ở góc phải */}
              <div className="absolute -bottom-2 -right-1 text-7xl font-japanese font-black text-slate-900/4 select-none pointer-events-none">
                {visual.kanjiChar}
              </div>

              {/* Top Row: Badge + Icon */}
              <div className="relative z-10 flex items-center justify-between mb-3.5">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${visual.badgeBg}`}>
                  {book.badge}
                </span>

                <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center">
                  {visual.icon}
                </div>
              </div>

              {/* Title & Stats */}
              <div className="relative z-10 space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight leading-snug">
                  {book.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-1">
                  {totalSec} bài học • {totalCards} thẻ ôn luyện
                </p>
              </div>

              {/* Progress bar */}
              <div className="relative z-10 mt-4 pt-3 border-t border-gray-100/80">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                  <span>Tiến độ hoàn thành</span>
                  <span className="font-bold text-slate-800">
                    {completedCount}/{totalSec} bài ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${visual.progressColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Selection indicator pill */}
              {isSelected && (
                <div className="relative z-10 mt-3 pt-2 flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="inline-flex items-center space-x-1 text-slate-900">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Đang xem giáo trình này</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Main Curriculum Content Area */}
      {viewMode === "four-columns" ? (
        /* ================= CHẾ ĐỘ 1: XEM 4 CỘT SONG SONG ĐÃ LÀM ĐẸP ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {BOOKS_DATA.map((book) => (
            <div key={book.id} className="h-full">
              <BookColumn book={book} onSelectSection={onSelectSection} />
            </div>
          ))}
        </div>
      ) : (
        /* ================= CHẾ ĐỘ 2 & 3: KHÔNG GIAN HỌC TẬP TẬP TRUNG TỪNG SÁCH ================= */
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-200/90 p-5 sm:p-7 shadow-xs space-y-6">
          {/* Active Book Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-gray-100 shadow-2xs flex items-center justify-center shrink-0">
                {activeVisual.icon}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${activeVisual.badgeBg}`}>
                    {activeBook.badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {activeBook.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {activeBook.description}
                </p>
              </div>
            </div>

            {/* Link to Full Book Detail Screen */}
            <div className="flex items-center space-x-2">
              <Link
                href={`/book/${activeBook.id}`}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all shadow-2xs"
              >
                <span>Xem trang chuyên đề</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Search & Week Navigator Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học, chữ Hán, mẫu câu..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all"
                />
              </div>

              {/* Counter info */}
              <div className="text-xs text-slate-500 font-medium">
                Hiển thị <strong className="text-slate-800">{filteredSections.length}</strong> / {activeBook.sections.length} bài học
              </div>
            </div>

            {/* Week / Chapter Filter Pills */}
            {availableGroups.length > 0 && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                <button
                  onClick={() => setSelectedWeekFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedWeekFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({activeBook.sections.length})
                </button>

                {availableGroups.map((grp) => {
                  const isSelected = selectedWeekFilter === grp;
                  // Đếm số bài trong nhóm này
                  const groupSecs = activeBook.sections.filter((s) => {
                    if (s.week && `Tuần ${s.week}` === grp) return true;
                    if (s.groupTitle && s.groupTitle.includes(grp)) return true;
                    return false;
                  });
                  const groupDone = groupSecs.filter((s) => completedSections.includes(s.id)).length;
                  const isGroupAllDone = groupSecs.length > 0 && groupDone === groupSecs.length;

                  return (
                    <button
                      key={grp}
                      onClick={() => setSelectedWeekFilter(grp)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                        isSelected
                          ? `${activeVisual.btnGradient} shadow-xs`
                          : isGroupAllDone
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{grp}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-white/80 text-slate-500"
                      }`}>
                        {groupDone}/{groupSecs.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Lesson Cards Presentation */}
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/60 rounded-3xl border border-dashed border-gray-200 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Không tìm thấy bài học phù hợp với từ khóa "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedWeekFilter("all");
                }}
                className="text-xs text-purple-700 hover:underline font-bold"
              >
                Xóa bộ lọc & tìm lại
              </button>
            </div>
          ) : viewMode === "focus-grid" ? (
            /* ================= VIEW: FOCUS GRID (THẺ BÀI HỌC RỘNG RÃI & PREVIEW CHỮ HÁN) ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredSections.map((sec, idx) => {
                const isDone = completedSections.includes(sec.id);

                return (
                  <div
                    key={sec.id}
                    className={`group relative rounded-3xl border p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between ${
                      isDone
                        ? "bg-emerald-50/40 border-emerald-200/90 shadow-2xs hover:shadow-sm"
                        : "bg-white border-gray-200/90 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Top Row: Header Badge & Item Count */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl tracking-tight ${
                          isDone 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-slate-100 text-slate-800 group-hover:bg-purple-100 group-hover:text-purple-800"
                        }`}>
                          {sec.title}
                        </span>
                        {sec.estimatedMinutes && (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{sec.estimatedMinutes}p</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-gray-100">
                        {sec.flashcards.length} mục
                      </span>
                    </div>

                    {/* Middle: Title & Subtitle */}
                    <div className="space-y-1.5 mb-4">
                      <h4 className="text-base font-extrabold text-slate-900 group-hover:text-purple-900 transition-colors tracking-tight line-clamp-1">
                        {sec.subtitle}
                      </h4>
                      {sec.groupTitle && (
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {sec.groupTitle}
                        </p>
                      )}
                    </div>

                    {/* Preview Words / Keywords Pills */}
                    {sec.previewItems && sec.previewItems.length > 0 && (
                      <div className="mb-5">
                        <div className="flex flex-wrap gap-1.5">
                          {sec.previewItems.slice(0, 4).map((item, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-xs font-bold font-japanese px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-gray-100 group-hover:bg-purple-50 group-hover:border-purple-100 group-hover:text-purple-800 transition-colors"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="pt-3.5 border-t border-gray-100/90 flex items-center justify-between gap-3">
                      {/* Checkbox toggle status */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(sec.id);
                        }}
                        className="flex items-center space-x-1.5 text-xs transition-colors py-1 px-1.5 -ml-1.5 rounded-lg hover:bg-slate-100"
                        title={isDone ? "Đánh dấu chưa hoàn thành" : "Đánh dấu đã hoàn thành"}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            <span className="font-bold text-emerald-700">Đã xong</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            <span className="font-medium text-slate-500">Chưa học</span>
                          </>
                        )}
                      </button>

                      {/* Primary study button */}
                      <button
                        onClick={() => onSelectSection(sec)}
                        className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          isDone
                            ? "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : `${activeVisual.btnGradient} active:scale-95`
                        }`}
                      >
                        <span>{isDone ? "Ôn tập lại" : "Vào bài học"}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= VIEW: FOCUS LIST (DANH SÁCH THU GỌN) ================= */
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 overflow-hidden bg-white">
              {filteredSections.map((sec, idx) => {
                const isDone = completedSections.includes(sec.id);

                return (
                  <div
                    key={sec.id}
                    onClick={() => onSelectSection(sec)}
                    className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(sec.id);
                        }}
                        className="mt-0.5 sm:mt-0 p-1 -ml-1 text-slate-400 hover:text-slate-700"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-700">
                            {sec.title}
                          </span>
                          <span className="text-slate-300">•</span>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                            {sec.subtitle}
                          </h4>
                        </div>

                        {sec.previewItems && sec.previewItems.length > 0 && (
                          <div className="flex items-center space-x-1.5 mt-1">
                            {sec.previewItems.slice(0, 4).map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className="text-[11px] font-japanese font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-sm"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4 pl-8 sm:pl-0">
                      <span className="text-xs text-slate-400 font-medium">
                        {sec.flashcards.length} mục
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSection(sec);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all"
                      >
                        <span>{isDone ? "Ôn lại" : "Học ngay"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
