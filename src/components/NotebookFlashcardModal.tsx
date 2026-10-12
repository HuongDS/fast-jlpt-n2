"use client";

import React, { useState } from "react";
import { NotebookItem } from "@/store/useProgressStore";
import { X, RotateCw, Eye, Check, ChevronLeft, ChevronRight, BookOpen, Layers } from "lucide-react";

interface NotebookFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotebookItem[];
  notebookTitle: string;
}

export const NotebookFlashcardModal: React.FC<NotebookFlashcardModalProps> = ({
  isOpen,
  onClose,
  items,
  notebookTitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen) return null;

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center space-y-4">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Sổ tay này chưa có từ vựng nào</h3>
          <p className="text-xs text-slate-500">
            Hãy thêm từ vựng/ngữ pháp từ bài học vào sổ tay để luyện tập Flashcard nhé!
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Flashcard Sổ tay: {notebookTitle}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Thẻ {currentIndex + 1} / {items.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body (Interactive Flip) */}
        <div className="p-8 sm:p-10 flex-1 flex flex-col items-center justify-center min-h-[340px]">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full p-8 rounded-3xl bg-slate-50/80 border border-gray-200/90 shadow-sm cursor-pointer hover:border-indigo-300 transition-all duration-200 text-center space-y-4"
          >
            {!isFlipped ? (
              /* Mặt trước */
              <div className="space-y-4 py-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  Mặt trước (Chữ Hán / Ngữ pháp)
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-japanese leading-relaxed">
                  {currentItem.word}
                </h2>
                <div className="pt-4 flex items-center justify-center space-x-1.5 text-xs font-bold text-indigo-600">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Bấm vào thẻ để lật xem cách đọc, nghĩa & câu mẫu</span>
                </div>
              </div>
            ) : (
              /* Mặt sau */
              <div className="space-y-4 py-4 text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="text-center border-b border-gray-200/70 pb-3">
                  <div className="flex items-center justify-center space-x-2">
                    <h3 className="text-2xl font-black text-slate-900 font-japanese">
                      {currentItem.word}
                    </h3>
                    {currentItem.reading && (
                      <span className="text-sm font-bold text-indigo-700 font-japanese bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                        【{currentItem.reading}】
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mt-2">
                    Ý nghĩa tiếng Việt:
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {currentItem.meaning}
                  </p>
                </div>

                {currentItem.exampleJa && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Câu mẫu tiếng Nhật:
                    </span>
                    <p className="text-sm font-bold text-slate-900 font-japanese">
                      {currentItem.exampleJa}
                    </p>
                    {currentItem.exampleVi && (
                      <p className="text-xs text-slate-600 font-medium">
                        "{currentItem.exampleVi}"
                      </p>
                    )}
                  </div>
                )}

                {currentItem.explanation && (
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    {currentItem.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <button
            onClick={handlePrev}
            className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thẻ trước</span>
          </button>

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Mặt trước" : "Lật thẻ"}</span>
          </button>

          <button
            onClick={handleNext}
            className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <span>Thẻ sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
