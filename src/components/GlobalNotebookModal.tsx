"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProgressStore, Note, extractNoteTitle } from "@/store/useProgressStore";
import { 
  X, 
  BookMarked, 
  Plus, 
  Trash2, 
  Bold, 
  Italic, 
  List, 
  Heading3, 
  Highlighter, 
  RotateCcw,
  CheckCircle2, 
  Clock, 
  StickyNote,
  Sparkles
} from "lucide-react";

function formatNoteDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

export const GlobalNotebookModal: React.FC = () => {
  const isNotebookModalOpen = useProgressStore((state) => state.isNotebookModalOpen);
  const setNotebookModalOpen = useProgressStore((state) => state.setNotebookModalOpen);
  
  const notebooks = useProgressStore((state) => state.notebooks);
  const activeNotebookId = useProgressStore((state) => state.activeNotebookId);
  const setActiveNotebookId = useProgressStore((state) => state.setActiveNotebookId);
  
  const notes = useProgressStore((state) => state.notes);
  const addNote = useProgressStore((state) => state.addNote);
  const updateNote = useProgressStore((state) => state.updateNote);
  const deleteNote = useProgressStore((state) => state.deleteNote);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  const editorRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isNotebookModalOpen) {
        setNotebookModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNotebookModalOpen, setNotebookModalOpen]);

  const currentNotebook = notebooks.find((n) => n.id === activeNotebookId) || notebooks[0];
  const currentNotes = notes.filter((n) => n.notebookId === activeNotebookId);

  // Synchronize selected note
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

  // Load content into editor
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content || "";
      }
    }
  }, [activeNote?.id, isNotebookModalOpen]);

  if (!isNotebookModalOpen) return null;

  const handleCreateNewNote = () => {
    const newId = addNote(activeNotebookId, "<p>Ghi chú mới...</p>");
    setSelectedNoteId(newId);
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => setNotebookModalOpen(false)}
    >
      <div
        className="w-[92vw] max-w-5xl h-[82vh] bg-white/95 backdrop-blur-xl rounded-3xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">Sổ tay cá nhân</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                  Quick Note
                </span>
              </div>
              <p className="text-xs text-slate-400">Ghi chép nhanh không làm gián đoạn mạch học</p>
            </div>
          </div>

          {/* Notebook Selector & Close Button */}
          <div className="flex items-center space-x-3">
            <select
              value={activeNotebookId}
              onChange={(e) => setActiveNotebookId(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:border-purple-600 outline-none transition-all cursor-pointer"
            >
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.title} ({notes.filter((n) => n.notebookId === nb.id).length})
                </option>
              ))}
            </select>

            <button
              onClick={() => setNotebookModalOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master-Detail Layout (3/7) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-10 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* CỘT TRÁI (3/10 = 30%): Danh sách ghi chú */}
          <div className="md:col-span-3 flex flex-col bg-slate-50/50 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ghi chú ({currentNotes.length})
              </span>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {currentNotes.length === 0 ? (
                <div className="text-center py-10 px-2 text-xs text-slate-400">
                  Chưa có ghi chú nào
                </div>
              ) : (
                currentNotes.map((note) => {
                  const isSelected = note.id === selectedNoteId;

                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-purple-50/90 border-purple-300 ring-1 ring-purple-200 shadow-2xs"
                          : "bg-white hover:bg-slate-100/70 border-gray-200/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className={`text-xs font-bold line-clamp-2 leading-snug ${
                          isSelected ? "text-purple-950" : "text-slate-800"
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
                          <span className="text-purple-700 font-bold text-[10px]">Đang mở</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT PHẢI (7/10 = 70%): Text Editor */}
          <div className="md:col-span-7 flex flex-col bg-white overflow-hidden">
            {activeNote ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Editor Toolbar */}
                <div className="flex items-center flex-wrap gap-1 p-2 bg-slate-50 border-b border-gray-100 text-slate-600">
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

                {/* ContentEditable Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  className="p-5 flex-1 overflow-y-auto outline-none text-sm text-slate-800 leading-relaxed focus:bg-white"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Chưa có ghi chú nào</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tạo ghi chú đầu tiên để lưu lại kiến thức quan trọng.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewNote}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tạo ghi chú đầu tiên</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
