"use client";

import React, { useState, useEffect } from "react";
import { Flashcard, Section, getAllFlashcards } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { 
  X, 
  Check, 
  RotateCcw, 
  Eye, 
  Award, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  Volume2
} from "lucide-react";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "section" | "spaced-repetition";
  section?: Section | null;
  onSectionCompleted?: (sectionId: string) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  mode,
  section,
  onSectionCompleted,
}) => {
  const srsData = useProgressStore((state) => state.srsData);
  const updateReview = useProgressStore((state) => state.updateReview);
  const markSectionCompleted = useProgressStore((state) => state.markSectionCompleted);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Initialize questions
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setShowAnswer(false);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsFinished(false);
      return;
    }

    if (mode === "section" && section) {
      // Use section flashcards
      setCards(section.flashcards);
    } else {
      // Spaced Repetition mode: Find due cards
      const allCards = getAllFlashcards();
      const now = Date.now();
      const dueCards = allCards.filter((card) => {
        const item = srsData[card.id];
        return item ? item.nextReviewDate <= now : false;
      });

      // If no cards are due yet, provide all cards as review pool
      if (dueCards.length > 0) {
        setCards(dueCards);
      } else {
        // Fallback: take a batch of 5-8 cards for immediate review
        setCards(allCards.slice(0, 6));
      }
    }

    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsFinished(false);
  }, [isOpen, mode, section?.id]);

  if (!isOpen) return null;

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const handleAnswerReview = (isCorrect: boolean) => {
    if (!currentCard) return;

    // Update SRS state in Zustand
    updateReview(currentCard.id, isCorrect);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Finished all cards in this session
      setIsFinished(true);
      if (mode === "section" && section) {
        markSectionCompleted(section.id);
        if (onSectionCompleted) {
          onSectionCompleted(section.id);
        }
      }
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white/95 backdrop-blur-xl border border-gray-200/90 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/60">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {mode === "section" ? (section ? section.title : "Bài kiểm tra") : "Ôn tập nhanh"}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {!isFinished && cards.length > 0 && `Câu ${currentIndex + 1}/${cards.length}`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Line */}
        {!isFinished && cards.length > 0 && (
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-indigo-600 h-1 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col justify-between space-y-6">
          {!isFinished ? (
            currentCard ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                {/* Front Side: Question / Kanji / Blank */}
                <div className="space-y-4">
                  <div className="text-center py-6 px-4 rounded-xl bg-slate-50/70 border border-gray-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Câu hỏi / Chữ Hán
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-relaxed">
                      {currentCard.question}
                    </h3>
                  </div>

                  {/* Multiple Choice Options if available */}
                  {currentCard.options && currentCard.options.length > 0 && !showAnswer && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {currentCard.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 text-center text-xs sm:text-sm font-medium text-slate-700 bg-white border border-gray-200 rounded-lg shadow-2xs"
                        >
                          {idx + 1}. {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Back Side: Revealed Answer & Explanation */}
                  {showAnswer && (
                    <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          Đáp án & Cách đọc:
                        </span>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className="text-lg font-bold text-slate-900">
                            {currentCard.reading ? `${currentCard.reading} (${currentCard.correctAnswer})` : currentCard.correctAnswer}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          Ý nghĩa:
                        </span>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">
                          {currentCard.meaning}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-indigo-100/60">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          Giải thích ngữ pháp / Hán tự:
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {currentCard.explanation}
                        </p>
                      </div>

                      {currentCard.example && (
                        <div className="pt-2 border-t border-indigo-100/60 text-xs">
                          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                            Ví dụ thực tế:
                          </span>
                          <p className="font-japanese text-slate-900 font-medium mt-0.5">
                            {currentCard.example}
                          </p>
                          {currentCard.exampleMeaning && (
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {currentCard.exampleMeaning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-gray-100">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] rounded-xl transition-all"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      <span>Xem đáp án</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAnswerReview(false)}
                        className="flex items-center justify-center space-x-2 px-4 py-3 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-[0.98] rounded-xl transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>Quên (Sai)</span>
                      </button>

                      <button
                        onClick={() => handleAnswerReview(true)}
                        className="flex items-center justify-center space-x-2 px-4 py-3 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-[0.98] rounded-xl transition-all"
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Nhớ (Đúng)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Không tìm thấy câu hỏi phù hợp.
              </div>
            )
          ) : (
            /* Results Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {mode === "section" ? "Check-in thành công!" : "Hoàn thành buổi ôn tập!"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Dữ liệu đã được đồng bộ xuống Spaced Repetition (localStorage).
                </p>
              </div>

              {/* Score Badges */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-xs font-semibold text-emerald-700">Đã nhớ</span>
                  <div className="text-2xl font-extrabold text-emerald-800 mt-0.5">
                    {correctCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                  <span className="text-xs font-semibold text-rose-700">Cần ôn lại</span>
                  <div className="text-2xl font-extrabold text-rose-800 mt-0.5">
                    {incorrectCount}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center space-x-3 pt-4">
                <button
                  onClick={restartQuiz}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Làm lại
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
