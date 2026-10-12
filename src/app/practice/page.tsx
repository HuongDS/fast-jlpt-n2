"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Check, RotateCcw, Plus, Eye, Key, Languages, Loader2, Filter, BookOpen, BookMarked, CornerDownRight, Trash2, Play } from "lucide-react";
import { BOOKS_DATA, getAllFlashcards, Flashcard } from "@/data/books";
import { useProgressStore, NotebookItem } from "@/store/useProgressStore";
import { gradeTranslationWithAI, generatePracticeSentenceWithAI, AIEvaluationResult } from "@/utils/aiGrading";
import { AiSettingsModal } from "@/components/AiSettingsModal";
import { MaziiLookup } from "@/components/MaziiLookup";
import { Toast } from "@/components/Toast";
import { FastJlptLogoMark } from "@/components/FastJlptLogo";

interface PracticeItem {
  id: string;
  sourceType: "lesson" | "notebook";
  word: string;
  reading?: string;
  meaning: string;
  exampleVi: string;
  exampleJa: string;
  explanation?: string;
  rootKanji?: {
    kanji: string;
    hanViet: string;
    kun: string;
    on: string;
  };
  relatedWords?: Array<{
    word: string;
    reading: string;
    meaning: string;
    example?: string;
    exampleMeaning?: string;
  }>;
}

