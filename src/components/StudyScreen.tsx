"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Flashcard, Section, getAllFlashcards, BOOKS_DATA, RelatedWord } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { AddToNotebookModal } from "@/components/AddToNotebookModal";
import { KanjiCardWithTabs } from "@/components/KanjiCardWithTabs";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Lock, 
  Unlock, 
  BookMarked, 
  Eye, 
  RotateCcw, 
  Check, 
  Award, 
  ChevronRight,
  RotateCw,
  Zap,
  CheckCheck,
  CornerDownRight,
  AlertCircle,
  XCircle
} from "lucide-react";

interface WrongAnswerRecord {
  card: Flashcard;
  userSelected: string;
}

// Chuẩn hóa và xáo trộn 4 đáp án trắc nghiệm cho mỗi câu hỏi
const prepareQuizCards = (rawCards: Flashcard[]): Flashcard[] => {
  const allDistractorPool = Array.from(
    new Set(
      getAllFlashcards()
        .flatMap((c) => [c.correctAnswer, ...(c.options || [])])
        .filter(Boolean)
    )
  );

  return rawCards.map((card) => {
    let opts = card.options && card.options.length >= 4 
      ? [...card.options] 
      : Array.from(new Set([card.correctAnswer, ...(card.options || [])]));

    // Bổ sung thêm đáp án nếu chưa đủ 4 lựa chọn
    if (opts.length < 4) {
      for (const item of allDistractorPool) {
        if (!opts.includes(item)) {
          opts.push(item);
        }
        if (opts.length >= 4) break;
      }
    }

    // Xáo trộn vị trí 4 đáp án ngẫu nhiên
    const shuffledOptions = opts.slice(0, 4).sort(() => Math.random() - 0.5);

    return {
      ...card,
      options: shuffledOptions,
    };
  }).sort(() => Math.random() - 0.5); // Xáo trộn thứ tự các câu hỏi
};

interface StudyScreenProps {
  mode: "section" | "spaced-repetition";
  section?: Section | null;
  onBackToDashboard: () => void;
}

