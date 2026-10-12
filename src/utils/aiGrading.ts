export interface AIEvaluationResult {
  score: number; // 0 - 10
  isAccurate: boolean;
  feedback: string;
  suggestion?: string;
  source: "gemini" | "openai" | "offline-rule";
}

/**
 * Hàm gọi Google Gemini API hoặc OpenAI API để chấm điểm bản dịch của người dùng
 */
export async function gradeTranslationWithAI(params: {
  vietnamesePrompt: string;
  japaneseReference: string;
  userTranslation: string;
  readingReference?: string;
  isWordMode?: boolean;
  apiKey?: string;
  provider?: "gemini" | "openai";
}): Promise<AIEvaluationResult> {
  const {
    vietnamesePrompt,
    japaneseReference,
    userTranslation,
    readingReference,
    isWordMode = false,
    apiKey,
    provider = "gemini",
  } = params;

  const trimmedInput = userTranslation.trim();
  if (!trimmedInput) {
    return {
      score: 0,
      isAccurate: false,
      feedback: "Bạn chưa nhập câu dịch hoặc từ vựng tiếng Nhật nào.",
      source: "offline-rule",
    };
  }

  // Nếu không có API Key, sử dụng phân tích đối sánh thông minh cục bộ
  if (!apiKey) {
    return evaluateLocally(vietnamesePrompt, japaneseReference, trimmedInput, readingReference, isWordMode);
  }

  try {
    if (provider === "gemini") {
      return await callGeminiAPI(apiKey, vietnamesePrompt, japaneseReference, trimmedInput, readingReference, isWordMode);
    } else {
      return await callOpenAIAPI(apiKey, vietnamesePrompt, japaneseReference, trimmedInput, readingReference, isWordMode);
    }
  } catch (error) {
    console.error("Lỗi khi gọi AI API:", error);
    const localFallback = evaluateLocally(vietnamesePrompt, japaneseReference, trimmedInput, readingReference, isWordMode);
    localFallback.feedback += " (Lưu ý: Không kết nối được API, đang dùng bộ chấm điểm dự phòng).";
    return localFallback;
  }
}

// Bộ nhớ đệm mô hình Gemini đang hoạt động thành công
let activeGeminiModel: string = "gemini-3.8-flash";

const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function safeParseJson(rawText: string) {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
  }
  return JSON.parse(cleaned);
}

/**
 * Gọi Google Generative Language API với mô hình gemini-3.8-flash được ưu tiên hàng đầu,
 * có cơ chế tự động fallback mượt mà nếu API key chưa hỗ trợ một mã hiệu nhất định.
 */
async function fetchGeminiGenerate(
  apiKey: string,
  promptText: string,
  timeoutMs: number = 8000
): Promise<string> {
  const modelsToTry = [
    activeGeminiModel,
    ...GEMINI_CANDIDATE_MODELS.filter((m) => m !== activeGeminiModel),
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          activeGeminiModel = model;
          return rawText;
        }
      }

      const errorText = await response.text();
      console.warn(`[Gemini API] Model ${model} trả về lỗi ${response.status}:`, errorText);
      lastError = new Error(`Gemini ${model} error (${response.status}): ${errorText}`);

      if (response.status === 400 || response.status === 403) {
        throw lastError;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.warn(`[Gemini API] Model ${model} timeout sau ${timeoutMs}ms`);
      }
      lastError = err;
      if (err.message && (err.message.includes("400") || err.message.includes("403") || err.message.includes("API_KEY_INVALID"))) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến mô hình Gemini");
}

