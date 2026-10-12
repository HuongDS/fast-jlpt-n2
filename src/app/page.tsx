"use client";

import React, { useState } from "react";
import { CountdownHeader } from "@/components/CountdownHeader";
import { DashboardHero } from "@/components/DashboardHero";
import { RoadmapGraph } from "@/components/RoadmapGraph";
import { NotebookWidget } from "@/components/NotebookWidget";
import { CurriculumHub } from "@/components/CurriculumHub";
import { StudyScreen } from "@/components/StudyScreen";
import { MaziiLookup } from "@/components/MaziiLookup";
import { Toast } from "@/components/Toast";
import { Section } from "@/data/books";
import { Info } from "lucide-react";

export default function Home() {
  const [activeView, setActiveView] = useState<"dashboard" | "study">("dashboard");
  const [studyMode, setStudyMode] = useState<"section" | "spaced-repetition">("section");
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  // Switch to Section Study Screen
  const handleOpenSectionStudy = (section: Section) => {
    setSelectedSection(section);
    setStudyMode("section");
    setActiveView("study");
  };

  // Switch to Spaced Repetition Quick Review Screen
  const handleOpenQuickReview = () => {
    setSelectedSection(null);
    setStudyMode("spaced-repetition");
    setActiveView("study");
  };

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
    setSelectedSection(null);
  };

  const handleScrollToCurriculum = () => {
    const el = document.getElementById("curriculum");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // If in Study/Review mode, render full-screen view (Separate Screen - NO MODALS)
  if (activeView === "study") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <StudyScreen
          mode={studyMode}
          section={selectedSection}
          onBackToDashboard={handleBackToDashboard}
        />
        <MaziiLookup />
        <Toast />
      </main>
    );
  }

  // Dashboard view
  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Header Navbar with Logo, Navigation Links and Reset Progress */}
      <CountdownHeader />

      {/* 2. Main Content Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        {/* Grand Dashboard Hero: Live Digital Countdown, SRS Review CTA & Metrics */}
        <DashboardHero
          onStartReview={handleOpenQuickReview}
          onExploreCurriculum={handleScrollToCurriculum}
        />

        {/* Roadmap Graph (Step-by-Step interactive graph milestones) */}
        <div id="roadmap">
          <RoadmapGraph onSelectSection={handleOpenSectionStudy} />
        </div>

        {/* Notebook Widget (Text Editor + Mazii Reverse Translation practice) */}
        <div id="notebook">
          <NotebookWidget />
        </div>

        {/* Curriculum Hub: Interactive Book Selector, Week Filters & Modern Lesson Cards */}
        <div id="curriculum">
          <CurriculumHub onSelectSection={handleOpenSectionStudy} />
        </div>

        {/* Learning Hint */}
        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xs border border-gray-200/80 text-xs text-slate-500 flex items-start space-x-3">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Mẹo tra cứu nhanh:</strong> Bôi đen bất kỳ chữ Hán hoặc cụm từ nào trên màn hình để bật nhanh pop-up{" "}
            <span className="font-bold text-slate-800">"Tra Mazii"</span> và tra cứu từ điển trực tiếp ngay trên trang web.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200/80 bg-white/40 text-center text-xs text-slate-400">
        <p>FAST JLPT N2 • Zero-Backend Next.js Static Web Application</p>
        <p className="text-[11px] text-slate-400 mt-1">Mục tiêu: Đạt chứng chỉ JLPT N2 trước ngày 06/12/2026</p>
      </footer>

      {/* Global Mazii Selection Lookup */}
      <MaziiLookup />

      {/* Global Toast Notification */}
      <Toast />
    </main>
  );
}