export default function PracticePage() {
  const allCards = getAllFlashcards();
  const notebooks = useProgressStore((state) => state.notebooks);
  const notebookItems = useProgressStore((state) => state.notebookItems);
  const aiApiKey = useProgressStore((state) => state.aiApiKey);
  const aiProvider = useProgressStore((state) => state.aiProvider);
  const customPracticeSentences = useProgressStore((state) => state.customPracticeSentences);
  const addCustomPracticeSentence = useProgressStore((state) => state.addCustomPracticeSentence);
  const deleteCustomPracticeSentence = useProgressStore((state) => state.deleteCustomPracticeSentence);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  // Source selection state
  const [selectedSource, setSelectedSource] = useState<string>("all-lessons");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);
  const [evalResult, setEvalResult] = useState<AIEvaluationResult | null>(null);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);

  // Câu đề bài bổ sung do AI tạo đang được chọn để luyện tập (nếu có)
  const [activeCustomSentence, setActiveCustomSentence] = useState<{
    id?: string;
    vi: string;
    ja: string;
    hint?: string;
  } | null>(null);

  // Compute practice items based on selected source
  const practiceItems: PracticeItem[] = useMemo(() => {
    // 1. Toàn bộ giáo trình
    if (selectedSource === "all-lessons") {
      return allCards
        .filter((c) => (c.example && c.exampleMeaning) || (c.question && c.meaning))
        .map((c) => ({
          id: c.id,
          sourceType: "lesson",
          word: c.rootKanji?.kanji || c.question,
          reading: c.reading || (c.question !== c.correctAnswer ? c.correctAnswer : undefined),
          meaning: c.meaning,
          exampleVi: c.exampleMeaning || c.meaning,
          exampleJa: c.example || c.question,
          explanation: c.explanation,
          rootKanji: c.rootKanji,
          relatedWords: c.relatedWords,
        }));
    }

    // 2. Toàn bộ Sổ tay cá nhân
    if (selectedSource === "all-notebooks") {
      return notebookItems
        .filter((item) => (item.exampleJa && item.exampleVi) || (item.word && item.meaning))
        .map((item) => {
          const resolvedWord =
            item.word === item.reading && item.exampleJa && item.exampleJa !== item.reading
              ? item.exampleJa
              : item.word;
          return {
            id: item.id,
            sourceType: "notebook",
            word: resolvedWord,
            reading: item.reading,
            meaning: item.meaning,
            exampleVi: item.exampleVi || item.meaning,
            exampleJa: item.exampleJa || resolvedWord,
            explanation: item.explanation,
          };
        });
    }

    // 3. Theo từng Sổ tay cụ thể
    if (selectedSource.startsWith("notebook-")) {
      const nbId = selectedSource.replace("notebook-", "");
      return notebookItems
        .filter((item) => item.notebookId === nbId && ((item.exampleJa && item.exampleVi) || (item.word && item.meaning)))
        .map((item) => {
          const resolvedWord =
            item.word === item.reading && item.exampleJa && item.exampleJa !== item.reading
              ? item.exampleJa
              : item.word;
          return {
            id: item.id,
            sourceType: "notebook",
            word: resolvedWord,
            reading: item.reading,
            meaning: item.meaning,
            exampleVi: item.exampleVi || item.meaning,
            exampleJa: item.exampleJa || resolvedWord,
            explanation: item.explanation,
          };
        });
    }

    // 4. Theo từng bài học cụ thể
    if (selectedSource.startsWith("section-")) {
      const secId = selectedSource.replace("section-", "");
      return allCards
        .filter((c) => c.sectionId === secId && ((c.example && c.exampleMeaning) || (c.question && c.meaning)))
        .map((c) => ({
          id: c.id,
          sourceType: "lesson",
          word: c.rootKanji?.kanji || c.question,
          reading: c.reading || (c.question !== c.correctAnswer ? c.correctAnswer : undefined),
          meaning: c.meaning,
          exampleVi: c.exampleMeaning || c.meaning,
          exampleJa: c.example || c.question,
          explanation: c.explanation,
          rootKanji: c.rootKanji,
          relatedWords: c.relatedWords,
        }));
    }

    return [];
  }, [selectedSource, allCards, notebookItems]);

  const currentItem = practiceItems[currentIndex] || practiceItems[0];

  // Tự động nhận diện Chế độ Dịch câu đầy đủ (Sentence Mode) hay Chuyển từ vựng / Hán tự (Word Mode)
  const isSentenceMode = useMemo(() => {
    if (!currentItem) return true;
    const ja = currentItem.exampleJa || "";
    const vi = currentItem.exampleVi || "";
    const hasSentencePunctuation = /[。！？]/.test(ja);
    const isDistinctAndLong = ja !== currentItem.word && ja.length > 7;
    const isLongVi = vi.length > 25 || /[.?!]/.test(vi);

    return hasSentencePunctuation || (isDistinctAndLong && isLongVi);
  }, [currentItem]);

  const handleSourceChange = (newSource: string) => {
    setSelectedSource(newSource);
    setCurrentIndex(0);
    setUserInput("");
    setEvalResult(null);
    setIsShowingOriginal(false);
    setActiveCustomSentence(null);
  };

  const itemKey = currentItem?.word || "";
  const extraList = customPracticeSentences[itemKey] || [];

  const handleGrade = async () => {
    if (!currentItem || !userInput.trim()) {
      setToastMessage(
        activeCustomSentence || isSentenceMode
          ? "Vui lòng nhập câu dịch tiếng Nhật của bạn!"
          : "Vui lòng nhập từ vựng tiếng Nhật của bạn!"
      );
      return;
    }

    setIsGrading(true);
    setEvalResult(null);

    const viPrompt = activeCustomSentence ? activeCustomSentence.vi : currentItem.exampleVi;
    const jaRef = activeCustomSentence ? activeCustomSentence.ja : currentItem.exampleJa;

    const result = await gradeTranslationWithAI({
      vietnamesePrompt: viPrompt,
      japaneseReference: jaRef,
      userTranslation: userInput,
      readingReference: currentItem.reading,
      isWordMode: !activeCustomSentence && !isSentenceMode,
      apiKey: aiApiKey,
      provider: aiProvider,
    });

    setEvalResult(result);
    setIsShowingOriginal(true);
    setIsGrading(false);
  };

  const handleNextCard = () => {
    setCurrentIndex((prev) => (prev + 1 < practiceItems.length ? prev + 1 : 0));
    setUserInput("");
    setEvalResult(null);
    setIsShowingOriginal(false);
    setActiveCustomSentence(null);
  };

  // Dùng AI sinh ra câu tiếng Việt thực tế kèm câu tiếng Nhật chuẩn N2
  const handleAddExtraPractice = async () => {
    if (!currentItem) return;

    setIsGeneratingExtra(true);
    try {
      const generated = await generatePracticeSentenceWithAI({
        targetWord: currentItem.word,
        reading: currentItem.reading,
        meaning: currentItem.meaning,
        explanation: currentItem.explanation,
        apiKey: aiApiKey,
        provider: aiProvider,
      });

      addCustomPracticeSentence(itemKey, generated);

      // Tự động chuyển đề vừa tạo lên ô luyện tập để người dùng làm bài ngay
      setActiveCustomSentence(generated);
      setUserInput("");
      setEvalResult(null);
      setIsShowingOriginal(false);

      setToastMessage("AI đã tạo xong 1 đề câu tiếng Việt mới! Bạn có thể luyện dịch ngay.");
    } catch (error) {
      console.error("Lỗi khi tạo đề câu:", error);
      setToastMessage("Có lỗi xảy ra khi tạo đề, vui lòng thử lại!");
    } finally {
      setIsGeneratingExtra(false);
    }
  };

  // Chọn 1 đề bổ sung từ danh sách để luyện tập
  const handleSelectExtraSentence = (sentence: { id?: string; vi: string; ja: string; hint?: string }) => {
    setActiveCustomSentence(sentence);
    setUserInput("");
    setEvalResult(null);
    setIsShowingOriginal(false);
    setToastMessage("Đã chọn đề này! Hãy viết bản dịch tiếng Nhật của bạn.");
  };

  // Quay lại câu gốc của bài học
  const handleResetToOriginal = () => {
    setActiveCustomSentence(null);
    setUserInput("");
    setEvalResult(null);
    setIsShowingOriginal(false);
    setToastMessage("Đã chuyển về câu gốc của bài học!");
  };

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

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAiSettingsOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{aiApiKey ? "AI: Đã có Key" : "Cài đặt AI Key"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        {/* Title Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-300/80 mb-1">
            <Languages className="w-3.5 h-3.5" />
            <span>Chế độ Luyện dịch chuyên sâu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Luyện Dịch Việt → Nhật & Chấm Điểm AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Tự chọn nguồn từ vựng muốn luyện, gõ bản dịch tiếng Nhật và nhận đánh giá từ AI.
          </p>
        </div>

        {/* 1. BỘ LỌC CHỌN NGUỒN TỪ VỰNG (Dropdown Filter) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>Nguồn từ vựng muốn luyện:</span>
            </label>
            <span className="text-xs font-semibold text-purple-700 font-mono">
              {practiceItems.length > 0 ? `Câu ${currentIndex + 1} / ${practiceItems.length}` : "0 câu"}
            </span>
          </div>

          <select
            value={selectedSource}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="w-full text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl border border-gray-200 bg-slate-50/70 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-slate-800"
          >
            {/* Nhóm 1: Tổng hợp */}
            <optgroup label="Tất cả">
              <option value="all-lessons">Toàn bộ giáo trình (Tất cả bài học)</option>
              <option value="all-notebooks">Toàn bộ Sổ tay cá nhân ({notebookItems.length} từ)</option>
            </optgroup>

            {/* Nhóm 2: Theo từng Sổ tay */}
            {notebooks.length > 0 && (
              <optgroup label="Theo từng Sổ tay cá nhân">
                {notebooks.map((nb) => {
                  const nbCount = notebookItems.filter((i) => i.notebookId === nb.id).length;
                  return (
                    <option key={nb.id} value={`notebook-${nb.id}`}>
                      Sổ tay: {nb.title} ({nbCount} từ)
                    </option>
                  );
                })}
              </optgroup>
            )}

            {/* Nhóm 3: Theo từng bài học giáo trình */}
            <optgroup label="Theo từng bài học giáo trình">
              {BOOKS_DATA.flatMap((b) =>
                b.sections.map((s) => (
                  <option key={s.id} value={`section-${s.id}`}>
                    {b.title} • {s.title}: {s.subtitle}
                  </option>
                ))
              )}
            </optgroup>
          </select>
        </div>

        {practiceItems.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-gray-200 text-center space-y-3">
            <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Nguồn này chưa có từ vựng hoặc câu mẫu nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy chọn nguồn khác hoặc thêm từ vựng từ bài học vào Sổ tay để bắt đầu luyện dịch!
            </p>
          </div>
        ) : (
          <>
            {/* Target Word Badge */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Từ vựng mục tiêu:</span>
                <span className="text-lg font-black text-slate-900 font-japanese">
                  {currentItem?.word}
                </span>
                {currentItem?.reading && currentItem.reading !== currentItem.word && (
                  <span className="text-xs font-bold text-slate-500 font-japanese bg-slate-100 px-2 py-0.5 rounded-md">
                    【{currentItem.reading}】
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isSentenceMode
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {isSentenceMode ? "Luyện dịch câu" : "Chuyển từ vựng / Hán tự"}
                </span>
              </div>

              <button
                onClick={handleNextCard}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 shrink-0"
              >
                Đổi câu khác →
              </button>
            </div>

            {/* 2. Prompt Box (Màu vàng nhạt) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-amber-50/80 border-2 border-amber-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-widest block">
                    {activeCustomSentence
                      ? "CÂU TIẾNG VIỆT MỚI TỪ AI (HÃY DỊCH SANG TIẾNG NHẬT):"
                      : isSentenceMode
                      ? "CÂU MẪU CẦN DỊCH SANG TIẾNG NHẬT:"
                      : "Ý NGHĨA / TỪ CẦN CHUYỂN SANG TIẾNG NHẬT:"}
                  </span>
                  {activeCustomSentence && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      Đề câu AI tạo
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {activeCustomSentence ? (
                    <button
                      onClick={handleResetToOriginal}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                    >
                      ← Quay lại câu gốc của bài
                    </button>
                  ) : (
                    !isSentenceMode && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-md">
                        Chấp nhận Kanji hoặc Hiragana
                      </span>
                    )
                  )}
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                "{activeCustomSentence ? activeCustomSentence.vi : currentItem?.exampleVi}"
              </p>
              {activeCustomSentence?.hint && (
                <p className="text-xs text-amber-900/80 font-medium pt-0.5">
                  💡 {activeCustomSentence.hint}
                </p>
              )}
            </div>

            {/* 3. User Input Box */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {activeCustomSentence || isSentenceMode
                  ? "Bản dịch tiếng Nhật của bạn:"
                  : "Từ vựng / Cách viết tiếng Nhật của bạn:"}
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={activeCustomSentence || isSentenceMode ? 3 : 2}
                placeholder={
                  activeCustomSentence || isSentenceMode
                    ? "Nhập câu dịch tiếng Nhật vào đây..."
                    : "Nhập Kanji hoặc Hiragana (VD: 安静な hoặc あんせいな)..."
                }
                className="w-full text-base font-japanese p-4 rounded-2xl border border-gray-200 bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all shadow-2xs leading-relaxed"
              />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={handleAddExtraPractice}
                  disabled={isGeneratingExtra}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-98 rounded-xl border border-purple-200 shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isGeneratingExtra ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span>AI đang soạn câu tiếng Việt mới...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Dùng AI tạo thêm câu tiếng Việt để đặt câu</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleGrade}
                  disabled={isGrading}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 rounded-xl shadow-sm transition-all"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>AI đang chấm điểm...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Kiểm tra & Chấm AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Results Section (Box màu xanh lá + Phân tích chi tiết duy nhất không lặp text) */}
            {isShowingOriginal && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
                {/* Box màu xanh lá: CÂU MẪU / TỪ VỰNG TIẾNG NHẬT GỐC */}
                <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50/80 border-2 border-emerald-200/90 shadow-sm space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block">
                    {activeCustomSentence || isSentenceMode
                      ? "CÂU MẪU TIẾNG NHẬT CHUẨN:"
                      : "TỪ VỰNG & CÁCH VIẾT TIẾNG NHẬT GỐC:"}
                  </span>
                  <div className="flex items-baseline space-x-3 flex-wrap">
                    <p className="text-lg sm:text-xl font-bold text-emerald-950 font-japanese leading-relaxed">
                      {activeCustomSentence ? activeCustomSentence.ja : currentItem?.exampleJa}
                    </p>
                    {!activeCustomSentence && currentItem?.reading && currentItem.reading !== currentItem.exampleJa && (
                      <span className="text-base font-bold text-emerald-700 font-japanese">
                        【{currentItem.reading}】
                      </span>
                    )}
                  </div>
                </div>

                {/* Khu vực DUY NHẤT: PHÂN TÍCH CHI TIẾT (Không trùng lặp!) */}
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Phân tích chi tiết từ vựng & Hán tự:
                  </span>

                  {currentItem.rootKanji ? (
                    <div className="text-xs text-slate-800 space-y-1.5">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-base font-black text-indigo-950 font-japanese">
                          【{currentItem.rootKanji.kanji}】{currentItem.rootKanji.hanViet}
                        </span>
                        <span className="text-slate-500">
                          (Kun: <strong className="font-japanese text-slate-800">{currentItem.rootKanji.kun}</strong>,
                          On: <strong className="font-japanese text-purple-700">{currentItem.rootKanji.on}</strong>)
                        </span>
                      </div>
                    </div>
                  ) : (
                    currentItem.explanation && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {currentItem.explanation}
                      </p>
                    )
                  )}

                  {/* Từ vựng liên quan nếu có */}
                  {currentItem.relatedWords && currentItem.relatedWords.length > 0 && (
                    <div className="pt-2 border-t border-indigo-200/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-indigo-900 block">
                        Các từ vựng liên quan:
                      </span>
                      <div className="space-y-1">
                        {currentItem.relatedWords.map((rel, rIdx) => (
                          <div key={rIdx} className="text-xs text-slate-700 flex items-baseline space-x-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-bold font-japanese text-slate-900">{rel.word}</span>
                            <span className="text-purple-700 font-japanese text-[11px]">({rel.reading})</span>
                            <span className="text-slate-500">• {rel.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Grading Evaluation Card */}
                {evalResult && (
                  <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-purple-700" />
                        <span className="text-sm font-bold text-slate-900">
                          Đánh giá từ AI ({evalResult.source})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400 font-medium">Điểm:</span>
                        <span className={`text-xl font-black font-mono px-2.5 py-0.5 rounded-lg ${
                          evalResult.score >= 7 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {evalResult.score} / 10
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">Nhận xét chi tiết:</span>
                      <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-gray-100">
                        {evalResult.feedback}
                      </p>
                    </div>

                    {evalResult.suggestion && (
                      <div className="space-y-1 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">Gợi ý cách diễn đạt tự nhiên hơn:</span>
                        <p className="leading-relaxed font-japanese text-indigo-900 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 font-semibold">
                          {evalResult.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Card Button */}
                <div className="pt-2 text-center">
                  <button
                    onClick={handleNextCard}
                    className="px-8 py-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
                  >
                    Tiếp tục câu tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* Extra Saved Practice Sentences */}
            {extraList.length > 0 && (
              <div className="p-5 rounded-3xl bg-white border border-gray-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Các đề câu tiếng Việt đã tạo cho từ này ({extraList.length}):
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bấm "Luyện đề này" để đặt câu ngay
                  </span>
                </div>

                <div className="space-y-2.5">
                  {extraList.map((ex) => {
                    const isCurrentActive = activeCustomSentence?.vi === ex.vi;
                    return (
                      <div
                        key={ex.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                          isCurrentActive
                            ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-100"
                            : "bg-slate-50 border-gray-200/80 hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                              "{ex.vi}"
                            </p>
                            {ex.hint && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                💡 {ex.hint}
                              </p>
                            )}
                            {isShowingOriginal && (
                              <p className="text-xs font-bold text-emerald-800 font-japanese pt-0.5">
                                → Câu mẫu tiếng Nhật: {ex.ja}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => handleSelectExtraSentence(ex)}
                              className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isCurrentActive
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-white hover:bg-purple-100 text-purple-700 border border-purple-200/80"
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isCurrentActive ? "Đang luyện" : "Luyện đề này"}</span>
                            </button>

                            <button
                              onClick={() => deleteCustomPracticeSentence(itemKey, ex.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa đề câu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Settings Modal */}
      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />

      {/* Toast */}
      <Toast />

      {/* Mazii Global Lookup */}
      <MaziiLookup />
    </main>
  );
}
