import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SRSItem {
  flashcardId: string;
  interval: number; // in days
  nextReviewDate: number; // timestamp in ms
  repetitions: number;
  lastReviewed: number;
}

export interface Notebook {
  id: string;
  title: string;
  createdAt: number;
}

export interface NotebookItem {
  id: string;
  notebookId: string;
  word: string;
  reading?: string;
  meaning: string;
  explanation?: string;
  exampleJa: string; // Câu mẫu tiếng Nhật
  exampleVi: string; // Câu dịch tiếng Việt
  userTranslation?: string; // Bản dịch của người dùng
  isCompletedTranslation?: boolean;
  createdAt: number;
}

export interface ExtraPracticeSentence {
  id: string;
  vi: string;
  ja: string;
  hint?: string;
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string; // HTML rich text
  updatedAt: number;
}

export function extractNoteTitle(htmlContent: string): string {
  if (!htmlContent) return "Ghi chú không có tiêu đề";
  const text = htmlContent
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Ghi chú không có tiêu đề";
  return text.length > 30 ? text.substring(0, 30) + "..." : text;
}

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    notebookId: "nb-default",
    title: "Phân biệt わけがない & わけではない",
    content: "<h3>Phân biệt わけがない & わけではない</h3><p>• <strong>わけがない</strong>: Tuyệt đối không có khả năng, làm sao mà có chuyện đó được.</p><p>• <strong>わけではない</strong>: Không hẳn là, không có nghĩa là như vậy.</p>",
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: "note-2",
    notebookId: "nb-default",
    title: "Lưu ý biển báo giao thông",
    content: "<h3>Biển báo giao thông N2</h3><p>• <em>停車 (ていしゃ)</em>: Dừng xe tạm thời</p><p>• <em>駐車 (ちゅうしゃ)</em>: Đỗ xe lâu dài</p><p>• <em>往復 (おうふく)</em>: Khứ hồi</p>",
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: "note-3",
    notebookId: "nb-grammar",
    title: "Các mẫu ngữ pháp đi với にかけて",
    content: "<h3>Ngữ pháp にかけて</h3><p>• ~から~にかけて: Từ khoảng... đến khoảng... (khoảng thời gian / không gian mơ hồ).</p>",
    updatedAt: Date.now() - 3600000 * 24,
  },
  {
    id: "note-4",
    notebookId: "nb-kanji",
    title: "Các chữ Hán có bộ Nguyệt (月)",
    content: "<h3>Hán tự bộ Nguyệt / Nhục</h3><p>• 朝 (Triêu - buổi sáng), 期 (Kỳ - thời kỳ), 望 (Vọng - hy vọng).</p>",
    updatedAt: Date.now() - 3600000 * 48,
  },
];

