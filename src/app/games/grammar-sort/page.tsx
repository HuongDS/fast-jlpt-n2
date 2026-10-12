"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  Trophy,
  Flame,
  HelpCircle,
  ChevronRight,
  BookOpen,
  Volume2,
  Lightbulb,
} from "lucide-react";
import { GRAMMAR_SORT_QUESTIONS, GrammarSortQuestion } from "@/data/grammarSortData";
import { useProgressStore } from "@/store/useProgressStore";
import { FastJlptLogoMark } from "@/components/FastJlptLogo";
import { MaziiLookup } from "@/components/MaziiLookup";
import { Toast } from "@/components/Toast";

interface GrammarBlock {
  uid: string;
  originalIndex: number;
  text: string;
}

// Xáo trộn mảng ngẫu nhiên
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function GrammarSortGamePage() {
  const [mounted, setMounted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [poolItems, setPoolItems] = useState<GrammarBlock[]>([]);
  const [slotItems, setSlotItems] = useState<GrammarBlock[]>([]);
  const [checkStatus, setCheckStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [incorrectSlots, setIncorrectSlots] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const logActivity = useProgressStore((state) => state.logActivity);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  const currentQuestion: GrammarSortQuestion =
    GRAMMAR_SORT_QUESTIONS[currentQuestionIndex] || GRAMMAR_SORT_QUESTIONS[0];

  // Tránh triệt để lỗi Hydration Mismatch của DND khi chạy Next.js App Router
  useEffect(() => {
    setMounted(true);
  }, []);

  // Khởi tạo các khối ngữ pháp xáo trộn khi đổi câu hỏi
  useEffect(() => {
    if (!currentQuestion) return;
    const blocks: GrammarBlock[] = currentQuestion.parts.map((text, idx) => ({
      uid: `block-${currentQuestion.id}-${idx}`,
      originalIndex: idx,
      text,
    }));

    // Xáo trộn để không trùng với thứ tự đúng ban đầu
    setPoolItems(shuffleArray(blocks));
    setSlotItems([]);
    setCheckStatus("idle");
    setIncorrectSlots([]);
    setShowExplanation(false);
  }, [currentQuestionIndex, currentQuestion]);

  // Xử lý kéo thả từ @hello-pangea/dnd
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    setCheckStatus("idle");
    setIncorrectSlots([]);

    // 1. Kéo thả đổi vị trí trong Kho (Pool)
    if (source.droppableId === "pool" && destination.droppableId === "pool") {
      const updated = Array.from(poolItems);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      setPoolItems(updated);
      return;
    }

    // 2. Kéo thả đổi vị trí trong Đáp án (Slots)
    if (source.droppableId === "slots" && destination.droppableId === "slots") {
      const updated = Array.from(slotItems);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      setSlotItems(updated);
      return;
    }

    // 3. Kéo từ Kho vào Đáp án (Tối đa 4 slot)
    if (source.droppableId === "pool" && destination.droppableId === "slots") {
      if (slotItems.length >= 4) return;
      const newPool = Array.from(poolItems);
      const [moved] = newPool.splice(source.index, 1);
      const newSlots = Array.from(slotItems);
      newSlots.splice(destination.index, 0, moved);
      setPoolItems(newPool);
      setSlotItems(newSlots);
      return;
    }

    // 4. Kéo từ Đáp án trả về lại Kho
    if (source.droppableId === "slots" && destination.droppableId === "pool") {
      const newSlots = Array.from(slotItems);
      const [moved] = newSlots.splice(source.index, 1);
      const newPool = Array.from(poolItems);
      newPool.splice(destination.index, 0, moved);
      setSlotItems(newSlots);
      setPoolItems(newPool);
      return;
    }
  };

  // Click vào khối ở Kho -> Tự động đưa vào slot trống tiếp theo
  const handleBlockClickFromPool = (block: GrammarBlock) => {
    if (slotItems.length >= 4) return;
    setCheckStatus("idle");
    setIncorrectSlots([]);
    setPoolItems((prev) => prev.filter((b) => b.uid !== block.uid));
    setSlotItems((prev) => [...prev, block]);
  };

  // Click vào khối ở Slot -> Trả ngược về Kho
  const handleBlockClickFromSlots = (block: GrammarBlock) => {
    setCheckStatus("idle");
    setIncorrectSlots([]);
    setSlotItems((prev) => prev.filter((b) => b.uid !== block.uid));
    setPoolItems((prev) => [...prev, block]);
  };

  // Đặt lại câu hiện tại về Kho
  const handleResetCurrent = () => {
    setCheckStatus("idle");
    setIncorrectSlots([]);
    setShowExplanation(false);
    const all = [...slotItems, ...poolItems];
    setSlotItems([]);
    setPoolItems(shuffleArray(all));
  };

  // Kiểm tra đáp án
  const handleCheckAnswer = () => {
    if (slotItems.length < 4) {
      setToastMessage("Vui lòng xếp đủ 4 vị trí ngữ pháp trước khi kiểm tra!");
      return;
    }

    const wrongIndexes: number[] = [];
    currentQuestion.correctOrder.forEach((expectedOrigIdx, slotIdx) => {
      if (slotItems[slotIdx]?.originalIndex !== expectedOrigIdx) {
        wrongIndexes.push(slotIdx);
      }
    });

    if (wrongIndexes.length === 0) {
      setCheckStatus("correct");
      setIncorrectSlots([]);
      setShowExplanation(true);
      setScore((s) => s + 10);
      setStreak((st) => st + 1);
      logActivity(undefined, 3); // Ghi nhận kỷ luật học tập

      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.65 },
        colors: ["#9333ea", "#10b981", "#f59e0b", "#6366f1"],
      });

      setToastMessage("Chính xác tuyệt đối! Cấu trúc câu ngữ pháp hoàn chỉnh.");
    } else {
      setCheckStatus("incorrect");
      setIncorrectSlots(wrongIndexes);
      setStreak(0);
      setToastMessage("Chưa đúng ở vị trí màu đỏ. Hãy hoán đổi lại vị trí các mảnh ghép!");
    }
  };

  // Sang câu hỏi tiếp theo
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < GRAMMAR_SORT_QUESTIONS.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setToastMessage("Chúc mừng bạn đã hoàn thành tất cả câu hỏi xếp hình ngữ pháp!");
      setCurrentQuestionIndex(0);
    }
  };

  // Khối Skeleton khi đang mount SSR
  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl p-8 rounded-3xl bg-white/70 border border-purple-100 backdrop-blur-md shadow-sm space-y-6 text-center animate-pulse">
          <div className="h-8 bg-purple-100 rounded-full w-48 mx-auto" />
          <div className="h-20 bg-slate-100 rounded-2xl w-full" />
          <div className="h-16 bg-purple-50 rounded-2xl w-3/4 mx-auto" />
          <div className="h-12 bg-slate-100 rounded-xl w-32 mx-auto" />
        </div>
      </main>
    );
  }

  // Từ vựng tương ứng ở vị trí ngôi sao ★
  const starCorrectWord =
    currentQuestion.parts[currentQuestion.correctOrder[currentQuestion.starIndex]];

  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-purple-100 selection:text-purple-900 pb-16">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3 py-2 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

            <div className="flex items-center space-x-2">
              <FastJlptLogoMark size="xs" />
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                Xếp hình Ngữ pháp ★
              </span>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-800 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-purple-600" />
              <span>{score} điểm</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{streak} chuỗi</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Game Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner Title & Progress Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pb-1">
          <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200/70 font-bold">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Mô phỏng dạng bài Dấu Sao JLPT N2</span>
          </span>
          <span>
            Câu <strong>{currentQuestionIndex + 1}</strong> / {GRAMMAR_SORT_QUESTIONS.length}
          </span>
        </div>

        {/* Progress line */}
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / GRAMMAR_SORT_QUESTIONS.length) * 100}%`,
            }}
          />
        </div>

        {/* ================= KHỐI CÂU HỎI & PREVIEW HOÀN CHỈNH ================= */}
        <div className="relative overflow-hidden rounded-3xl bg-white/85 backdrop-blur-md border border-purple-100/90 shadow-sm p-6 sm:p-8 space-y-5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>{currentQuestion.bookSource || "Shinkanzen Master N2"}</span>
            </span>

            {currentQuestion.grammarPoint && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {currentQuestion.grammarPoint}
              </span>
            )}
          </div>

          {/* Câu hỏi mô phỏng đề thi có dấu sao */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đề bài: Hãy sắp xếp 4 mảnh ghép để điền vào vị trí dấu sao [★]:
            </h3>

            {/* Khung lắp ghép câu thời gian thực */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-200/80 shadow-inner flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-base sm:text-xl font-bold font-japanese leading-loose text-slate-800">
              {currentQuestion.sentenceBefore && (
                <span className="text-slate-900 bg-white/70 px-2.5 py-1 rounded-xl border border-purple-100 shadow-2xs">
                  {currentQuestion.sentenceBefore}
                </span>
              )}

              {[0, 1, 2, 3].map((slotIdx) => {
                const filled = slotItems[slotIdx];
                const isStar = slotIdx === currentQuestion.starIndex;
                const isError = incorrectSlots.includes(slotIdx);
                const isSuccess = checkStatus === "correct";

                return (
                  <div
                    key={`preview-slot-${slotIdx}`}
                    className={`inline-flex items-center justify-center min-w-[70px] sm:min-w-[100px] px-3 py-1.5 rounded-xl border-2 transition-all font-japanese text-sm sm:text-base ${
                      isSuccess
                        ? "bg-emerald-100 text-emerald-900 border-emerald-500 shadow-xs scale-102"
                        : isError
                        ? "bg-rose-100 text-rose-900 border-rose-500 animate-shake"
                        : filled
                        ? "bg-purple-100 text-purple-900 border-purple-400 shadow-2xs"
                        : isStar
                        ? "bg-amber-50/90 text-amber-800 border-dashed border-amber-400 shadow-2xs"
                        : "bg-white/80 text-slate-400 border-dashed border-slate-300"
                    }`}
                  >
                    {filled ? (
                      <span className="flex items-center gap-1 font-bold">
                        {isStar && <span className="text-amber-500 text-xs">★</span>}
                        {filled.text}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        {isStar ? (
                          <span className="inline-flex items-center text-amber-600 font-black">
                            ★ Vị trí sao
                          </span>
                        ) : (
                          `Vị trí ${slotIdx + 1}`
                        )}
                      </span>
                    )}
                  </div>
                );
              })}

              {currentQuestion.sentenceAfter && (
                <span className="text-slate-900 bg-white/70 px-2.5 py-1 rounded-xl border border-purple-100 shadow-2xs">
                  {currentQuestion.sentenceAfter}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================= KHU VỰC KÉO THẢ DND ================= */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {/* 1. KHU VỰC ĐÁP ÁN CỦA BẠN (TARGET SLOTS) */}
            <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-purple-200/90 p-5 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Khu vực Đáp án của bạn ({slotItems.length}/4 mảnh đã xếp):</span>
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (Kéo thả đổi vị trí hoặc click để gỡ mảnh ghép)
                </span>
              </div>

              <Droppable droppableId="slots" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[82px] p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 sm:gap-3.5 ${
                      snapshot.isDraggingOver
                        ? "border-purple-500 bg-purple-50/70 ring-2 ring-purple-300/40"
                        : "border-purple-200/80 bg-purple-50/20"
                    }`}
                  >
                    {/* Render các mảnh đã được thả vào Slots */}
                    {slotItems.map((block, index) => {
                      const isStar = index === currentQuestion.starIndex;
                      const isError = incorrectSlots.includes(index);
                      const isSuccess = checkStatus === "correct";

                      return (
                        <Draggable
                          key={block.uid}
                          draggableId={block.uid}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => handleBlockClickFromSlots(block)}
                              className={`group relative flex-1 min-w-[120px] max-w-[200px] py-3 px-3.5 rounded-xl border-2 font-japanese text-sm sm:text-base font-bold text-center cursor-grab active:cursor-grabbing transition-all select-none ${
                                dragSnapshot.isDragging
                                  ? "bg-purple-600 text-white border-purple-700 shadow-xl scale-105 z-50 ring-4 ring-purple-300"
                                  : isSuccess
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-500 shadow-xs"
                                  : isError
                                  ? "bg-rose-50 text-rose-900 border-rose-500 animate-shake shadow-xs"
                                  : isStar
                                  ? "bg-white text-purple-950 border-amber-400 shadow-2xs hover:border-amber-500"
                                  : "bg-white text-slate-800 border-purple-200 shadow-2xs hover:border-purple-400 hover:shadow-xs"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold bg-purple-100 text-purple-700">
                                  {isStar ? "★" : index + 1}
                                </span>
                                <span>{block.text}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-sans block mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click để gỡ
                              </span>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}

                    {/* Hiển thị các ô slot còn trống nếu chưa đủ 4 */}
                    {Array.from({ length: 4 - slotItems.length }).map((_, i) => {
                      const actualSlotIdx = slotItems.length + i;
                      const isStar = actualSlotIdx === currentQuestion.starIndex;

                      return (
                        <div
                          key={`empty-slot-${actualSlotIdx}`}
                          className={`flex-1 min-w-[120px] max-w-[200px] py-3.5 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all select-none ${
                            isStar
                              ? "border-amber-400 bg-amber-50/40 text-amber-700"
                              : "border-slate-300 bg-slate-50/50 text-slate-400"
                          }`}
                        >
                          <span className="text-xs font-bold flex items-center gap-1">
                            {isStar ? (
                              <>
                                <span className="text-amber-500">★</span> Vị trí ngôi sao
                              </>
                            ) : (
                              `Slot ${actualSlotIdx + 1}`
                            )}
                          </span>
                          <span className="text-[9px] opacity-70">Thả mảnh ghép vào đây</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Droppable>
            </div>

            {/* 2. KHO CÁC MẢNH NGỮ PHÁP (POOL AREA) */}
            <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-gray-200/80 p-5 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Kho 4 mảnh ngữ pháp cần ghép ({poolItems.length} mảnh chưa dùng):
                </span>
                <span className="text-[11px] text-slate-400">
                  (Kéo lên hoặc click trực tiếp để tự động xếp)
                </span>
              </div>

              <Droppable droppableId="pool" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[82px] p-3 sm:p-4 rounded-2xl border-2 border-dashed transition-all flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 sm:gap-3.5 ${
                      snapshot.isDraggingOver
                        ? "border-indigo-400 bg-indigo-50/40"
                        : "border-gray-200 bg-slate-50/50"
                    }`}
                  >
                    {poolItems.length === 0 ? (
                      <div className="py-2 text-xs text-slate-400 font-medium">
                        Tất cả 4 mảnh ngữ pháp đã được đưa vào khu vực Đáp án. Hãy bấm{" "}
                        <strong className="text-purple-700">"Kiểm tra"</strong>!
                      </div>
                    ) : (
                      poolItems.map((block, index) => (
                        <Draggable
                          key={block.uid}
                          draggableId={block.uid}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => handleBlockClickFromPool(block)}
                              className={`group flex-1 min-w-[120px] max-w-[200px] py-3 px-4 rounded-xl border-2 font-japanese text-sm sm:text-base font-bold text-center cursor-grab active:cursor-grabbing transition-all select-none ${
                                dragSnapshot.isDragging
                                  ? "bg-purple-600 text-white border-purple-700 shadow-xl scale-105 z-50 ring-4 ring-purple-300"
                                  : "bg-white text-slate-800 border-gray-200 shadow-2xs hover:border-purple-400 hover:shadow-xs hover:bg-purple-50/50"
                              }`}
                            >
                              <span>{block.text}</span>
                              <span className="text-[9px] text-purple-600 font-sans block mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click để chọn
                              </span>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>

        {/* ================= ACTION BUTTONS ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleResetCurrent}
            className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs sm:text-sm border border-gray-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Xếp lại từ đầu</span>
          </button>

          <div className="flex items-center space-x-3">
            {checkStatus === "correct" ? (
              <button
                onClick={handleNextQuestion}
                className="inline-flex items-center space-x-2 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCheckAnswer}
                disabled={slotItems.length < 4}
                className={`inline-flex items-center space-x-2 px-7 sm:px-9 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base transition-all ${
                  slotItems.length === 4
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Kiểm tra đáp án</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= HỘP GIẢI THÍCH CHI TIẾT KHI ĐÚNG HOẶC XEM HINT ================= */}
        {showExplanation && (
          <div className="rounded-3xl bg-emerald-50/80 border border-emerald-200/90 p-6 sm:p-7 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
              <div className="flex items-center space-x-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-extrabold text-base sm:text-lg">
                  Chính xác! Đáp án vị trí dấu sao [★]:
                </h4>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-sm font-japanese shadow-2xs">
                ★ {starCorrectWord}
              </span>
            </div>

            {/* Câu hoàn chỉnh */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Câu tiếng Nhật hoàn chỉnh:
              </span>
              <p className="text-base sm:text-lg font-bold font-japanese text-slate-900 leading-relaxed bg-white/70 p-3 rounded-xl border border-emerald-200/60">
                {currentQuestion.completeSentenceJa}
              </p>
            </div>

            {/* Nghĩa tiếng Việt */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Nghĩa tiếng Việt:
              </span>
              <p className="text-sm font-medium text-slate-700 italic">
                "{currentQuestion.meaningVi}"
              </p>
            </div>

            {/* Giải thích ngữ pháp */}
            <div className="space-y-1 text-xs text-slate-700 leading-relaxed bg-white/50 p-3.5 rounded-xl border border-emerald-200/40">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-900 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Phân tích trật tự ngữ pháp JLPT:</span>
              </div>
              <p>{currentQuestion.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <MaziiLookup />
      <Toast />
    </main>
  );
}
