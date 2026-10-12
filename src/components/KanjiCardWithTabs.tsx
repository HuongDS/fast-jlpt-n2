"use client";

import React, { useState } from "react";
import { Flashcard, RelatedWord } from "@/data/books";
import { 
  RotateCw, 
  CheckCircle2, 
  Circle, 
  BookMarked, 
  BookOpen, 
  Layers, 
  CornerDownRight, 
  Eye, 
  Sparkles 
} from "lucide-react";

interface KanjiCardWithTabsProps {
  card: Flashcard;
  index: number;
  masteredFlashcardIds: Record<string, boolean>;
  onToggleMastered: (id: string) => void;
  onAddToNotebook: (card: Flashcard, relWord?: RelatedWord) => void;
}

export const KanjiCardWithTabs: React.FC<KanjiCardWithTabsProps> = ({
  card,
  index,
  masteredFlashcardIds,
  onToggleMastered,
  onAddToNotebook,
}) => {
  const [activeTab, setActiveTab] = useState<"root" | "related">("root");
  const [isRootFlipped, setIsRootFlipped] = useState(false);
  const [flippedRelated, setFlippedRelated] = useState<Record<string, boolean>>({});

  const rootKanji = card.rootKanji;
  const relatedWords = card.relatedWords || [];

  // Check if root Kanji is mastered
  const isRootMastered = !!masteredFlashcardIds[card.id];

  // Count how many related words are mastered
  const masteredRelatedCount = relatedWords.filter((r) => !!masteredFlashcardIds[r.id]).length;
  const isCardFullyMastered = isRootMastered && (relatedWords.length === 0 || masteredRelatedCount === relatedWords.length);

  const toggleRelatedFlip = (relId: string) => {
    setFlippedRelated((prev) => ({
      ...prev,
      [relId]: !prev[relId],
    }));
  };

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
        isCardFullyMastered
          ? "bg-white/95 border-emerald-300 shadow-sm ring-1 ring-emerald-100"
          : "bg-white/80 border-gray-200 hover:border-purple-300 shadow-xs"
      }`}
    >
      {/* Top Header Row */}
      <div className="px-6 sm:px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Chữ Hán: 【{rootKanji?.kanji || card.question}】 {rootKanji?.hanViet}
          </span>
        </div>

        {/* Mastered Badge for whole Kanji unit */}
        <div className="flex items-center space-x-2">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            isCardFullyMastered
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-gray-200"
          }`}>
            Đã thuộc: {(isRootMastered ? 1 : 0) + masteredRelatedCount} / {1 + relatedWords.length}
          </span>
        </div>
      </div>

      {/* Tabs Segmented Control */}
      <div className="px-6 sm:px-8 pt-4 pb-2 border-b border-gray-100 bg-white/40">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-gray-200/60">
          <button
            type="button"
            onClick={() => setActiveTab("root")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "root"
                ? "bg-white text-purple-800 shadow-xs ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🈴 Hán tự gốc</span>
            {isRootMastered && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("related")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "related"
                ? "bg-white text-purple-800 shadow-xs ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📚 Từ vựng liên quan</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "related" ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-600"
            }`}>
              {masteredRelatedCount}/{relatedWords.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 sm:p-8">
        {activeTab === "root" ? (
          /* ================= TAB 1: HÁN TỰ GỐC ================= */
          <div className="space-y-6 animate-in fade-in duration-200">
            {!isRootFlipped ? (
              /* Mặt trước */
              <div
                onClick={() => setIsRootFlipped(true)}
                className="py-12 text-center cursor-pointer group space-y-4"
              >
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  Mặt trước • Hãy nhớ lại nghĩa và cách đọc của Hán tự
                </span>

                <div className="py-2">
                  <h2 className="text-5xl sm:text-6xl font-black text-slate-900 font-japanese tracking-tight group-hover:scale-105 transition-transform duration-200">
                    【{rootKanji?.kanji || card.question}】
                  </h2>
                </div>

                <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/80 transition-all shadow-2xs">
                  <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  <span>Nhấn vào đây để xem cách đọc & nghĩa (Lật thẻ)</span>
                </div>
              </div>
            ) : (
              /* Mặt sau */
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Title & Action Row */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-baseline space-x-3">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-japanese">
                        【{rootKanji?.kanji}】
                      </h2>
                      <span className="text-xl font-bold text-purple-800">
                        {rootKanji?.hanViet}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mt-1">
                      {card.meaning}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onAddToNotebook(card)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Lưu sổ tay</span>
                    </button>

                    <button
                      onClick={() => onToggleMastered(card.id)}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isRootMastered
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isRootMastered ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Đã thuộc Hán tự</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-slate-400" />
                          <span>Chưa thuộc</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsRootFlipped(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
                      title="Lật lại mặt trước"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* KHỐI PHÂN TÍCH ÂM ĐỌC & BỘ THỦ */}
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Âm Đọc & Bộ Thủ:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Âm Kun:</span>
                      <strong className="text-sm font-japanese text-slate-900 block mt-0.5">
                        {rootKanji?.kun || "-"}
                      </strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Âm On:</span>
                      <strong className="text-sm font-japanese text-purple-700 block mt-0.5">
                        {rootKanji?.on || "-"}
                      </strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Bộ thủ:</span>
                      <strong className="text-sm font-japanese text-slate-800 block mt-0.5">
                        {rootKanji?.radical || "Chưa xác định"}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {card.explanation}
                  </p>
                </div>

                {/* Quick Switch to Tab 2 CTA */}
                {relatedWords.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200/80 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Chuyển sang Tab 2</span> để học{" "}
                      <span className="font-bold text-purple-700">{relatedWords.length} từ vựng liên quan</span> của chữ Hán này.
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("related")}
                      className="px-3.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all border border-purple-200"
                    >
                      Học từ ghép →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= TAB 2: TỪ VỰNG LIÊN QUAN (DANH SÁCH FLIP CARDS) ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 text-xs font-bold text-slate-500">
              <span>Danh sách các từ ghép cấu tạo từ 【{rootKanji?.kanji}】</span>
              <span className="text-purple-700">
                Đã thuộc {masteredRelatedCount} / {relatedWords.length} từ
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {relatedWords.map((rel, rIdx) => {
                const isFlipped = !!flippedRelated[rel.id];
                const isRelMastered = !!masteredFlashcardIds[rel.id];

                return (
                  <div
                    key={rel.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isRelMastered
                        ? "bg-white border-emerald-300 shadow-2xs ring-1 ring-emerald-100"
                        : "bg-slate-50/70 border-gray-200 hover:border-purple-200"
                    }`}
                  >
                    {!isFlipped ? (
                      /* Mặt trước từ vựng */
                      <div
                        onClick={() => toggleRelatedFlip(rel.id)}
                        className="p-5 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                            {rIdx + 1}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-japanese group-hover:text-purple-800 transition-colors">
                            {rel.word}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 group-hover:border-purple-300 text-xs font-bold text-purple-700 transition-all shadow-2xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lật xem nghĩa</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mặt sau từ vựng */
                      <div className="p-5 space-y-3.5 bg-white animate-in fade-in zoom-in-95 duration-150">
                        {/* Word Title & Action Bar */}
                        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-baseline space-x-2.5">
                              <span className="text-xl sm:text-2xl font-black text-slate-900 font-japanese">
                                {rel.word}
                              </span>
                              <span className="text-xs font-bold text-purple-700 font-japanese">
                                【{rel.reading}】
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                              {rel.meaning}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onAddToNotebook(card, rel)}
                              className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Thêm từ này vào sổ tay"
                            >
                              <BookMarked className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onToggleMastered(rel.id)}
                              className={`inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                                isRelMastered
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {isRelMastered ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                  <span>Đã thuộc</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Chưa thuộc</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => toggleRelatedFlip(rel.id)}
                              className="text-xs text-slate-400 hover:text-slate-600 p-1"
                              title="Lật lại"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Example sentence */}
                        {rel.example && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-1 text-xs">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">
                              Ví dụ mẫu:
                            </span>
                            <p className="font-bold text-slate-900 font-japanese">
                              {rel.example}
                            </p>
                            {rel.exampleMeaning && (
                              <p className="text-slate-600 text-[11px]">
                                "{rel.exampleMeaning}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