export const getTodayDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface ProgressState {
  // Activity Heatmap Tracking
  activityLog: Record<string, number>; // YYYY-MM-DD -> số action thực tế
  logActivity: (dateStr?: string, count?: number) => void;
  clearActivityLog: () => void;

  // Course completion & SRS
  completedSections: string[];
  srsData: Record<string, SRSItem>;
  studiedItems: Record<string, boolean>; // id -> true khi đã tick xanh phần lý thuyết

  // Pre-check Flashcards state (Bắt buộc thuộc 100% trước khi unlock Test)
  masteredFlashcardIds: Record<string, boolean>; // cardId -> true nếu đã thuộc

  // Notebook system
  notebooks: Notebook[];
  activeNotebookId: string;
  notebookItems: NotebookItem[];
  notes: Note[];
  editorContent: string; // Nội dung của Text Editor (legacy)

  // Extra Practice Sentences (Tạo thêm đề luyện dịch và lưu lại)
  customPracticeSentences: Record<string, ExtraPracticeSentence[]>;

  // AI Settings & Modal
  aiApiKey: string;
  aiProvider: "gemini" | "openai";
  isAiModalOpen: boolean;
  isNotebookModalOpen: boolean;

  // Global Quiz Active State (để ẩn FloatingNavBar)
  isQuizActive: boolean;

  // Toast notification
  toastMessage: string | null;

  // Actions - SRS & Course
  toggleSection: (sectionId: string) => void;
  markSectionCompleted: (sectionId: string) => void;
  updateReview: (flashcardId: string, isCorrect: boolean) => void;
  markItemStudied: (cardId: string) => void;
  unmarkItemStudied: (cardId: string) => void;
  markFlashcardMastered: (cardId: string) => void;
  unmarkFlashcardMastered: (cardId: string) => void;

  // Actions - Notebooks & Notes
  createNotebook: (title: string) => string;
  deduplicateNotebooks: () => void;
  deleteNotebook: (notebookId: string) => void;
  setActiveNotebookId: (id: string) => void;
  addWordToNotebook: (
    item: Omit<NotebookItem, "id" | "createdAt">
  ) => { success: boolean; message: string };
  deleteNotebookItem: (itemId: string) => void;
  updateUserTranslation: (
    itemId: string,
    translation: string,
    isCompleted?: boolean
  ) => void;
  setEditorContent: (content: string) => void;
  addNote: (notebookId: string, initialContent?: string) => string;
  updateNote: (id: string, content: string, title?: string) => void;
  deleteNote: (id: string) => void;

  // Actions - Custom Practice
  addCustomPracticeSentence: (wordKey: string, sentence: Omit<ExtraPracticeSentence, "id">) => void;
  deleteCustomPracticeSentence: (wordKey: string, sentenceId: string) => void;

  // Actions - AI & Modal & Quiz & Toast
  setAiSettings: (apiKey: string, provider?: "gemini" | "openai") => void;
  setAiModalOpen: (isOpen: boolean) => void;
  setNotebookModalOpen: (isOpen: boolean) => void;
  setQuizActive: (isActive: boolean) => void;
  setToastMessage: (msg: string | null) => void;

  // Reset
  resetAllProgress: () => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      activityLog: {},

      logActivity: (dateStr?: string, count: number = 1) => {
        const dateKey = dateStr || getTodayDateString();
        set((state) => ({
          activityLog: {
            ...state.activityLog,
            [dateKey]: (state.activityLog[dateKey] || 0) + count,
          },
        }));
      },

      clearActivityLog: () => {
        set({ activityLog: {} });
      },

      completedSections: [],
      srsData: {},
      studiedItems: {},
      masteredFlashcardIds: {},

      notebooks: [
        { id: "nb-default", title: "Sổ tay chung", createdAt: Date.now() },
        { id: "nb-grammar", title: "Ngữ pháp hay nhầm", createdAt: Date.now() },
        { id: "nb-kanji", title: "Hán tự khó nhớ", createdAt: Date.now() },
      ],
      activeNotebookId: "nb-default",
      notebookItems: [],
      notes: INITIAL_NOTES,
      editorContent: "<h3>Ghi chú cá nhân ôn thi JLPT N2</h3><p>• Chú ý phân biệt <strong>わけがない</strong> và <strong>わけではない</strong>.</p>",

      customPracticeSentences: {},
      aiApiKey: "",
      aiProvider: "gemini",
      isAiModalOpen: false,
      isNotebookModalOpen: false,
      isQuizActive: false,
      toastMessage: null,

      toggleSection: (sectionId: string) => {
        set((state) => {
          const exists = state.completedSections.includes(sectionId);
          return {
            completedSections: exists
              ? state.completedSections.filter((id) => id !== sectionId)
              : [...state.completedSections, sectionId],
          };
        });
      },

      markSectionCompleted: (sectionId: string) => {
        get().logActivity(undefined, 5);
        set((state) => {
          if (state.completedSections.includes(sectionId)) return state;
          return {
            completedSections: [...state.completedSections, sectionId],
          };
        });
      },

      updateReview: (flashcardId: string, isCorrect: boolean) => {
        get().logActivity();
        set((state) => {
          const now = Date.now();
          const current = state.srsData[flashcardId];
          const prevInterval = current ? current.interval : 0;
          const prevReps = current ? current.repetitions : 0;

          let newInterval: number;
          if (isCorrect) {
            if (prevInterval === 0) newInterval = 1;
            else if (prevInterval === 1) newInterval = 3;
            else if (prevInterval === 3) newInterval = 7;
            else newInterval = Math.round(prevInterval * 2);
          } else {
            newInterval = 0;
          }

          const nextReviewDate = now + (newInterval === 0 ? ONE_DAY_MS : newInterval * ONE_DAY_MS);

          const updatedItem: SRSItem = {
            flashcardId,
            interval: newInterval,
            nextReviewDate,
            repetitions: isCorrect ? prevReps + 1 : prevReps,
            lastReviewed: now,
          };

          return {
            srsData: {
              ...state.srsData,
              [flashcardId]: updatedItem,
            },
          };
        });
      },

      markItemStudied: (cardId: string) => {
        get().logActivity();
        set((state) => ({
          studiedItems: {
            ...state.studiedItems,
            [cardId]: true,
          },
        }));
      },

      unmarkItemStudied: (cardId: string) => {
        set((state) => {
          const copy = { ...state.studiedItems };
          delete copy[cardId];
          return { studiedItems: copy };
        });
      },

      markFlashcardMastered: (cardId: string) => {
        get().logActivity();
        set((state) => ({
          masteredFlashcardIds: {
            ...state.masteredFlashcardIds,
            [cardId]: true,
          },
        }));
      },

      unmarkFlashcardMastered: (cardId: string) => {
        set((state) => {
          const copy = { ...state.masteredFlashcardIds };
          delete copy[cardId];
          return { masteredFlashcardIds: copy };
        });
      },

      createNotebook: (title: string) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) {
          return get().activeNotebookId;
        }

        const state = get();
        // Kiểm tra xem sổ tay đã tồn tại chưa (không phân biệt chữ hoa/thường)
        const existing = state.notebooks.find(
          (nb) => nb.title.trim().toLowerCase() === cleanTitle.toLowerCase()
        );

        if (existing) {
          // Chống trùng lặp: không tạo sổ tay mới, chuyển activeNotebookId sang sổ tay đã có
          set({
            activeNotebookId: existing.id,
            toastMessage: `Sổ tay "${existing.title}" đã tồn tại! Đã chuyển sang sổ tay này.`,
          });
          return existing.id;
        }

        const id = `nb-${Date.now()}`;
        set((prevState) => ({
          notebooks: [...prevState.notebooks, { id, title: cleanTitle, createdAt: Date.now() }],
          activeNotebookId: id,
          toastMessage: `Đã tạo sổ tay "${cleanTitle}" thành công!`,
        }));
        return id;
      },

      deduplicateNotebooks: () => {
        set((state) => {
          const titleMap = new Map<string, string>(); // normalized title -> first notebookId
          const uniqueNotebooks: Notebook[] = [];
          const idRemap = new Map<string, string>(); // duplicateId -> masterId

          for (const nb of state.notebooks) {
            const normalized = nb.title.trim().toLowerCase();
            if (!titleMap.has(normalized)) {
              titleMap.set(normalized, nb.id);
              uniqueNotebooks.push({ ...nb, title: nb.title.trim() });
            } else {
              const masterId = titleMap.get(normalized)!;
              idRemap.set(nb.id, masterId);
            }
          }

          // Khôi phục chữ Hán gốc nếu word bị lưu nhầm thành hiragana và gộp notebookId trùng
          let hasItemChanges = idRemap.size > 0;
          const remappedItems = state.notebookItems.map((item) => {
            let updated = item;
            if (idRemap.has(item.notebookId)) {
              updated = { ...updated, notebookId: idRemap.get(item.notebookId)! };
            }
            if (
              updated.exampleJa &&
              updated.word === updated.reading &&
              updated.exampleJa !== updated.word &&
              /[\u4e00-\u9faf]/.test(updated.exampleJa)
            ) {
              updated = { ...updated, word: updated.exampleJa };
              hasItemChanges = true;
            }
            return updated;
          });

          const remappedNotes = state.notes.map((note) => {
            if (idRemap.has(note.notebookId)) {
              return { ...note, notebookId: idRemap.get(note.notebookId)! };
            }
            return note;
          });

          // Lọc bỏ các câu mẫu giả lập cũ dạng "[Ngữ cảnh mở rộng] Hãy đặt câu..."
          const cleanedSentences: Record<string, ExtraPracticeSentence[]> = {};
          let hasSentenceChanges = false;
          for (const [key, list] of Object.entries(state.customPracticeSentences || {})) {
            const filtered = list.filter(
              (s) =>
                !s.vi.startsWith("[Ngữ cảnh mở rộng] Hãy đặt câu") &&
                !s.vi.startsWith("[Luyện tập thêm]")
            );
            if (filtered.length !== list.length) {
              hasSentenceChanges = true;
            }
            if (filtered.length > 0) {
              cleanedSentences[key] = filtered;
            }
          }

          let newActiveId = state.activeNotebookId;
          if (idRemap.has(newActiveId)) {
            newActiveId = idRemap.get(newActiveId)!;
          }

          if (!hasItemChanges && idRemap.size === 0 && !hasSentenceChanges) return state;

          return {
            notebooks: uniqueNotebooks,
            notebookItems: remappedItems,
            notes: remappedNotes,
            customPracticeSentences: hasSentenceChanges ? cleanedSentences : state.customPracticeSentences,
            activeNotebookId: newActiveId,
          };
        });
      },

      deleteNotebook: (notebookId: string) => {
        set((state) => {
          if (state.notebooks.length <= 1) return state;
          const newNotebooks = state.notebooks.filter((n) => n.id !== notebookId);
          const newItems = state.notebookItems.filter((i) => i.notebookId !== notebookId);
          return {
            notebooks: newNotebooks,
            notebookItems: newItems,
            activeNotebookId: newNotebooks[0].id,
          };
        });
      },

      setActiveNotebookId: (id: string) => {
        set({ activeNotebookId: id });
      },

      addWordToNotebook: (item) => {
        const state = get();
        // Kiểm tra chống trùng lặp từ vựng trong cùng sổ tay
        const isDuplicate = state.notebookItems.some(
          (i) => i.notebookId === item.notebookId && i.word.trim().toLowerCase() === item.word.trim().toLowerCase()
        );

        if (isDuplicate) {
          set({ toastMessage: "Từ này đã có trong sổ tay" });
          return { success: false, message: "Từ này đã có trong sổ tay" };
        }

        get().logActivity();

        const newItem: NotebookItem = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: Date.now(),
        };

        set({
          notebookItems: [newItem, ...state.notebookItems],
          toastMessage: "Đã thêm vào sổ tay thành công",
        });
        return { success: true, message: "Đã thêm vào sổ tay thành công" };
      },

      deleteNotebookItem: (itemId: string) => {
        set((state) => ({
          notebookItems: state.notebookItems.filter((i) => i.id !== itemId),
        }));
      },

      updateUserTranslation: (itemId: string, translation: string, isCompleted = true) => {
        get().logActivity();
        set((state) => ({
          notebookItems: state.notebookItems.map((item) =>
            item.id === itemId
              ? { ...item, userTranslation: translation, isCompletedTranslation: isCompleted }
              : item
          ),
        }));
      },

      setEditorContent: (content: string) => {
        set({ editorContent: content });
      },

      addNote: (notebookId: string, initialContent = "") => {
        get().logActivity();
        const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const title = extractNoteTitle(initialContent) || "Ghi chú mới";
        const newNote: Note = {
          id,
          notebookId,
          title,
          content: initialContent || "<p>Nhập nội dung ghi chú tại đây...</p>",
          updatedAt: Date.now(),
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
        }));
        return id;
      },

      updateNote: (id: string, content: string, title?: string) => {
        get().logActivity();
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== id) return note;
            const newTitle = title !== undefined && title.trim() ? title.trim() : extractNoteTitle(content);
            return {
              ...note,
              content,
              title: newTitle,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteNote: (id: string) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        }));
      },

      addCustomPracticeSentence: (wordKey, sentence) => {
        get().logActivity(undefined, 2);
        const id = `extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        set((state) => {
          const list = state.customPracticeSentences[wordKey] || [];
          return {
            customPracticeSentences: {
              ...state.customPracticeSentences,
              [wordKey]: [...list, { ...sentence, id }],
            },
          };
        });
      },

      deleteCustomPracticeSentence: (wordKey, sentenceId) => {
        set((state) => {
          const list = state.customPracticeSentences[wordKey] || [];
          return {
            customPracticeSentences: {
              ...state.customPracticeSentences,
              [wordKey]: list.filter((item) => item.id !== sentenceId),
            },
          };
        });
      },

      setAiSettings: (apiKey, provider = "gemini") => {
        set({ aiApiKey: apiKey.trim(), aiProvider: provider });
      },

      setAiModalOpen: (isOpen: boolean) => {
        set({ isAiModalOpen: isOpen });
      },

      setNotebookModalOpen: (isOpen: boolean) => {
        set({ isNotebookModalOpen: isOpen });
      },

      setQuizActive: (isActive: boolean) => {
        set({ isQuizActive: isActive });
      },

      setToastMessage: (msg) => {
        set({ toastMessage: msg });
      },

      resetAllProgress: () => {
        set({
          completedSections: [],
          srsData: {},
          studiedItems: {},
          masteredFlashcardIds: {},
          activityLog: {},
        });
      },
    }),
    {
      name: "fast-jlpt-n2-progress-v3",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.deduplicateNotebooks();
          const todayStr = getTodayDateString();
          if (state.activityLog) {
            const keys = Object.keys(state.activityLog);
            if (keys.length > 5 && keys.some((k) => k < todayStr)) {
              const todayCount = state.activityLog[todayStr] || 0;
              state.activityLog = todayCount > 0 ? { [todayStr]: todayCount } : {};
            }
          }
        }
      },
    }
  )
);