async function callGeminiAPI(
  apiKey: string,
  vi: string,
  jaRef: string,
  userJa: string,
  readingRef?: string,
  isWordMode: boolean = false
): Promise<AIEvaluationResult> {
  const systemPrompt = isWordMode
    ? `Bạn là chuyên gia tiếng Nhật JLPT N2. Hãy chấm bài kiểm tra từ vựng / Hán tự của người học:
Nghĩa cần biểu đạt: "${vi}"
Từ vựng / Hán tự chuẩn: "${jaRef}" ${readingRef ? `(Cách đọc Hiragana: ${readingRef})` : ""}
Câu trả lời của người học: "${userJa}"

Quy tắc chấm điểm:
1. Nếu người học viết đúng chữ Hán "${jaRef}" hoặc viết đúng cách đọc Hiragana "${readingRef || jaRef}", hãy cho 10/10 điểm (isAccurate: true).
2. Nếu người học dùng từ đồng nghĩa chuẩn hoặc cách biểu đạt tương đương chính xác trong tiếng Nhật, hãy cho điểm từ 8-10.
3. Nếu người học viết sai hoặc nhầm lẫn, hãy chỉ rõ lỗi và hướng dẫn cách viết/đọc đúng.

Trả về định dạng JSON thuần túy (không kèm markdown code block):
{
  "score": số từ 0 đến 10,
  "isAccurate": true hoặc false (true nếu score >= 7),
  "feedback": "Nhận xét chi tiết bằng tiếng Việt về chữ Hán, cách đọc hoặc từ vựng",
  "suggestion": "Từ vựng chuẩn: ${jaRef}${readingRef ? ` 【${readingRef}】` : ""}"
}`
    : `Bạn là chuyên gia khảo thí tiếng Nhật JLPT N2. Hãy chấm điểm câu dịch tiếng Nhật của người học:
Câu tiếng Việt: "${vi}"
Câu tiếng Nhật mẫu chuẩn: "${jaRef}"
Câu người học dịch: "${userJa}"

Hãy đánh giá xem câu của người học có truyền tải đúng ngữ nghĩa và đúng ngữ pháp N2 không. Chấp nhận các cách diễn đạt tương đương tự nhiên.
Trả về định dạng JSON thuần túy (không kèm markdown code block):
{
  "score": số từ 0 đến 10,
  "isAccurate": true hoặc false (true nếu score >= 7),
  "feedback": "Nhận xét chi tiết bằng tiếng Việt về ngữ pháp, trợ từ và từ vựng",
  "suggestion": "Câu viết gợi ý tự nhiên hơn nếu có"
}`;

  const rawText = await fetchGeminiGenerate(apiKey, systemPrompt);
  const parsed = safeParseJson(rawText);

  return {
    score: typeof parsed.score === "number" ? parsed.score : 8,
    isAccurate: typeof parsed.isAccurate === "boolean" ? parsed.isAccurate : (parsed.score >= 7),
    feedback: parsed.feedback || (isWordMode ? "Từ vựng chính xác." : "Câu dịch khá tốt."),
    suggestion: parsed.suggestion,
    source: "gemini",
  };
}

