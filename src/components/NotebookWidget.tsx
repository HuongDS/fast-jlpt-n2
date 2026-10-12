"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useProgressStore, NotebookItem, Note, extractNoteTitle } from "@/store/useProgressStore";
import { NotebookFlashcardModal } from "@/components/NotebookFlashcardModal";
import { 
  BookMarked, 
  Plus, 
  Trash2, 
  Languages, 
  Edit3, 
  Bold, 
  Italic, 
  List, 
  Heading3, 
  Highlighter, 
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  Layers,
  ArrowUpRight,
  StickyNote,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";

function formatNoteDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

export const NotebookWidget: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const notebooks = useProgressStore((state) => state.notebooks);
  const activeNotebookId = useProgressStore((state) => state.activeNotebookId);
  const setActiveNotebookId = useProgressStore((state) => state.setActiveNotebookId);
  const createNotebook = useProgressStore((state) => state.createNotebook);
  const deleteNotebook = useProgressStore((state) => state.deleteNotebook);
  const deduplicateNotebooks = useProgressStore((state) => state.deduplicateNotebooks);
  
  // Notebook items (Words & Sentences for translation)
  const notebookItems = useProgressStore((state) => state.notebookItems);
  const deleteNotebookItem = useProgressStore((state) => state.deleteNotebookItem);
  const updateUserTranslation = useProgressStore((state) => state.updateUserTranslation);

  // Multi-notes store
  const notes = useProgressStore((state) => state.notes);
  const addNote = useProgressStore((state) => state.addNote);
  const updateNote = useProgressStore((state) => state.updateNote);
  const deleteNote = useProgressStore((state) => state.deleteNote);

  const [activeTab, setActiveTab] = useState<"words" | "editor">("words");
  const [newNotebookTitle, setNewNotebookTitle] = useState("");
  const [nbError, setNbError] = useState<string | null>(null);
  const [isCreatingNb, setIsCreatingNb] = useState(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);

  // Selected note ID for Master-Detail
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // States for translation test
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [inputTranslations, setInputTranslations] = useState<Record<string, string>>({});

  const editorRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    deduplicateNotebooks();
  }, [deduplicateNotebooks]);

  const currentNotebook = notebooks.find((n) => n.id === activeNotebookId) || notebooks[0];
  const currentItems = notebookItems.filter((i) => i.notebookId === activeNotebookId);
  const currentNotes = notes.filter((n) => n.notebookId === activeNotebookId);

  // Ensure selected note is valid for current notebook
  useEffect(() => {
    if (currentNotes.length > 0) {
      const exists = currentNotes.some((n) => n.id === selectedNoteId);
      if (!exists) {
        setSelectedNoteId(currentNotes[0].id);
      }
    } else {
      setSelectedNoteId(null);
    }
  }, [activeNotebookId, currentNotes, selectedNoteId]);

  const activeNote = currentNotes.find((n) => n.id === selectedNoteId) || null;

  // Load active note content into editor when selection changes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content || "";
      }
    }
  }, [activeNote?.id, activeTab]);

  if (!mounted) {
    return (
      <div id="notebook" className="w-full bg-white/70 backdrop-blur-md border border-gray-200/90 rounded-2xl p-6 shadow-sm">
        <div className="text-sm text-slate-400">Đang tải sổ tay cá nhân...</div>
      </div>
    );
  }

  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNotebookTitle.trim();
    if (!trimmed) {
      setNbError("Vui lòng nhập tên sổ tay!");
      return;
    }

    const isDuplicate = notebooks.some(
      (nb) => nb.title.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setNbError(`Sổ tay "${trimmed}" đã tồn tại! Vui lòng chọn tên khác.`);
      return;
    }

    setNbError(null);
    createNotebook(trimmed);
    setNewNotebookTitle("");
    setIsCreatingNb(false);
  };

  // Create new note in current notebook
  const handleCreateNewNote = () => {
    const newId = addNote(activeNotebookId, "<p>Ghi chú mới...</p>");
    setSelectedNoteId(newId);
    if (activeTab !== "editor") {
      setActiveTab("editor");
    }
  };

  const handleEditorInput = () => {
    if (!activeNote || !editorRef.current) return;
    const newContent = editorRef.current.innerHTML;

    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateNote(activeNote.id, newContent);
      setSaveStatus("saved");
    }, 500);
  };

  const executeEditorCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current && activeNote) {
      handleEditorInput();
    }
  };

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc muốn xóa ghi chú này không?")) {
      deleteNote(noteId);
      if (selectedNoteId === noteId) {
        const remaining = currentNotes.filter((n) => n.id !== noteId);
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleCheckTranslation = (item: NotebookItem) => {
    const userText = inputTranslations[item.id] || "";
    updateUserTranslation(item.id, userText, true);
    setRevealedIds((prev) => ({ ...prev, [item.id]: true }));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div id="notebook" className="w-full bg-white/75 backdrop-blur-md border border-gray-200/90 rounded-2xl p-6 sm:p-7 shadow-sm transition-all hover:shadow-md scroll-mt-20">
      {/* Top Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
            <BookMarked className="w-3.5 h-3.5" />
            <span>Sổ tay cá nhân</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Ghi chép & Luyện dịch câu mẫu Mazii
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý nhiều ghi chú độc lập, lưu từ vựng và luyện dịch câu mẫu sang tiếng Nhật.
          </p>
        </div>

        {/* Action Buttons: Flashcard + Practice Page Link + Tab Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {currentItems.length > 0 && (
            <button
              onClick={() => setIsFlashcardOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 transition-all shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Học Flashcard ({currentItems.length})</span>
            </button>
          )}

          <Link
            href="/practice"
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-amber-100/70 hover:bg-amber-100 border border-amber-300/80 transition-all shadow-2xs"
          >
            <span>Màn hình Luyện dịch</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Tab switcher: Từ đã lưu vs Ghi chú đa tầng */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("words")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "words"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-purple-700" />
              <span>Từ đã lưu ({currentItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "editor"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-700" />
              <span>Ghi chú ({currentNotes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notebook Tabs Carousel */}
      <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        {notebooks.map((nb) => {
          const wordCount = notebookItems.filter((i) => i.notebookId === nb.id).length;
          const noteCount = notes.filter((n) => n.notebookId === nb.id).length;
          const isActive = nb.id === activeNotebookId;

          return (
            <div
              key={nb.id}
              onClick={() => setActiveNotebookId(nb.id)}
              className={`group flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white/80 text-slate-600 border-gray-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{nb.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"
                }`}
                title={`${wordCount} từ vựng, ${noteCount} ghi chú`}
              >
                {activeTab === "words" ? wordCount : noteCount}
              </span>

              {notebooks.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Bạn có chắc muốn xóa sổ tay "${nb.title}"?`)) {
                      deleteNotebook(nb.id);
                    }
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                    isActive ? "hover:text-rose-300" : "hover:text-rose-600"
                  }`}
                  title="Xóa sổ tay này"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Notebook Form */}
        {isCreatingNb ? (
          <div className="flex flex-col shrink-0">
            <form onSubmit={handleCreateNotebook} className="flex items-center space-x-1.5">
              <input
                type="text"
                value={newNotebookTitle}
                onChange={(e) => {
                  setNewNotebookTitle(e.target.value);
                  if (nbError) setNbError(null);
                }}
                placeholder="Tên sổ tay mới..."
                autoFocus
                className={`text-xs px-2.5 py-1 border rounded-lg outline-none focus:ring-2 w-36 transition-all ${
                  nbError
                    ? "border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-purple-300 focus:ring-purple-100 bg-white"
                }`}
              />
              <button
                type="submit"
                className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNb(false);
                  setNbError(null);
                  setNewNotebookTitle("");
                }}
                className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs"
              >
                Hủy
              </button>
            </form>
            {nbError && (
              <span className="text-[10px] font-bold text-rose-600 mt-1 pl-0.5 animate-in fade-in">
                {nbError}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingNb(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-purple-700 bg-purple-50/70 hover:bg-purple-100 border border-purple-200 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo sổ tay</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-5">
        {activeTab === "words" ? (
          /* ================= TAB 1: DANH SÁCH TỪ & LUYỆN DỊCH ================= */
          <div className="space-y-4">
            {currentItems.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200 bg-slate-50/50">
                <Languages className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Chưa có từ vựng hay ngữ pháp nào trong sổ tay này
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Khi học bài hoặc ôn tập, bấm vào nút <strong>"Thêm vào sổ tay"</strong> ở bất kỳ thẻ nào để lưu vào đây.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                  <span>
                    Chế độ luyện dịch: Đọc câu tiếng Việt bên dưới và thử gõ bản dịch tiếng Nhật để kiểm tra phản xạ.
                  </span>
                  <span className="font-semibold text-purple-700">
                    {currentItems.filter((i) => i.isCompletedTranslation).length}/{currentItems.length} câu đã luyện
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {currentItems.map((item) => {
                    const isRevealed = revealedIds[item.id] || false;
                    const userVal = inputTranslations[item.id] !== undefined 
                      ? inputTranslations[item.id] 
                      : (item.userTranslation || "");

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 rounded-xl bg-white/90 border border-gray-200/90 shadow-2xs space-y-3.5 transition-all hover:border-gray-300"
                      >
                        {/* Top: Word & Reading */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-base font-bold text-slate-900 font-japanese">
                                {item.word}
                              </span>
                              {item.reading && (
                                <span className="text-xs text-slate-500 font-japanese">({item.reading})</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-purple-700 mt-0.5">
                              {item.meaning}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteNotebookItem(item.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors"
                            title="Xóa khỏi sổ tay"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Mazii Example Sentence: Vietnamese Prompt */}
                        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/70 space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                            Câu mẫu tiếng Việt (Cần dịch sang tiếng Nhật):
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                            "{item.exampleVi}"
                          </p>
                        </div>

                        {/* User Translation Input Field */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={userVal}
                              onChange={(e) =>
                                setInputTranslations({
                                  ...inputTranslations,
                                  [item.id]: e.target.value,
                                })
                              }
                              placeholder="Nhập câu dịch tiếng Nhật của bạn vào đây..."
                              className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-gray-200 bg-slate-50/60 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-japanese"
                            />
                            <button
                              onClick={() => handleCheckTranslation(item)}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-all shrink-0 flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Kiểm tra</span>
                            </button>
                            <button
                              onClick={() => toggleReveal(item.id)}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-gray-200 transition-colors"
                              title={isRevealed ? "Ẩn câu mẫu gốc" : "Xem câu mẫu gốc"}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Original Japanese Sentence Reveal */}
                          {isRevealed && (
                            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1 animate-in fade-in duration-150">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                Câu mẫu tiếng Nhật gốc:
                              </span>
                              <p className="text-xs sm:text-sm font-semibold text-emerald-950 font-japanese leading-relaxed">
                                {item.exampleJa}
                              </p>
                              {item.explanation && (
                                <p className="text-[11px] text-emerald-800/80 pt-1 border-t border-emerald-200/50 mt-1">
                                  {item.explanation}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= TAB 2: MASTER-DETAIL MULTI-NOTES MANAGER ================= */
          <div className="space-y-4">
            {currentNotes.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-slate-50/60 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Chưa có ghi chú nào trong sổ tay này
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tạo các ghi chú độc lập để lưu lại cấu trúc ngữ pháp hay nhầm lẫn, quy tắc nhớ Kanji hoặc mẹo làm bài thi JLPT N2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo ghi chú đầu tiên</span>
                </button>
              </div>
            ) : (
              /* Master-Detail Layout */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* CỘT TRÁI (MASTER LIST): Danh sách ghi chú */}
                <div className="md:col-span-4 lg:col-span-4 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Danh sách ({currentNotes.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewNote}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi chú mới</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {currentNotes.map((note) => {
                      const isSelected = note.id === selectedNoteId;

                      return (
                        <div
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-purple-50/90 border-purple-300 ring-1 ring-purple-200 shadow-2xs"
                              : "bg-white hover:bg-slate-50 border-gray-200/90"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-xs font-bold line-clamp-2 leading-snug ${
                              isSelected ? "text-purple-950" : "text-slate-800 group-hover:text-slate-900"
                            }`}>
                              {note.title || "Ghi chú không có tiêu đề"}
                            </h4>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteNote(note.id, e)}
                              className="opacity-40 group-hover:opacity-100 hover:text-rose-600 text-slate-400 p-0.5 rounded transition-opacity"
                              title="Xóa ghi chú này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatNoteDate(note.updatedAt)}</span>
                            </span>
                            {isSelected && (
                              <span className="text-purple-700 font-semibold text-[10px]">Đang mở</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CỘT PHẢI (DETAIL): Khu vực Text Editor */}
                <div className="md:col-span-8 lg:col-span-8">
                  {activeNote ? (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col h-full min-h-[380px]">
                      {/* Editor Toolbar */}
                      <div className="flex items-center flex-wrap gap-1 p-2 bg-slate-50/90 border-b border-gray-200 text-slate-600">
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("bold")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs font-bold transition-colors"
                          title="In đậm (Bold)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("italic")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs italic transition-colors"
                          title="In nghiêng (Italic)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("formatBlock", "<h3>")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs transition-colors"
                          title="Tiêu đề (Header 3)"
                        >
                          <Heading3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("insertUnorderedList")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs transition-colors"
                          title="Gạch đầu dòng (List)"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("hiliteColor", "#fef08a")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs transition-colors"
                          title="Highlight vàng"
                        >
                          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => executeEditorCommand("removeFormat")}
                          className="p-1.5 hover:bg-slate-200 rounded text-xs transition-colors"
                          title="Xóa định dạng"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        {/* Save status badge */}
                        <div className="ml-auto flex items-center space-x-1.5 pr-2">
                          {saveStatus === "saving" ? (
                            <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                              Đang lưu...
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã tự động lưu</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ContentEditable area */}
                      <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleEditorInput}
                        className="p-4 sm:p-5 flex-1 min-h-[280px] max-h-[420px] overflow-y-auto outline-none text-sm text-slate-800 leading-relaxed focus:bg-white"
                        style={{ minHeight: "260px" }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[280px] border border-dashed border-gray-200 rounded-2xl bg-slate-50/50 text-xs text-slate-400">
                      Chọn một ghi chú ở cột bên trái hoặc tạo ghi chú mới
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notebook Flashcards Modal */}
      <NotebookFlashcardModal
        isOpen={isFlashcardOpen}
        onClose={() => setIsFlashcardOpen(false)}
        items={currentItems}
        notebookTitle={currentNotebook.title}
      />
    </div>
  );
};