export const StudyScreen: React.FC<StudyScreenProps> = ({
  mode,
  section,
  onBackToDashboard,
}) => {
  const router = useRouter();
  const markSectionCompleted = useProgressStore((state) => state.markSectionCompleted);
  const updateReview = useProgressStore((state) => state.updateReview);
  
  // Pre-check Flashcard state in Zustand
  const masteredFlashcardIds = useProgressStore((state) => state.masteredFlashcardIds);
  const markFlashcardMastered = useProgressStore((state) => state.markFlashcardMastered);
  const unmarkFlashcardMastered = useProgressStore((state) => state.unmarkFlashcardMastered);
  const setQuizActive = useProgressStore((state) => state.setQuizActive);

  // Sub-stage for section: "flashcards" (Pre-check) vs "quiz" (Test trắc nghiệm)
  const [sectionStage, setSectionStage] = useState<"flashcards" | "quiz">("flashcards");
  
  // Đồng bộ trạng thái quiz để ẩn/hiện FloatingNavBar
  useEffect(() => {
    const isCurrentlyInQuiz = mode === "spaced-repetition" || sectionStage === "quiz";
    setQuizActive(isCurrentlyInQuiz);
    return () => {
      setQuizActive(false);
    };
  }, [mode, sectionStage, setQuizActive]);
  
  // Flipped state per card in Pre-check mode (Ban đầu 100% false - ẩn mặt sau)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Notebook modal state
  const [notebookCard, setNotebookCard] = useState<Flashcard | null>(null);

  // Quiz state
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRecord[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dọn dẹp timer khi component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Initialize data (Không phụ thuộc srsData để tránh reset màn hình khi chọn đáp án)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (mode === "section" && section) {
      setCards(section.flashcards);
      setSectionStage("flashcards");
      // Reset all cards to unflipped (Mặt trước)
      setFlippedCards({});
    } else {
      const all = getAllFlashcards();
      const now = Date.now();
      const currentSrs = useProgressStore.getState().srsData;
      const due = all.filter((c) => {
        const item = currentSrs[c.id];
        return item ? item.nextReviewDate <= now : false;
      });

      const pool = due.length > 0 ? due : all.slice(0, 8);
      setCards(prepareQuizCards(pool));
      setSectionStage("quiz");
    }

    setQuizIndex(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setIsAnswering(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWrongAnswers([]);
    setIsTestFinished(false);
  }, [mode, section?.id]);

  const parentBook = section ? BOOKS_DATA.find((b) => b.id === section.bookId) : null;
  const sectionCards = section ? section.flashcards : [];

  // Tính tổng số mục cần thuộc: 1 cho ngữ pháp, và (1 Hán tự gốc + N từ vựng con) cho bài Kanji
  const totalItemsRequired = sectionCards.reduce((acc, c) => {
    if (c.rootKanji && c.relatedWords && c.relatedWords.length > 0) {
      return acc + 1 + c.relatedWords.length;
    }
    return acc + 1;
  }, 0);

  // Tổng số mục đã thuộc
  const totalItemsMastered = sectionCards.reduce((acc, c) => {
    let count = 0;
    if (masteredFlashcardIds[c.id]) count += 1;
    if (c.rootKanji && c.relatedWords) {
      c.relatedWords.forEach((rel) => {
        if (masteredFlashcardIds[rel.id]) count += 1;
      });
    }
    return acc + count;
  }, 0);

  const isAllMastered = totalItemsRequired > 0 && totalItemsMastered >= totalItemsRequired;

  const currentQuizCard = cards[quizIndex];

  const handleToggleCardFlip = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleToggleMastered = (cardId: string) => {
    if (masteredFlashcardIds[cardId]) {
      unmarkFlashcardMastered(cardId);
    } else {
      markFlashcardMastered(cardId);
    }
  };

  const handleStartQuiz = () => {
    if (!isAllMastered) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const prepared = prepareQuizCards(sectionCards);
    setCards(prepared);
    setSectionStage("quiz");
    setQuizIndex(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setIsAnswering(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWrongAnswers([]);
    setIsTestFinished(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestartQuiz = () => {
    handleStartQuiz();
  };

  const handleBackToFlashcards = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSectionStage("flashcards");
    setIsTestFinished(false);
    setIsAnswering(false);
    setSelectedOption(null);
    setShowAnswer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectQuizOption = (option: string) => {
    if (isAnswering || selectedOption !== null || !currentQuizCard) return;

    // 1. Khóa click để người dùng không bấm nhiều lần
    setIsAnswering(true);
    setSelectedOption(option);
    setShowAnswer(true);

    const isCorrect = option === currentQuizCard.correctAnswer;
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const nextIncorrectCount = isCorrect ? incorrectCount : incorrectCount + 1;

    if (isCorrect) {
      setCorrectCount(nextCorrectCount);
    } else {
      setIncorrectCount(nextIncorrectCount);
      setWrongAnswers((prev) => [
        ...prev,
        { card: currentQuizCard, userSelected: option },
      ]);
    }

    // Cập nhật SRS ngầm
    updateReview(currentQuizCard.id, isCorrect);

    // 2. Tạo độ trễ 900ms để kịp nhìn phản hồi Đúng (Xanh) / Sai (Đỏ)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 3. Kiểm tra Out of Bounds trước khi tăng index
      if (quizIndex < cards.length - 1) {
        setQuizIndex((prev) => prev + 1);
        setSelectedOption(null);
        setShowAnswer(false);
        setIsAnswering(false);
      } else {
        // Câu cuối cùng -> Chuyển sang màn hình kết quả Test
        setIsAnswering(false);
        finishQuiz(nextCorrectCount);
      }
    }, 900);
  };

  const handleSrsAnswer = (isCorrect: boolean) => {
    if (!currentQuizCard || isAnswering) return;
    setIsAnswering(true);
    updateReview(currentQuizCard.id, isCorrect);

    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) {
      setCorrectCount(nextCorrect);
    } else {
      setIncorrectCount((prev) => prev + 1);
      setWrongAnswers((prev) => [
        ...prev,
        { card: currentQuizCard, userSelected: "Quên (Chưa nhớ)" },
      ]);
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (quizIndex < cards.length - 1) {
        setQuizIndex((prev) => prev + 1);
        setShowAnswer(false);
        setIsAnswering(false);
      } else {
        setIsAnswering(false);
        finishQuiz(nextCorrect);
      }
    }, 400);
  };

  const finishQuiz = (finalCorrect: number) => {
    setIsTestFinished(true);

    // Điểm tuyệt đối 100%: Đúng tất cả các câu
    const isPerfectScore = finalCorrect === cards.length;

    if (isPerfectScore) {
      // Kích hoạt canvas-confetti ăn mừng
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
    }
  };

  // Chỉ đánh dấu hoàn thành Node khi đạt 100% điểm VÀ người dùng bấm nút xác nhận
  const handleConfirmCompleteAndExit = () => {
    if (correctCount === cards.length && mode === "section" && section) {
      markSectionCompleted(section.id);
    }
    if (parentBook) {
      router.push(`/book/${parentBook.id}`);
    } else {
      onBackToDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-200">
      {/* Top Fixed Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Dashboard</span>
          </button>

          <div className="flex items-center space-x-3">
            {mode === "section" ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">{section?.title}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-purple-700">
                  {sectionStage === "flashcards" ? "Bước 1: Pre-check Flashcard" : "Bước 2: Test trắc nghiệm"}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">Ôn tập Spaced Repetition</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {mode === "section" && sectionStage === "flashcards" ? (
          /* ================= BƯỚC 1: PRE-CHECK FLASHCARD CHUẨN LẬT THẺ ================= */
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Banner Header */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${parentBook?.badgeColor || "bg-purple-50 text-purple-700 border-purple-200"}`}>
                  {parentBook?.title}
                </span>

                <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  isAllMastered
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}>
                  <CheckCheck className="w-4 h-4" />
                  <span>
                    Đã thuộc: {totalItemsMastered}/{totalItemsRequired} mục
                  </span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {section?.title}: {section?.subtitle}
              </h1>
              <p className="text-sm text-slate-500">
                Thẻ Flashcard ban đầu chỉ hiển thị <strong>Mặt trước</strong>. Hãy thử nhớ lại nghĩa trong đầu, sau đó <strong>bấm lật thẻ</strong> để kiểm tra trí nhớ và đánh dấu <strong>"Đã thuộc"</strong>.
              </p>
            </div>

            {/* List of Flashcards (Flip Card Mode / Kanji Tabs) */}
            <div className="space-y-6">
              {sectionCards.map((card, idx) => {
                const isFlipped = !!flippedCards[card.id];
                const isMastered = !!masteredFlashcardIds[card.id];
                const hasRootKanji = !!card.rootKanji;

                // Nếu là thẻ Hán tự (Kanji), sử dụng component KanjiCardWithTabs có hệ thống Tabs chuyên biệt
                if (hasRootKanji) {
                  return (
                    <KanjiCardWithTabs
                      key={card.id}
                      card={card}
                      index={idx}
                      masteredFlashcardIds={masteredFlashcardIds}
                      onToggleMastered={handleToggleMastered}
                      onAddToNotebook={(c, rel) => {
                        if (rel) {
                          setNotebookCard({
                            ...c,
                            question: rel.word,
                            correctAnswer: rel.word,
                            reading: rel.reading,
                            meaning: rel.meaning,
                            example: rel.example,
                            exampleMeaning: rel.exampleMeaning,
                          });
                        } else {
                          setNotebookCard(c);
                        }
                      }}
                    />
                  );
                }

                return (
                  <div
                    key={card.id}
                    className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                      isMastered
                        ? "bg-white/95 border-emerald-300 shadow-sm ring-1 ring-emerald-100"
                        : "bg-white/80 border-gray-200 hover:border-purple-300 shadow-xs"
                    }`}
                  >
                    {/* Top Row: Index + Status Header */}
                    <div className="px-6 sm:px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {hasRootKanji
                            ? "Hán Tự Gốc"
                            : card.bookId?.includes("word") || card.bookId?.includes("kanji")
                            ? "Từ Vựng"
                            : "Mục Ngữ Pháp"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isFlipped && (
                          <button
                            onClick={() => setNotebookCard(card)}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all"
                          >
                            <BookMarked className="w-3.5 h-3.5" />
                            <span>Thêm vào Sổ tay</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleMastered(card.id)}
                          className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isMastered
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isMastered ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              <span>Đã thuộc</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 text-slate-400" />
                              <span>Chưa thuộc</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card Content (Front vs Back) */}
                    <div className="p-6 sm:p-8">
                      {!isFlipped ? (
                        /* ============= MẶT TRƯỚC (CHỈ HIỆN KANJI GỐC / TỪ VỰNG) ============= */
                        <div
                          onClick={() => handleToggleCardFlip(card.id)}
                          className="py-10 text-center cursor-pointer group space-y-4"
                        >
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                            Mặt trước • Hãy nhớ lại cách đọc & ý nghĩa
                          </span>

                          <div className="py-2">
                            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-japanese tracking-tight group-hover:scale-105 transition-transform duration-200">
                              {hasRootKanji ? `【${card.rootKanji?.kanji}】` : card.question}
                            </h2>
                          </div>

                          <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/80 transition-all shadow-2xs">
                            <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                            <span>Nhấn vào đây để xem cách đọc & nghĩa (Lật thẻ)</span>
                          </div>
                        </div>
                      ) : (
                        /* ============= MẶT SAU (NGHĨA + KANJI GỐC + TỪ CON THỤT LỀ) ============= */
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                          {/* Top: Word, Reading & Meaning */}
                          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div className="space-y-2">
                              {/* Dòng tiêu đề: Chữ chính (Kanji/Mẫu câu) + Cách đọc / Âm Hán-Việt */}
                              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1.5">
                                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-japanese tracking-tight">
                                  {hasRootKanji ? `【${card.rootKanji?.kanji}】` : card.question}
                                </h2>

                                {hasRootKanji && card.rootKanji?.hanViet && (
                                  <span className="text-lg sm:text-xl font-bold text-purple-700 uppercase tracking-wide">
                                    {card.rootKanji.hanViet}
                                  </span>
                                )}

                                {card.reading && card.reading !== card.question && (
                                  <span className="text-base sm:text-lg font-bold text-indigo-700 font-japanese bg-indigo-50/80 px-2.5 py-0.5 rounded-lg border border-indigo-200/60">
                                    【{card.reading}】
                                  </span>
                                )}
                              </div>

                              {/* Nghĩa hiển thị to rõ, trực quan */}
                              <p className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed">
                                {card.meaning}
                              </p>
                            </div>

                            <button
                              onClick={() => handleToggleCardFlip(card.id)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 shrink-0 ml-2"
                              title="Ẩn mặt sau"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Lật lại</span>
                            </button>
                          </div>

                          {/* 1. Âm Kun & Âm On tinh gọn (dành riêng cho Hán tự gốc) */}
                          {hasRootKanji && (
                            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
                              <div>
                                <span className="text-slate-500 font-medium">Âm Kun: </span>
                                <strong className="font-japanese text-slate-900">{card.rootKanji?.kun || "—"}</strong>
                              </div>
                              <div className="h-3 w-px bg-purple-200 hidden sm:block" />
                              <div>
                                <span className="text-slate-500 font-medium">Âm On: </span>
                                <strong className="font-japanese text-purple-700">{card.rootKanji?.on || "—"}</strong>
                              </div>
                            </div>
                          )}

                          {/* 2. Khối Câu ví dụ mẫu (nếu có câu ví dụ thực tế) */}
                          {card.example &&
                            card.example.trim() !== "" &&
                            card.example !== card.question &&
                            card.example !== card.reading && (
                              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1.5">
                                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                                  Ví dụ mẫu:
                                </span>
                                <p className="text-sm sm:text-base font-bold text-slate-900 font-japanese leading-relaxed">
                                  {card.example}
                                </p>
                                {card.exampleMeaning && card.exampleMeaning !== card.meaning && (
                                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                    {card.exampleMeaning}
                                  </p>
                                )}
                              </div>
                            )}

                          {/* 3. Lưu ý & Cấu trúc ngữ pháp (CHỈ hiện khi có nội dung thực tế, ẩn hoàn toàn câu lặp boilerplate) */}
                          {card.explanation &&
                            !card.explanation.startsWith("Từ vựng N2:") &&
                            !card.explanation.startsWith("Từ vựng Hán tự N2:") &&
                            !card.explanation.startsWith("Hán tự / Từ vựng N2:") &&
                            card.explanation.trim() !== card.meaning?.trim() && (
                              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                                  Lưu ý & Cấu trúc:
                                </span>
                                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                                  {card.explanation}
                                </p>
                              </div>
                            )}

                          {/* Cấu trúc Kanji: DANH SÁCH TỪ VỰNG LIÊN QUAN (CHILDREN THỤT LỀ) */}
                          {card.relatedWords && card.relatedWords.length > 0 && (
                            <div className="space-y-3 pt-1">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                                <CornerDownRight className="w-4 h-4 text-purple-600" />
                                <span>Các từ vựng liên quan (Cấu tạo từ chữ【{card.rootKanji?.kanji}】):</span>
                              </span>

                              {/* Danh sách con thụt lề bên trong */}
                              <div className="pl-4 sm:pl-6 border-l-2 border-purple-200 space-y-3">
                                {card.relatedWords.map((rel, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="p-4 rounded-2xl bg-slate-50/90 border border-gray-200/80 space-y-2 hover:bg-white transition-colors"
                                  >
                                    <div className="flex items-baseline space-x-2.5">
                                      <span className="text-base font-black text-slate-900 font-japanese">
                                        {rel.word}
                                      </span>
                                      <span className="text-xs font-bold text-purple-700 font-japanese">
                                        ({rel.reading})
                                      </span>
                                      <span className="text-xs font-medium text-slate-600">
                                        • {rel.meaning}
                                      </span>
                                    </div>

                                    {rel.example && (
                                      <div className="text-xs text-slate-600 font-japanese pt-1 border-t border-gray-100">
                                        <p className="font-bold text-slate-800">
                                          Ví dụ: {rel.example}
                                        </p>
                                        {rel.exampleMeaning && (
                                          <p className="text-slate-500 text-[11px] font-sans mt-0.5">
                                            "{rel.exampleMeaning}"
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ví dụ mẫu nếu là thẻ ngữ pháp */}
                          {!hasRootKanji && card.example && (
                            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                                Câu ví dụ mẫu:
                              </span>
                              <p className="text-sm sm:text-base font-bold text-slate-900 font-japanese leading-relaxed">
                                {card.example}
                              </p>
                              {card.exampleMeaning && (
                                <p className="text-xs text-slate-600 font-medium">
                                  "{card.exampleMeaning}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Unlockable Bar for Quiz */}
            <div className="sticky bottom-6 z-20 pt-4">
              <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="flex items-center space-x-2">
                    {isAllMastered ? (
                      <Unlock className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-purple-700" />
                    )}
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 2: Bài test trắc nghiệm & Check-in
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAllMastered
                      ? "Đã thuộc 100% từ vựng & chữ Hán! Bài test đã được mở khóa."
                      : `Bắt buộc lật thẻ và đánh dấu "Đã thuộc" toàn bộ (${totalItemsMastered}/${totalItemsRequired} mục) để mở khóa bài test.`}
                  </p>
                </div>

                <button
                  onClick={handleStartQuiz}
                  disabled={!isAllMastered}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                    isAllMastered
                      ? "bg-purple-700 hover:bg-purple-800 text-white active:scale-98 cursor-pointer ring-4 ring-purple-100"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <span>Bắt đầu làm bài test</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= BƯỚC 2: TEST TRẮC NGHIỆM / QUIZ ================= */
          <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
            {!isTestFinished ? (
              currentQuizCard ? (
                <div className="space-y-6">
                  {/* Top Progress & Add to Notebook */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>
                      Câu {quizIndex + 1} / {cards.length}
                    </span>
                    <button
                      onClick={() => setNotebookCard(currentQuizCard)}
                      className="inline-flex items-center space-x-1 text-purple-700 hover:text-purple-900 font-bold"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Thêm vào Sổ tay</span>
                    </button>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-700 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((quizIndex + 1) / cards.length) * 100}%` }}
                    />
                  </div>

                  {/* Question Box */}
                  <div className="p-8 sm:p-12 rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-md space-y-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {currentQuizCard.questionType === "on-kun"
                          ? "Kiểm tra âm On / Kun:"
                          : "Chọn đáp án đúng nhất:"}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-japanese leading-relaxed py-4">
                      {currentQuizCard.question}
                    </h2>

                    {/* Multiple Choice Options (Grid 2x2) */}
                    {currentQuizCard.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
                        {currentQuizCard.options.map((opt, idx) => {
                          const isSelected = selectedOption === opt;
                          const isCorrectOpt = opt === currentQuizCard.correctAnswer;

                          let btnStyle = "bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-slate-800 border-gray-200 cursor-pointer shadow-2xs hover:shadow-xs";
                          if (selectedOption !== null) {
                            if (isCorrectOpt) {
                              btnStyle = "bg-emerald-500 text-white border-emerald-500 ring-4 ring-emerald-100 font-bold shadow-md scale-[1.01] cursor-default";
                            } else if (isSelected && !isCorrectOpt) {
                              btnStyle = "bg-rose-500 text-white border-rose-500 ring-4 ring-rose-100 font-bold shadow-md cursor-default";
                            } else {
                              btnStyle = "bg-slate-100 text-slate-400 border-gray-200 opacity-40 cursor-not-allowed";
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectQuizOption(opt)}
                              disabled={isAnswering || selectedOption !== null}
                              className={`p-4 sm:p-5 rounded-2xl border text-base sm:text-lg font-japanese text-center transition-all duration-150 flex items-center justify-center space-x-2 ${btnStyle}`}
                            >
                              <span className="text-xs font-mono opacity-60 mr-1.5">
                                {["A", "B", "C", "D"][idx] || idx + 1}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Progress indicator during delay */}
                    {isAnswering && (
                      <div className="flex items-center justify-center space-x-2 pt-2 text-xs font-semibold text-purple-700 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                        <span>
                          {quizIndex < cards.length - 1
                            ? "Đang ghi nhận kết quả và chuyển câu hỏi..."
                            : "Đang hoàn tất bài test..."}
                        </span>
                      </div>
                    )}

                    {/* Answer Reveal Box */}
                    {showAnswer && (
                      <div className="p-6 rounded-2xl bg-purple-50/70 border border-purple-100 text-left space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-xs font-bold text-purple-700 uppercase">Đáp án:</span>
                          <span className="text-lg font-bold text-slate-900 font-japanese">
                            {currentQuizCard.reading ? `${currentQuizCard.reading} (${currentQuizCard.correctAnswer})` : currentQuizCard.correctAnswer}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-purple-700 uppercase">Ý nghĩa:</span>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{currentQuizCard.meaning}</p>
                        </div>
                        {currentQuizCard.explanation && (
                          <p className="text-xs text-slate-600 leading-relaxed border-t border-purple-100 pt-2">
                            {currentQuizCard.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for SRS mode (or fast-forward) */}
                  <div className="pt-2">
                    {mode === "section" ? (
                      isAnswering && (
                        <div className="text-center">
                          <button
                            onClick={() => {
                              if (timerRef.current) {
                                clearTimeout(timerRef.current);
                                timerRef.current = null;
                              }
                              if (quizIndex < cards.length - 1) {
                                setQuizIndex((prev) => prev + 1);
                                setSelectedOption(null);
                                setShowAnswer(false);
                                setIsAnswering(false);
                              } else {
                                setIsAnswering(false);
                                finishQuiz(selectedOption === currentQuizCard.correctAnswer ? correctCount + 1 : correctCount);
                              }
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                          >
                            Chuyển câu tiếp theo ngay &rarr;
                          </button>
                        </div>
                      )
                    ) : (
                      /* Mode SRS Review */
                      !showAnswer ? (
                        <button
                          onClick={() => setShowAnswer(true)}
                          className="w-full py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 border border-gray-200 rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Eye className="w-5 h-5 text-slate-600" />
                          <span>Xem đáp án</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handleSrsAnswer(false)}
                            disabled={isAnswering}
                            className="py-4 text-base font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <RotateCcw className="w-5 h-5" />
                            <span>Quên (Sai)</span>
                          </button>
                          <button
                            onClick={() => handleSrsAnswer(true)}
                            disabled={isAnswering}
                            className="py-4 text-base font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Check className="w-5 h-5" />
                            <span>Nhớ (Đúng)</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null
            ) : (
              /* ================= MÀN HÌNH KẾT QUẢ TEST (COMPLETION SCREEN) ================= */
              <div className="p-6 sm:p-10 rounded-3xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl space-y-8 animate-in zoom-in-95 duration-200 text-center">
                {/* Icon & Title */}
                <div className="space-y-4">
                  <div className={`w-20 h-20 mx-auto rounded-3xl border flex items-center justify-center shadow-inner ${
                    correctCount === cards.length 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 ring-8 ring-emerald-50" 
                      : "bg-rose-50 border-rose-200 text-rose-600 ring-8 ring-rose-50"
                  }`}>
                    {correctCount === cards.length ? (
                      <Award className="w-10 h-10 animate-bounce" />
                    ) : (
                      <RotateCcw className="w-10 h-10" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {correctCount === cards.length
                        ? `🎉 Xuất sắc! Bạn đã đúng ${correctCount}/${cards.length} câu (100%)`
                        : `Kết quả: Bạn đã đúng ${correctCount}/${cards.length} câu`}
                    </h2>
                    
                    {correctCount === cards.length ? (
                      <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                        Chúc mừng bạn đã vượt qua bài test trắc nghiệm với điểm số tuyệt đối! Hãy nhấn nút bên dưới để hoàn thành bài học và quay lại giáo trình.
                      </p>
                    ) : (
                      <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs sm:text-sm font-semibold max-w-md mx-auto flex items-center justify-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Bạn cần thuộc và làm đúng 100% để hoàn thành bài này.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Stats Cards */}
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-center">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Số câu đúng</span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-800 mt-1 font-mono">
                      {correctCount}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-center">
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Số câu sai</span>
                    <div className="text-3xl sm:text-4xl font-black text-rose-800 mt-1 font-mono">
                      {incorrectCount}
                    </div>
                  </div>
                </div>

                {/* Danh sách các câu làm sai để rút kinh nghiệm */}
                {wrongAnswers.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-gray-100 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-5 h-5 text-rose-500" />
                        <h3 className="text-base font-bold text-slate-900">
                          Xem lại {wrongAnswers.length} câu làm sai để rút kinh nghiệm:
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-slate-400">
                        Học từ lỗi sai giúp nhớ lâu hơn
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {wrongAnswers.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-slate-50/90 border border-rose-200/90 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {item.card.questionType === "on-kun" ? "Âm On/Kun" : "Trắc nghiệm"}
                              </span>
                            </div>

                            <button
                              onClick={() => setNotebookCard(item.card)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                            >
                              <BookMarked className="w-3.5 h-3.5" />
                              <span>Lưu vào Sổ tay</span>
                            </button>
                          </div>

                          <div>
                            <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-japanese">
                              {item.card.question}
                            </h4>
                            {item.card.reading && (
                              <p className="text-xs text-slate-400 font-japanese mt-0.5 font-medium">
                                Cách đọc: 【{item.card.reading}】
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                              <span className="text-[11px] font-bold text-rose-600 block uppercase">
                                Đáp án bạn đã chọn (Sai):
                              </span>
                              <span className="text-sm font-bold text-rose-900 font-japanese mt-0.5 block">
                                {item.userSelected}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="text-[11px] font-bold text-emerald-600 block uppercase">
                                Đáp án chính xác:
                              </span>
                              <span className="text-sm font-bold text-emerald-900 font-japanese mt-0.5 block">
                                {item.card.correctAnswer}
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-white border border-gray-200/80 space-y-1 text-xs">
                            <p className="font-semibold text-slate-700">
                              <span className="text-slate-400 font-normal">Ý nghĩa: </span>
                              {item.card.meaning}
                            </p>
                            {item.card.explanation && (
                              <p className="text-slate-500 leading-relaxed pt-1 border-t border-gray-100">
                                {item.card.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {correctCount === cards.length ? (
                    <>
                      <button
                        onClick={handleConfirmCompleteAndExit}
                        className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-98 cursor-pointer ring-4 ring-emerald-100"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        <span>Hoàn thành & Quay lại giáo trình</span>
                      </button>

                      {parentBook && (
                        <button
                          onClick={() => {
                            if (mode === "section" && section) {
                              markSectionCompleted(section.id);
                            }
                            router.push(`/book/${parentBook.id}`);
                          }}
                          className="w-full sm:w-auto px-6 py-4 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-2xl transition-all border border-purple-200 cursor-pointer"
                        >
                          Xem toàn bộ Giáo trình {parentBook.title}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleRestartQuiz}
                        className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-2xl shadow-md transition-all ring-4 ring-purple-100 flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Làm lại bài Test</span>
                      </button>

                      <button
                        onClick={handleBackToFlashcards}
                        className="w-full sm:w-auto px-6 py-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all border border-gray-200 cursor-pointer"
                      >
                        Ôn lại Flashcard
                      </button>

                      <button
                        onClick={onBackToDashboard}
                        className="w-full sm:w-auto px-6 py-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      >
                        Thoát ra ngoài
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add To Notebook Modal */}
      <AddToNotebookModal
        card={notebookCard}
        isOpen={notebookCard !== null}
        onClose={() => setNotebookCard(null)}
      />
    </div>
  );
};