async function callOpenAIAPI(
  apiKey: string,
  vi: string,
  jaRef: string,
  userJa: string,
  readingRef?: string,
  isWordMode: boolean = false
): Promise<AIEvaluationResult> {
  const systemInstruction = isWordMode
    ? "Bạn là giáo viên JLPT N2. Chấm bài kiểm tra từ vựng / Hán tự (chấp nhận cả Kanji đúng hoặc cách đọc Hiragana đúng). Trả về JSON: {score: number, isAccurate: boolean, feedback: string, suggestion: string}"
    : "Bạn là giáo viên JLPT N2. Chấm bản dịch tiếng Nhật. Trả về JSON: {score: number, isAccurate: boolean, feedback: string, suggestion: string}";

  const userContent = isWordMode
    ? `Nghĩa cần dịch: ${vi}\nTừ vựng chuẩn: ${jaRef} ${readingRef ? `(Đọc: ${readingRef})` : ""}\nNgười học viết: ${userJa}`
    : `Câu gốc tiếng Việt: ${vi}\nCâu mẫu Nhật: ${jaRef}\nCâu học viên: ${userJa}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  return {
    score: parsed.score || 8,
    isAccurate: parsed.isAccurate ?? (parsed.score >= 7),
    feedback: parsed.feedback || (isWordMode ? "Từ vựng chính xác." : "Bản dịch đã truyền tải được nội dung."),
    suggestion: parsed.suggestion,
    source: "openai",
  };
}

/**
 * Đánh giá dự phòng offline bằng thuật toán đối sánh từ vựng & cấu trúc
 */
function evaluateLocally(
  vi: string,
  jaRef: string,
  userJa: string,
  readingRef?: string,
  isWordMode: boolean = false
): AIEvaluationResult {
  const cleanRef = jaRef.replace(/[。、！？\s]/g, "").trim();
  const cleanUser = userJa.replace(/[。、！？\s]/g, "").trim();
  const cleanReading = readingRef ? readingRef.replace(/[。、！？\s]/g, "").trim() : "";

  // 1. Chế độ Từ vựng / Hán tự
  if (isWordMode) {
    // Trùng khớp hoàn toàn với Kanji
    if (cleanUser === cleanRef) {
      return {
        score: 10,
        isAccurate: true,
        feedback: `Chính xác tuyệt đối 100%! Bạn đã viết đúng chuẩn từ vựng Hán tự "${jaRef}".`,
        suggestion: readingRef ? `Cách đọc: ${readingRef}` : undefined,
        source: "offline-rule",
      };
    }

    // Trùng khớp hoàn toàn với Hiragana reading
    if (cleanReading && cleanUser === cleanReading) {
      return {
        score: 10,
        isAccurate: true,
        feedback: `Chính xác tuyệt đối 100%! Bạn đã nhớ đúng cách đọc Hiragana "${readingRef}".`,
        suggestion: `Từ vựng Hán tự chuẩn: ${jaRef}${readingRef ? ` 【${readingRef}】` : ""}`,
        source: "offline-rule",
      };
    }

    // Viết đúng một phần hoặc có thêm okurigana
    if (cleanRef.includes(cleanUser) || cleanUser.includes(cleanRef)) {
      return {
        score: 8,
        isAccurate: true,
        feedback: `Rất tốt! Bạn đã nhập gần đúng từ vựng (${cleanUser}).`,
        suggestion: `Từ vựng chuẩn: ${jaRef}${readingRef ? ` 【${readingRef}】` : ""}`,
        source: "offline-rule",
      };
    }

    if (cleanReading && (cleanReading.includes(cleanUser) || cleanUser.includes(cleanReading))) {
      return {
        score: 8,
        isAccurate: true,
        feedback: `Rất tốt! Bạn đã nhớ gần đúng cách đọc (${cleanUser}).`,
        suggestion: `Cách đọc chuẩn: ${readingRef} (Kanji: ${jaRef})`,
        source: "offline-rule",
      };
    }

    return {
      score: 4,
      isAccurate: false,
      feedback: `Chưa chính xác. Từ tiếng Nhật chuẩn là "${jaRef}"${readingRef ? ` 【${readingRef}】` : ""}.`,
      suggestion: `Đáp án: ${jaRef}${readingRef ? ` 【${readingRef}】` : ""}`,
      source: "offline-rule",
    };
  }

  // 2. Chế độ Câu dịch
  if (cleanUser === cleanRef) {
    return {
      score: 10,
      isAccurate: true,
      feedback: "Chính xác tuyệt đối 100%! Bản dịch hoàn toàn trùng khớp với câu mẫu chuẩn.",
      source: "offline-rule",
    };
  }

  // Đếm các ký tự / kanji chung
  let commonChars = 0;
  for (const char of cleanUser) {
    if (cleanRef.includes(char)) {
      commonChars++;
    }
  }

  const similarity = cleanRef.length > 0 ? commonChars / cleanRef.length : 0;
  const score = Math.min(10, Math.max(3, Math.round(similarity * 10)));
  const isAccurate = score >= 7;

  return {
    score,
    isAccurate,
    feedback: isAccurate
      ? `Bản dịch có độ tương đồng tốt (${score}/10). Bạn đã nắm được từ khóa chính và cấu trúc câu.`
      : `Bản dịch đạt ${score}/10. Hãy xem lại trợ từ hoặc các từ vựng trọng tâm trong câu mẫu gốc.`,
    suggestion: `Câu mẫu chuẩn: ${jaRef}`,
    source: "offline-rule",
  };
}

export interface GeneratedSentenceResult {
  vi: string;
  ja: string;
  hint?: string;
}

/**
 * Hàm gọi AI để sinh ra 1 CÂU TIẾNG VIỆT thực tế để học viên đặt câu / luyện dịch sang tiếng Nhật
 */
export async function generatePracticeSentenceWithAI(params: {
  targetWord: string;
  reading?: string;
  meaning?: string;
  explanation?: string;
  apiKey?: string;
  provider?: "gemini" | "openai";
}): Promise<GeneratedSentenceResult> {
  const { targetWord, reading, meaning, explanation, apiKey, provider = "gemini" } = params;

  if (!apiKey) {
    return generateSentenceLocally(targetWord, reading, meaning, explanation);
  }

  const systemPrompt = `Bạn là chuyên gia giảng dạy tiếng Nhật JLPT N2. Hãy sáng tạo 1 CÂU TIẾNG VIỆT thực tế, tự nhiên trong đời sống hoặc công việc để người học luyện dịch sang tiếng Nhật (sử dụng từ vựng/ngữ pháp mục tiêu).

Từ vựng / Ngữ pháp: "${targetWord}"
Cách đọc: "${reading || targetWord}"
Ý nghĩa: "${meaning || ''}"
${explanation ? `Ngữ cảnh: "${explanation}"` : ""}

YÊU CẦU BẮT BUỘC:
1. "vi": Phải là MỘT CÂU TIẾNG VIỆT HOÀN CHỈNH mang tính giao tiếp hoặc ngữ cảnh N2 thực tế để người học dịch (TUYỆT ĐỐI KHÔNG viết câu mệnh lệnh dạng "Hãy đặt câu với...").
Ví dụ với từ "険しい": "Con đường núi phía trước rất dốc và hiểm trở, hãy cẩn thận khi bước đi."
2. "ja": Câu tiếng Nhật mẫu chuẩn N2 tương ứng có sử dụng "${targetWord}".
3. "hint": Gợi ý ngắn gọn bằng tiếng Việt về trợ từ hoặc cách dùng.

Trả về định dạng JSON thuần túy (không kèm markdown):
{
  "vi": "Câu tiếng Việt hoàn chỉnh...",
  "ja": "Câu tiếng Nhật chuẩn N2...",
  "hint": "Gợi ý..."
}`;

  try {
    if (provider === "gemini") {
      const rawText = await fetchGeminiGenerate(apiKey, systemPrompt);
      const parsed = safeParseJson(rawText);
      if (parsed.vi && parsed.ja) {
        return {
          vi: parsed.vi,
          ja: parsed.ja,
          hint: parsed.hint || `Sử dụng "${targetWord}"`,
        };
      }
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Bạn là giáo viên JLPT N2. Hãy tạo 1 câu tiếng Việt thực tế để học viên dịch sang tiếng Nhật (kèm câu tiếng Nhật chuẩn N2). Trả về JSON: {vi: string, ja: string, hint: string}",
            },
            {
              role: "user",
              content: systemPrompt,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI generate error: ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      if (parsed.vi && parsed.ja) {
        return {
          vi: parsed.vi,
          ja: parsed.ja,
          hint: parsed.hint || `Sử dụng "${targetWord}"`,
        };
      }
    }
  } catch (error) {
    console.error("Lỗi khi dùng AI tạo đề tiếng Việt, dùng phương án dự phòng:", error);
  }

  return generateSentenceLocally(targetWord, reading, meaning, explanation);
}

/**
 * Bộ tạo câu tiếng Việt luyện dịch ngoại tuyến chất lượng cao
 */
function generateSentenceLocally(
  targetWord: string,
  reading?: string,
  meaning?: string,
  explanation?: string
): GeneratedSentenceResult {
  const displayReading = reading && reading !== targetWord ? ` (${reading})` : "";
  const cleanMeaning = meaning ? meaning.replace(/[;,].*$/, "").trim() : targetWord;

  // Xây dựng câu tiếng Việt hoàn chỉnh thay vì câu mệnh lệnh
  const templates = [
    {
      vi: `Tình huống hiện tại đang diễn biến khá phức tạp, mọi người cần đặc biệt chú ý đến ${cleanMeaning}.`,
      ja: `現在の状況はかなり複雑に推移しており、皆さんは特に${targetWord}に注意を払う必要があります。`,
    },
    {
      vi: `Trong công việc văn phòng hàng ngày, việc nắm vững cách xử lý ${cleanMeaning} là vô cùng cần thiết.`,
      ja: `日々の事務業務において、${targetWord}への対応方法を身につけることは極めて重要です。`,
    },
    {
      vi: `Theo thông báo mới nhất từ công ty, kế hoạch này sẽ sớm được triển khai một cách cẩn trọng.`,
      ja: `会社からの最新の通知によると、この計画は${targetWord}を考慮して慎重に進められる予定です。`,
    },
  ];

  const charCodeSum = targetWord.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const selected = templates[Math.abs(charCodeSum) % templates.length];

  return {
    vi: selected.vi,
    ja: selected.ja,
    hint: `Vận dụng từ vựng "${targetWord}"${displayReading} theo đúng văn cảnh N2.`,
  };
}
