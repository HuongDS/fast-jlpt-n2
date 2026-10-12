"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useProgressStore, getTodayDateString } from "@/store/useProgressStore";
import {
  Flame,
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  Award,
  CheckCircle2,
  Info,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";

interface DayData {
  date: Date;
  dateStr: string;
  dayOfWeek: number; // 0 = Mon .. 6 = Sun
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
}

interface WeekData {
  weekIndex: number;
  monthLabel?: string;
  days: DayData[];
}

interface HoveredCellState {
  dateStr: string;
  count: number;
  isToday: boolean;
  x: number;
  y: number;
}

const DAY_LABELS = [
  { row: 0, label: "T2" },
  { row: 2, label: "T4" },
  { row: 4, label: "T6" },
];

export const ActivityHeatmap: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<HoveredCellState | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activityLog = useProgressStore((state) => state.activityLog);
  const logActivity = useProgressStore((state) => state.logActivity);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  useEffect(() => {
    setMounted(true);

    // Tự động dọn dẹp mock data cũ (>5 ngày trong quá khứ do code cũ sinh ra)
    const todayStr = getTodayDateString();
    const currentLog = useProgressStore.getState().activityLog;
    if (currentLog) {
      const keys = Object.keys(currentLog);
      if (keys.length > 5 && keys.some((k) => k < todayStr)) {
        const todayCount = currentLog[todayStr] || 0;
        if (todayCount > 0) {
          useProgressStore.setState({ activityLog: { [todayStr]: todayCount } });
        } else {
          useProgressStore.getState().clearActivityLog();
        }
      }
    }

    // Tự động cuộn sang tuần mới nhất (bên phải) trên thiết bị di động
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  // Tính toán lưới 52 tuần (364 ngày) kết thúc tại tuần hiện tại
  const { weeks, totalActivities, todayCount, currentStreak, maxStreak } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const todayStr = getTodayDateString(today);
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0 = Thứ 2, 6 = Chủ Nhật

    // Ngày kết thúc tuần hiện tại (Chủ Nhật)
    const endOfWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + (6 - dayOfWeek),
      12,
      0,
      0
    );

    // Ngày bắt đầu từ 52 tuần trước
    const startGrid = new Date(
      endOfWeek.getFullYear(),
      endOfWeek.getMonth(),
      endOfWeek.getDate() - (52 * 7 - 1),
      12,
      0,
      0
    );

    const weeksList: WeekData[] = [];
    let lastMonth = -1;
    let sumActivities = 0;

    for (let w = 0; w < 52; w++) {
      const days: DayData[] = [];
      const mondayDate = new Date(
        startGrid.getFullYear(),
        startGrid.getMonth(),
        startGrid.getDate() + w * 7,
        12,
        0,
        0
      );
      const mondayMonth = mondayDate.getMonth();

      let monthLabel: string | undefined = undefined;
      if (mondayMonth !== lastMonth) {
        // Tránh bị đè chữ: nếu tuần đầu tiên (w === 0) mà tháng sẽ đổi ngay trong 2 tuần tới, không render nhãn tuần 0
        const probeDate = new Date(
          startGrid.getFullYear(),
          startGrid.getMonth(),
          startGrid.getDate() + (w + 2) * 7,
          12,
          0,
          0
        );
        const willChangeSoon = w === 0 && probeDate.getMonth() !== mondayMonth;
        if (!willChangeSoon) {
          monthLabel = `Thg ${mondayMonth + 1}`;
        }
        lastMonth = mondayMonth;
      }

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(
          startGrid.getFullYear(),
          startGrid.getMonth(),
          startGrid.getDate() + (w * 7 + d),
          12,
          0,
          0
        );
        const cellDateStr = getTodayDateString(cellDate);
        const isFuture = cellDate.getTime() > today.getTime();
        const isToday = cellDateStr === todayStr;
        const count = isFuture ? 0 : (activityLog?.[cellDateStr] || 0);

        if (!isFuture) {
          sumActivities += count;
        }

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count >= 10) level = 4;
        else if (count >= 6) level = 3;
        else if (count >= 3) level = 2;
        else if (count >= 1) level = 1;

        days.push({
          date: cellDate,
          dateStr: cellDateStr,
          dayOfWeek: d,
          count,
          level,
          isToday,
          isFuture,
        });
      }

      weeksList.push({
        weekIndex: w,
        monthLabel,
        days,
      });
    }

    // Tính Current Streak & Longest Streak
    const todayActions = activityLog?.[todayStr] || 0;
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12, 0, 0);
    const yesterdayStr = getTodayDateString(yesterday);

    let streak = 0;
    let checkDay = today;

    // Nếu hôm nay chưa học gì, kiểm tra từ hôm qua để giữ streak
    if (todayActions === 0 && (activityLog?.[yesterdayStr] || 0) > 0) {
      checkDay = yesterday;
    }

    if ((activityLog?.[getTodayDateString(checkDay)] || 0) > 0) {
      while (true) {
        const dStr = getTodayDateString(checkDay);
        if ((activityLog?.[dStr] || 0) > 0) {
          streak++;
          checkDay = new Date(checkDay.getFullYear(), checkDay.getMonth(), checkDay.getDate() - 1, 12, 0, 0);
        } else {
          break;
        }
      }
    }

    // Tính Longest Streak
    const activeDates = Object.keys(activityLog || {})
      .filter((d) => (activityLog[d] || 0) > 0)
      .sort();

    let longest = 0;
    let curLongest = 0;
    let prevTime = 0;

    for (const dStr of activeDates) {
      const [y, m, d] = dStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      const time = dateObj.getTime();

      if (prevTime === 0) {
        curLongest = 1;
      } else {
        const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          curLongest++;
        } else if (diffDays > 1) {
          curLongest = 1;
        }
      }
      if (curLongest > longest) {
        longest = curLongest;
      }
      prevTime = time;
    }

    return {
      weeks: weeksList,
      totalActivities: sumActivities,
      todayCount: todayActions,
      currentStreak: streak,
      maxStreak: Math.max(longest, streak),
    };
  }, [activityLog]);

  // Nút hành động nhanh điểm danh
  const handleQuickCheckin = () => {
    logActivity();
    confetti({
      particleCount: 28,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#9333ea", "#a855f7", "#c084fc", "#e9d5ff"],
    });
    setToastMessage("Đã ghi nhận +1 hoạt động rèn luyện hôm nay!");
  };

  // Nút đặt lại lịch sử hoạt động nếu người dùng muốn làm mới hoàn toàn
  const handleResetActivities = () => {
    if (window.confirm("Bạn có chắc chắn muốn đặt lại nhật ký kỷ luật heatmap về 0 không?")) {
      useProgressStore.getState().clearActivityLog();
      setToastMessage("Đã đặt lại nhật ký hoạt động!");
    }
  };

  // Thang màu tím chủ đạo của FAST JLPT
  const getCellColorClass = (day: DayData) => {
    if (day.isFuture) {
      return "bg-slate-50/50 border border-dashed border-gray-200/50 cursor-not-allowed";
    }

    switch (day.level) {
      case 1:
        return "bg-purple-200 border border-purple-300 hover:border-purple-400";
      case 2:
        return "bg-purple-400 border border-purple-500 hover:border-purple-600";
      case 3:
        return "bg-purple-600 border border-purple-700 hover:border-purple-800";
      case 4:
        return "bg-purple-900 border border-purple-950 hover:ring-2 hover:ring-purple-400 shadow-2xs shadow-purple-900/30";
      case 0:
      default:
        return "bg-slate-100 hover:bg-slate-200 border border-slate-200/60 hover:border-purple-300";
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-md border border-purple-100/90 shadow-sm p-5 sm:p-7 space-y-6 transition-all hover:shadow-md">
      {/* Background soft ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-100/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-indigo-100/30 blur-2xl pointer-events-none" />

      {/* Header & Gamification Stats */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/70 mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Kỷ Luật Học Tập • Activity Heatmap</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Nhật Ký Rèn Luyện JLPT N2</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              52 Tuần
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi ô vuông thể hiện số lượt ôn flashcard, lưu sổ tay, làm test và luyện dịch trong ngày.
          </p>
        </div>

        {/* Action button & Streak metric badges */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Streak pill */}
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <div className="leading-none text-left">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Chuỗi ngày</span>
              <span className="text-sm font-black font-mono">
                {mounted ? `${currentStreak} ngày` : "--"}
              </span>
            </div>
          </div>

          {/* Total Actions pill */}
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-purple-50/80 border border-purple-200/80 text-purple-900 shadow-2xs">
            <Zap className="w-4 h-4 text-purple-600 fill-purple-600 shrink-0" />
            <div className="leading-none text-left">
              <span className="text-[10px] uppercase font-bold text-purple-600 block">Tổng hoạt động</span>
              <span className="text-sm font-black font-mono">
                {mounted ? `${totalActivities} lần` : "--"}
              </span>
            </div>
          </div>

          {/* Quick Check-in Button */}
          <button
            onClick={handleQuickCheckin}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Ghi nhận ngay 1 hoạt động học tập hôm nay"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>+1 Điểm danh</span>
          </button>

          {/* Reset button if has activities */}
          {mounted && totalActivities > 0 && (
            <button
              onClick={handleResetActivities}
              className="inline-flex items-center space-x-1 px-2.5 py-2 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-medium transition-all cursor-pointer"
              title="Đặt lại nhật ký hoạt động về 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Heatmap Grid Container with Horizontal Scroll on Mobile */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent"
        >
          <div className="min-w-[760px] select-none">
            {/* Top Month Labels Row */}
            <div className="flex items-center mb-1 pl-7 text-[11px] font-semibold text-slate-400">
              {weeks.map((w) => (
                <div
                  key={`month-${w.weekIndex}`}
                  className="w-[13px] sm:w-[15px] shrink-0 text-left overflow-visible whitespace-nowrap"
                >
                  {w.monthLabel && (
                    <span className="text-slate-600 font-bold">{w.monthLabel}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar Main Grid (7 rows x 52 columns) */}
            <div className="flex items-start">
              {/* Day of Week Labels (T2, T4, T6) */}
              <div className="flex flex-col justify-between h-[98px] sm:h-[112px] pr-2 text-[10px] font-semibold text-slate-400 select-none">
                <span className="h-[13px] sm:h-[15px] flex items-center">T2</span>
                <span className="h-[13px] sm:h-[15px] flex items-center">T4</span>
                <span className="h-[13px] sm:h-[15px] flex items-center">T6</span>
              </div>

              {/* 52 Week Columns */}
              <div className="flex gap-[2px] sm:gap-[3px]">
                {weeks.map((week) => (
                  <div
                    key={`week-${week.weekIndex}`}
                    className="flex flex-col gap-[2px] sm:gap-[3px]"
                  >
                    {week.days.map((day) => (
                      <div
                        key={day.dateStr}
                        onMouseEnter={(e) => {
                          if (day.isFuture) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            dateStr: day.dateStr,
                            count: day.count,
                            isToday: day.isToday,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] transition-all duration-150 ${getCellColorClass(
                          day
                        )} ${
                          day.isToday
                            ? "ring-2 ring-purple-600 ring-offset-1 font-bold z-10"
                            : ""
                        } ${
                          !day.isFuture
                            ? "hover:scale-130 hover:z-20 cursor-pointer"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Tooltip (Rendered outside scroll boundaries with fixed coordinates) */}
        {hoveredCell && (
          <div
            className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white backdrop-blur-md shadow-xl border border-purple-500/30 text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{ left: hoveredCell.x, top: hoveredCell.y - 6 }}
          >
            <div className="font-semibold text-[11px] text-purple-200 flex items-center space-x-1.5">
              <span>Ngày {hoveredCell.dateStr}:</span>
              <span className="text-white font-extrabold">{hoveredCell.count} hoạt động</span>
              {hoveredCell.isToday && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500 text-white font-bold">
                  Hôm nay
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {hoveredCell.count === 0
                ? "Không có hoạt động học tập nào"
                : `${hoveredCell.count} lượt rèn luyện & củng cố`}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-purple-500/30" />
          </div>
        )}
      </div>

      {/* Footer Info & Heatmap Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>
            {hoveredCell ? (
              <strong className="text-slate-800">
                Ngày {hoveredCell.dateStr}: {hoveredCell.count} hoạt động
              </strong>
            ) : (
              <span>
                Hôm nay bạn đã có{" "}
                <strong className="text-purple-700 font-bold font-mono">{todayCount}</strong> hoạt
                động rèn luyện.
              </span>
            )}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400">Ít</span>
          <div className="flex items-center space-x-1">
            <span
              className="w-3 h-3 rounded-[3px] bg-slate-100 border border-slate-200/60"
              title="0 hoạt động"
            />
            <span
              className="w-3 h-3 rounded-[3px] bg-purple-200 border border-purple-300"
              title="1 - 2 hoạt động"
            />
            <span
              className="w-3 h-3 rounded-[3px] bg-purple-400 border border-purple-500"
              title="3 - 5 hoạt động"
            />
            <span
              className="w-3 h-3 rounded-[3px] bg-purple-600 border border-purple-700"
              title="6 - 9 hoạt động"
            />
            <span
              className="w-3 h-3 rounded-[3px] bg-purple-900 border border-purple-950"
              title="10+ hoạt động"
            />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Nhiều</span>
        </div>
      </div>
    </section>
  );
};
