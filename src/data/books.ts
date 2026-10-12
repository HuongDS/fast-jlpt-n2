import kanjiSoumatome from "./books/kanji-soumatome.json";
import grammarSoumatome from "./books/grammar-soumatome.json";
import grammarShinkanzen from "./books/grammar-shinkanzen.json";
import wordShinkanzen from "./books/word-shinkanzen.json";

export interface RelatedWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
}

export interface Flashcard {
  id: string;
  bookId: string;
  sectionId: string;
  question: string;
  reading?: string;
  meaning: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  example?: string;
  exampleMeaning?: string;
  rootKanji?: {
    kanji: string;
    hanViet: string;
    kun: string;
    on: string;
    radical?: string; // Bộ thủ
  };
  relatedWords?: RelatedWord[];
  questionType?: "meaning" | "on-kun" | "grammar";
}

export interface Section {
  id: string;
  bookId: string;
  title: string;
  subtitle: string;
  week?: number;
  groupTitle?: string;
  previewItems?: string[];
  estimatedMinutes?: number;
  flashcards: Flashcard[];
}

export interface Book {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  iconName: string;
  description: string;
  sections: Section[];
}

export const BOOKS_DATA: Book[] = [
  kanjiSoumatome as unknown as Book,
  grammarSoumatome as unknown as Book,
  grammarShinkanzen as unknown as Book,
  wordShinkanzen as unknown as Book,
];

export const getAllFlashcards = (): Flashcard[] => {
  return BOOKS_DATA.flatMap((b) => b.sections.flatMap((s) => s.flashcards));
};

export const getFlashcardById = (id: string): Flashcard | undefined => {
  return getAllFlashcards().find((f) => f.id === id);
};
