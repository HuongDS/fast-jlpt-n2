"use client";

import React, { useState } from "react";
import { Flashcard } from "@/data/books";
import { useProgressStore } from "@/store/useProgressStore";
import { X, BookMarked, Check, Plus, AlertCircle } from "lucide-react";

interface AddToNotebookModalProps {
  card: Flashcard | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToNotebookModal: React.FC<AddToNotebookModalProps> = ({
  card,
  isOpen,
  onClose,
}) => {
  const notebooks = useProgressStore((state) => state.notebooks);
  const activeNotebookId = useProgressStore((state) => state.activeNotebookId);
  const addWordToNotebook = useProgressStore((state) => state.addWordToNotebook);
  const createNotebook = useProgressStore((state) => state.createNotebook);

  const [selectedNotebookId, setSelectedNotebookId] = useState(activeNotebookId);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ status: "idle" | "success" | "duplicate"; message: string }>({
    status: "idle",
    message: "",
  });

  if (!isOpen || !card) return null;

  const handleSave = () => {
    let targetNbId = selectedNotebookId;
    if (isCreatingNew && newNotebookName.trim()) {
      targetNbId = createNotebook(newNotebookName.trim());
    }

    const exampleJa = card.example || card.question;
    const exampleVi = card.exampleMeaning || card.meaning;

    const res = addWordToNotebook({
      notebookId: targetNbId,
      word: card.rootKanji?.kanji || card.question,
      reading: card.reading,
      meaning: card.meaning,
      explanation: card.explanation,
      exampleJa,
      exampleVi,
    });

    if (res.success) {
      setFeedbackStatus({ status: "success", message: res.message });
      setTimeout(() => {
        setFeedbackStatus({ status: "idle", message: "" });
        onClose();
      }, 900);
    } else {
      setFeedbackStatus({ status: "duplicate", message: res.message });
      setTimeout(() => {
        setFeedbackStatus({ status: "idle", message: "" });
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200/90 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <BookMarked className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Thêm vào Sổ tay cá nhân</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Word Info Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-200/80 space-y-1.5">
          <div className="flex items-baseline space-x-2">
            <span className="font-bold text-slate-900 text-base font-japanese">
              {card.rootKanji?.kanji || card.question}
            </span>
            {card.reading && card.reading !== (card.rootKanji?.kanji || card.question) && (
              <span className="text-xs text-slate-500 font-japanese">({card.reading})</span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium">{card.meaning}</p>
          {card.example && (
            <div className="pt-1.5 border-t border-gray-200/60 mt-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Câu mẫu: </span>
              <span className="font-japanese text-slate-800">{card.example}</span>
              {card.exampleMeaning && <p className="text-slate-500 mt-0.5">"{card.exampleMeaning}"</p>}
            </div>
          )}
        </div>

        {/* Notebook Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Chọn Sổ tay muốn lưu:
          </label>

          {!isCreatingNew ? (
            <div className="space-y-2">
              <select
                value={selectedNotebookId}
                onChange={(e) => setSelectedNotebookId(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id}>
                    {nb.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo sổ tay mới</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="Nhập tên sổ tay mới..."
                autoFocus
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
              />

              {isCreatingNew && newNotebookName.trim() && notebooks.some((nb) => nb.title.trim().toLowerCase() === newNotebookName.trim().toLowerCase()) && (
                <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 animate-in fade-in">
                  💡 Sổ tay &ldquo;{newNotebookName.trim()}&rdquo; đã tồn tại. Từ vựng sẽ được lưu thẳng vào sổ tay hiện có này để tránh trùng lặp.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewNotebookName("");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Quay lại danh sách sổ tay
              </button>
            </div>
          )}
        </div>

        {/* Status feedback message */}
        {feedbackStatus.status !== "idle" && (
          <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            feedbackStatus.status === "duplicate"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            {feedbackStatus.status === "duplicate" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackStatus.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Hủy
          </button>

          <button
            onClick={handleSave}
            disabled={feedbackStatus.status === "success"}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            {feedbackStatus.status === "success" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã lưu!</span>
              </>
            ) : (
              <span>Lưu vào Sổ tay</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
