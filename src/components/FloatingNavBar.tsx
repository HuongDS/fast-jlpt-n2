"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgressStore } from "@/store/useProgressStore";
import { AiSettingsModal } from "@/components/AiSettingsModal";
import { Home, BookOpen, PenTool, Settings } from "lucide-react";

export const FloatingNavBar: React.FC = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const isQuizActive = useProgressStore((state) => state.isQuizActive);
  const isAiModalOpen = useProgressStore((state) => state.isAiModalOpen);
  const setAiModalOpen = useProgressStore((state) => state.setAiModalOpen);
  const setNotebookModalOpen = useProgressStore((state) => state.setNotebookModalOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Ẩn thanh Floating khi người dùng đang ở trong route/chế độ làm bài kiểm tra trắc nghiệm hoặc mini-games
  const isHiddenRoute =
    pathname?.includes("/quiz") ||
    pathname?.startsWith("/games") ||
    isQuizActive;

  if (isHiddenRoute) {
    return (
      <AiSettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    );
  }

  const isHomeActive = pathname === "/";
  const isPracticeActive = pathname === "/practice";

  const handleNotebookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") {
      const el = document.getElementById("notebook");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setNotebookModalOpen(true);
    }
  };

  return (
    <>
      {/* Floating Bottom Navigation Bar */}
      <nav
        aria-label="Thanh điều hướng nổi"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 sm:p-2 bg-white/80 backdrop-blur-md border border-gray-200/90 shadow-xl rounded-full transition-all duration-300 max-w-[95vw] ring-1 ring-black/5"
      >
        {/* 1. Dashboard (Trang chủ) */}
        <Link
          href="/"
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
            isHomeActive
              ? "bg-purple-50 text-purple-700 border border-purple-200/90 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
          title="Trang chủ Dashboard"
        >
          <Home className={`w-4 h-4 ${isHomeActive ? "text-purple-700" : "text-slate-500"}`} />
          <span>Trang chủ</span>
        </Link>

        {/* 2. Sổ tay (Notebook) */}
        <Link
          href="/#notebook"
          onClick={handleNotebookClick}
          className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all duration-150"
          title="Sổ tay cá nhân & Luyện dịch"
        >
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>Sổ tay</span>
        </Link>

        {/* 3. Luyện dịch (Practice) */}
        <Link
          href="/practice"
          className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
            isPracticeActive
              ? "bg-purple-50 text-purple-700 border border-purple-200/90 font-bold shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
          title="Màn hình Luyện dịch Mazii & AI"
        >
          <PenTool className={`w-4 h-4 ${isPracticeActive ? "text-purple-700" : "text-slate-500"}`} />
          <span>Luyện dịch</span>
        </Link>

        {/* Phân cách nhẹ */}
        <div className="w-[1px] h-5 bg-gray-200 mx-0.5 sm:mx-1" />

        {/* 4. Cài đặt AI (Settings) */}
        <button
          type="button"
          onClick={() => setAiModalOpen(true)}
          className={`flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
            isAiModalOpen
              ? "bg-purple-50 text-purple-700 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
          title="Cấu hình AI Key"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Cài đặt AI</span>
        </button>
      </nav>

      {/* Global AI Settings Modal triggered by FloatingNavBar */}
      <AiSettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </>
  );
};
