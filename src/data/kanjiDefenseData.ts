import { getAllFlashcards, BOOKS_DATA } from "./books";
import * as wanakana from "wanakana";

export type DefenseSourceMode = "all" | "notebook" | "kanji_vocab" | "grammar";

export interface DefenseWord {
  id: string;
  word: string;
  reading: string; // Hiragana chuẩn hiển thị
  romaji: string; // Romaji chuẩn hiển thị
  meaning: string;
  sourceType: "notebook" | "kanji" | "vocab" | "grammar";
  acceptedInputs: string[]; // Các chuỗi chuẩn hóa chấp nhận khi gõ (đã lọc bỏ ~)
}

/**
 * Chuẩn hóa chuỗi gõ phím và từ vựng, tự động loại bỏ các ký hiệu ngữ pháp:
 * ~, 〜, ～, ..., …, khoảng trắng, dấu ngoặc (), （）, dấu gạch, v.v.
 */
export function normalizeDefenseMatch(text: string): string {
  if (!text) return "";
  return text
    .replace(/[~〜～…\.\s・\(\)（）\[\]【】\-_:：/、,，]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Xây dựng mảng các chuỗi hợp lệ mà người dùng có thể gõ để bắn trúng từ/ngữ pháp này.
 * Người dùng có thể gõ Hiragana hoặc Romaji, CÓ hoặc KHÔNG CẦN gõ dấu ~, 〜, ～, ngoặc ()
 */
export function buildAcceptedInputs(word: string, rawReading: string): string[] {
  const set = new Set<string>();

  const normWord = normalizeDefenseMatch(word);
  if (normWord) set.add(normWord);

  // Tạo các biến thể của reading:
  // 1. Bản đầy đủ
  // 2. Bản không có phần trong ngoặc tròn: ví dụ "〜際 (に)" -> "〜際"
  const cleanTokens = [
    rawReading,
    word,
    rawReading.replace(/\([^)]*\)/g, ""),
    rawReading.replace(/（[^）]*）/g, ""),
    rawReading.replace(/[~〜～]/g, ""),
  ];

  for (const token of cleanTokens) {
    const norm = normalizeDefenseMatch(token);
    if (!norm) continue;

    set.add(norm);

    try {
      const hira = normalizeDefenseMatch(wanakana.toHiragana(norm));
      if (hira) set.add(hira);
    } catch {}

    try {
      const roma = normalizeDefenseMatch(wanakana.toRomaji(norm));
      if (roma) set.add(roma);
    } catch {}
  }

  return Array.from(set).filter(Boolean);
}

/**
 * Lấy danh sách từ vựng/Hán tự/Ngữ pháp theo nguồn lựa chọn.
 */
export function getDefenseWordPool(
  studiedItems: Record<string, boolean> = {},
  masteredIds: Record<string, boolean> = {},
  notebookItems: Array<{ word: string; reading?: string; meaning: string }> = [],
  sourceMode: DefenseSourceMode = "all"
): DefenseWord[] {
  const result: DefenseWord[] = [];
  const seen = new Set<string>();

  // 1. NGUỒN SỔ TAY (Notebook)
  if (sourceMode === "all" || sourceMode === "notebook") {
    for (const item of notebookItems) {
      const cleanWord = item.word?.trim();
      const rawRd = (item.reading || item.word)?.trim() || "";
      if (cleanWord && !seen.has(cleanWord)) {
        seen.add(cleanWord);
        const hira = wanakana.toHiragana(normalizeDefenseMatch(rawRd || cleanWord));
        const roma = wanakana.toRomaji(hira);
        const accepted = buildAcceptedInputs(cleanWord, rawRd);

        result.push({
          id: `user-${cleanWord}`,
          word: cleanWord,
          reading: hira || cleanWord,
          romaji: roma,
          meaning: item.meaning || "Từ vựng Sổ tay",
          sourceType: "notebook",
          acceptedInputs: accepted,
        });
      }
    }
  }

  // Nếu người dùng chọn CHỈ SỔ TAY mà sổ tay có từ vựng thì trả về luôn
  if (sourceMode === "notebook") {
    return result;
  }

  const allCards = getAllFlashcards();

  // 2. NGUỒN NGỮ PHÁP (Grammar: Soumatome & Shinkanzen)
  if (sourceMode === "all" || sourceMode === "grammar") {
    const grammarBooks = BOOKS_DATA.filter((b) => b.id.includes("grammar"));
    const grammarCards = grammarBooks.flatMap((b) =>
      b.sections.flatMap((s) => s.flashcards)
    );

    for (const card of grammarCards) {
      const rawRd = card.reading?.trim() || "";
      // Nếu reading hoặc question có dạng mẫu ngữ pháp
      const targetWord = rawRd.includes("〜") || rawRd.includes("~") ? rawRd : card.reading || card.question;

      if (targetWord && !seen.has(targetWord) && targetWord.length <= 15) {
        seen.add(targetWord);
        const normHira = wanakana.toHiragana(normalizeDefenseMatch(rawRd || targetWord));
        const roma = wanakana.toRomaji(normHira);
        const accepted = buildAcceptedInputs(targetWord, rawRd || targetWord);

        result.push({
          id: `grammar-${card.id}`,
          word: targetWord,
          reading: rawRd || normHira,
          romaji: roma,
          meaning: card.meaning || card.explanation || "Ngữ pháp N2",
          sourceType: "grammar",
          acceptedInputs: accepted,
        });

        if (sourceMode === "grammar" && result.length >= 250) break;
      }
    }

    if (sourceMode === "grammar") {
      return result;
    }
  }

  // 3. NGUỒN CHỮ HÁN & TỪ VỰNG (Kanji & Vocab)
  if (sourceMode === "all" || sourceMode === "kanji_vocab") {
    for (const card of allCards) {
      if (card.bookId.includes("grammar")) continue;

      // Root Kanji
      if (card.rootKanji && !seen.has(card.rootKanji.kanji)) {
        seen.add(card.rootKanji.kanji);
        const rawRd = (card.rootKanji.kun || card.rootKanji.on || card.reading || "").replace(/[./\s]/g, "");
        if (rawRd) {
          const hira = wanakana.toHiragana(rawRd);
          const accepted = buildAcceptedInputs(card.rootKanji.kanji, rawRd);

          result.push({
            id: `card-kanji-${card.id}`,
            word: card.rootKanji.kanji,
            reading: hira,
            romaji: wanakana.toRomaji(hira),
            meaning: card.meaning || card.rootKanji.hanViet,
            sourceType: "kanji",
            acceptedInputs: accepted,
          });
        }
      }

      // Từ ghép liên quan (Related Words)
      if (card.relatedWords) {
        for (const rw of card.relatedWords) {
          if (!seen.has(rw.word) && rw.word.length <= 6) {
            seen.add(rw.word);
            const rawRd = rw.reading.replace(/[./\s]/g, "");
            const hira = wanakana.toHiragana(rawRd);
            const accepted = buildAcceptedInputs(rw.word, rawRd);

            result.push({
              id: `card-rel-${rw.id || rw.word}`,
              word: rw.word,
              reading: hira,
              romaji: wanakana.toRomaji(hira),
              meaning: rw.meaning,
              sourceType: "vocab",
              acceptedInputs: accepted,
            });
          }
        }
      }

      if (sourceMode === "kanji_vocab" && result.length >= 300) break;
    }

    if (sourceMode === "kanji_vocab") {
      return result;
    }
  }

  // Bổ sung thêm từ vựng nếu chế độ All chưa đủ 50 từ
  if (result.length < 50) {
    for (const card of allCards) {
      if (card.question && card.reading && !seen.has(card.question) && card.question.length <= 6) {
        seen.add(card.question);
        const rawRd = card.reading.replace(/[./\s]/g, "");
        const hira = wanakana.toHiragana(rawRd);
        const accepted = buildAcceptedInputs(card.question, rawRd);

        result.push({
          id: `card-q-${card.id}`,
          word: card.question,
          reading: hira,
          romaji: wanakana.toRomaji(hira),
          meaning: card.meaning,
          sourceType: "vocab",
          acceptedInputs: accepted,
        });
      }
      if (result.length >= 400) break;
    }
  }

  return result;
}

/**
 * Đếm số lượng từ vựng khả dụng cho từng nguồn
 */
export function getDefenseSourceCounts(
  notebookItems: Array<{ word: string; reading?: string; meaning: string }> = []
): Record<DefenseSourceMode, number> {
  const nbCount = notebookItems.length;

  let kanjiVocabCount = 0;
  let grammarCount = 0;

  for (const b of BOOKS_DATA) {
    if (b.id.includes("grammar")) {
      grammarCount += b.sections.reduce((acc, s) => acc + s.flashcards.length, 0);
    } else {
      for (const s of b.sections) {
        for (const c of s.flashcards) {
          if (c.rootKanji) kanjiVocabCount++;
          if (c.relatedWords) kanjiVocabCount += c.relatedWords.length;
        }
      }
    }
  }

  return {
    all: nbCount + kanjiVocabCount + grammarCount,
    notebook: nbCount,
    kanji_vocab: kanjiVocabCount,
    grammar: grammarCount,
  };
}
