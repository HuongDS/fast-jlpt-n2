const fs = require('fs');
const path = require('path');

function getDistractors(correct, pool, count = 3) {
  const filtered = Array.from(new Set(pool.filter(item => item && item !== correct)));
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function extractReadingFromFurigana(furi) {
  if (!furi) return '';
  return furi
    .replace(/([^\s\[\]]+)\[([^\]]+)\]/g, '$2')
    .replace(/\s+/g, '')
    .trim();
}

// Từ điển chủ đề tiếng Việt cho Kanji Soumatome 8 tuần
const KANJI_WEEK_THEMES = {
  1: {
    name: 'Giao thông & Biển báo',
    days: {
      1: 'Biển báo nguy hiểm & Cấm chỉ',
      2: 'Nơi công cộng & Thủ tục',
      3: 'Cửa hàng & Giờ mở cửa',
      4: 'Ga tàu điện & Bán vé',
      5: 'Sân bay & Chuyến bay',
      6: 'Bưu điện & Dịch vụ bưu chính',
      7: 'Bảng chỉ dẫn & Ôn tập Tuần 1'
    }
  },
  2: {
    name: 'Đi lại, Tiền tệ & Thiết bị',
    days: {
      1: 'Vé tàu xe & Đi lại hàng ngày',
      2: 'Tiền mặt & Giao dịch ngân hàng',
      3: 'Nhiệt độ & Thời tiết',
      4: 'Cài đặt thiết bị & Điều hòa',
      5: 'Khí hậu & Đồ dùng di động',
      6: 'Thông tin liên lạc & Thư từ',
      7: 'Cặp từ trái nghĩa & Ôn tập Tuần 2'
    }
  },
  3: {
    name: 'Mua sắm, Hàng hóa & Đời sống',
    days: {
      1: 'Tình trạng & Biểu hiện',
      2: 'Mối quan hệ & Liên lạc',
      3: 'Hàng hóa & Cửa hàng',
      4: 'Đồ dùng cần thiết & Bao bì',
      5: 'Khó khăn & Phòng tránh nạn',
      6: 'Kết quả & Trái ngọt',
      7: 'Thời gian & Ôn tập Tuần 3'
    }
  },
  4: {
    name: 'Thủ tục, Xã hội & Quan hệ',
    days: {
      1: 'Ký tên & Cơ quan công quyền',
      2: 'Hôn nhân & Lễ cưới',
      3: 'Tuổi tác, Bạn bè & Vĩnh cửu',
      4: 'Phúc lợi, May mắn & Viếng thăm',
      5: 'Thứ tự thi cử & Bài viết',
      6: 'Chuyên ngành & Ước mơ',
      7: 'Sức khỏe cơ thể & Ôn tập Tuần 4'
    }
  },
  5: {
    name: 'Công việc, Tính cách & Đồ vật',
    days: {
      1: 'Xu hướng & Hướng nghiêng',
      2: 'Chất liệu vải len & Sợi may',
      3: 'Mục đích sử dụng & Công cụ',
      4: 'Danh thiếp, Kích thích & Đau mỏi',
      5: 'Giải thưởng & Hạn sử dụng',
      6: 'Âm thanh & Thăm hỏi',
      7: 'Thiên nhiên hoang sơ & Ôn tập Tuần 5'
    }
  },
  6: {
    name: 'Môi trường, Địa điểm & Xã hội',
    days: {
      1: 'Lợi ích, Thuyết phục & Quảng cáo',
      2: 'Đóng gói đồ hộp & Đồng ruộng',
      3: 'Suối nước nóng & Trọ học',
      4: 'Khu vực xung quanh & Khám bệnh',
      5: 'Tài sản, Du lịch & Khách tham quan',
      6: 'Tầng cao, Lời hứa & Bó hoa',
      7: 'Nghề đánh bắt cá & Ôn tập Tuần 6'
    }
  },
  7: {
    name: 'Học tập, Tuyển dụng & Hàng không',
    days: {
      1: 'Tuyển dụng & Yêu cầu đơn từ',
      2: 'Sân trường & Giáo dục thể chất',
      3: 'Hải sản & Quán rượu',
      4: 'Phong bì, Giấy tờ & Tốt nghiệp',
      5: 'Hàng không & Chuyến bay',
      6: 'Tỷ lệ, Xác suất & Thẳng thắn',
      7: 'Thuyền chài & Ôn tập Tuần 7'
    }
  },
  8: {
    name: 'Địa lý, Pháp luật & Thời sự',
    days: {
      1: 'Khu vực địa lý & Sóng điện từ',
      2: 'Mẫu hình điển hình & Gian nan',
      3: 'Vũ khí & Khối lượng khổng lồ',
      4: 'Đầu não & Lãnh đạo cấp cao',
      5: 'Phê bình, Đánh giá & Tòa án',
      6: 'Môi trường xung quanh & Ranh giới',
      7: 'Tác giả, Tăng trưởng & Ôn tập Tuần 8'
    }
  }
};

// Từ điển chủ đề Ngữ pháp Soumatome 48 bài
const GRAMMAR_THEMES = {
  '熱っぽい': 'Cảm giác, Khuynh hướng (〜げ / 〜がち / 〜っぽい / 〜気味)',
  '空を飛びたいんだもの': 'Lý do & Nguyện vọng (〜ものなら / 〜ものだから / 〜ものの)',
  '見た目はともかく': 'So sánh & Bỏ qua (〜はもとより / 〜はともかく / 〜抜きで)',
  'かゆくてたまらない': 'Cảm xúc tột cùng (〜てたまらない / 〜てしょうがない / 〜てならない)',
  'やめられないことはない': 'Khẳng định mềm & Không thể đừng (〜ないことはない / 〜ずにはいられない)',
  '見ていられない': 'Bắt buộc & Không thể chịu nổi (〜ねばならない / 〜てはいられない)',
  'がんばったかいがあった': 'Kết quả xứng đáng & Thậm chí (〜かいがあって / 〜てまで)',
  'ありえない': 'Dở dang, Toàn bộ & Khả năng (〜かける / 〜きる / 〜える / 〜抜く)',
  '本日限り': 'Thời điểm & Giới hạn (〜うちに / 〜か〜ないかのうちに / 〜に限り)',
  '君さえいれば': 'Điều kiện & Nhấn mạnh (〜さえ〜ば / 〜からこそ / 〜てこそ)',
  '外国へ行くとしたら': 'Giả định & Điều kiện (〜としたら / 〜としても / 〜ないことには)',
  '高くなるにしたがって': 'Biến đổi tỷ lệ tương ứng (〜にしたがって / 〜につれて / 〜に伴って)',
  '予報どおり': 'Đúng như dự đoán & Tình trạng (〜どおり / 〜まま / 〜っぱなし)',
  '太るわけだ': 'Đương nhiên là & Lý do (〜わけだ / 〜わけがない / 〜わけではない)',
  'かじったとたん': 'Ngay khi & Khoảnh khắc (〜たとたん / 〜と同時に / 〜ついでに)',
  'お急ぎのところ': 'Hoàn cảnh & Thời điểm tế nhị (〜ところ / 〜どころではない / 〜どころか)',
  'ほこりだらけ': 'Tràn ngập & Đầy rẫy (〜だらけ / 〜ずくめ / 〜まみれ)',
  '上がる一方だ': 'Tiến triển một chiều & Thay đổi (〜一方だ / 〜ばかりだ)',
  '地図の上では': 'Trên phương diện & Về mặt (〜上(は) / 〜上(で) / 〜の上)',
  '子供向け': 'Dành riêng & Hướng tới đối tượng (〜向け / 〜向き)',
  '期待にこたえて': 'Đáp lại & Hướng về (〜にこたえて / 〜に対して / 〜をめぐって)',
  '知りつつ': 'Mặc dù & Vừa làm vừa (〜つつ / 〜つつある / 〜ながらも)',
  'せざるをえない': 'Buộc phải làm & Không thể không (〜ざるをえない / 〜ほかない)',
  '使用にあたって': 'Nhân dịp & Trong khi tiến hành (〜にあたって / 〜に際して)',
  '信じがたい': 'Khó mà & Không thể nào (〜がたい / 〜かねる / 〜ようがない)',
  'あの人のことだから': 'Bởi vì chính là người đó (〜のことだから / 〜だけに / 〜ばかりに)',
  'あるだけましだ': 'Vẫn còn tốt chán & Ít nhất là (〜だけましだ / 〜のみならず)',
  '選手だっただけに': 'Chính vì là... nên càng (〜だけに / 〜ばかりか)',
  '片付けようがない': 'Không còn cách nào để (〜ようがない / 〜どころではない)',
  '事実に基づいて': 'Dựa trên căn cứ & Nền tảng (〜に基づいて / 〜をもとに / 〜に沿って)',
  '決めた以上': 'Một khi đã... thì phải (〜以上(は) / 〜上は / 〜からには)',
  'ぼくから見ると': 'Đứng từ góc nhìn & Quan điểm (〜から見ると / 〜からすると / 〜にしては)',
  '声の大きさにかけては': 'Nói về mặt... thì không thua ai (〜にかけては / 〜にかけて)',
  '行こうか行くまいか': 'Có nên hay không nên (〜(よ)うか〜まいか / 〜にしろ〜にしろ)',
  '負けるに決まっている': 'Chắc chắn là & Không nghi ngờ gì (〜に決まっている / 〜に違いない)',
  '金メダルをめぐって': 'Xoay quanh vấn đề & Tranh luận (〜をめぐって / 〜に関して)',
  '国籍を問わず': 'Không kể & Bất chấp (〜を問わず / 〜にかかわらず / 〜もかまわず)',
  'クッキーもあればケーキもある': 'Vừa có cái này vừa có cái kia (〜も〜ば〜も / 〜ばかりか)',
  '勉強するものだ': 'Bản chất tự nhiên & Lời khuyên nên (〜ものだ / 〜ものではない)',
  '心をこめて': 'Gửi gắm tâm huyết & Tình cảm (〜をこめて / 〜を通じて)',
  'すばらしいものがある': 'Có điểm... rất đáng khen (〜ものがある / 〜ことか)',
  '失敗をもとに': 'Lấy làm bài học & Cơ sở (〜をもとにして / 〜をきっかけに)',
  'それなのに': 'Liên từ đối lập & Bất ngờ (それなのに / それにしては / それでも)',
  'そういえば。。。': 'Liên từ gợi nhớ & Chuyển ý (そういえば / それにしても)',
  'だって': 'Liên từ giải thích & Phân bua (だって / なぜなら / というのも)',
  'ということは。。。': 'Liên từ suy luận & Kết luận (ということは / つまり)',
  'もっとも': 'Liên từ bổ sung ngoại lệ (もっとも / ただし / なお)',
  'おまけに': 'Liên từ cộng thêm & Hơn nữa (おまけに / そのうえ / しかも)'
};

function buildKanjiSoumatome() {
  console.log('Building Kanji Soumatome...');
  const content = fs.readFileSync('Nihongo So-Matome N2 Kanji.txt', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => !l.startsWith('#') && l.trim());
  
  const tagGroups = new Map();
  lines.forEach(l => {
    const parts = l.split('\t');
    const tag = (parts[3] || '第１週１日目').trim();
    if (!tagGroups.has(tag)) tagGroups.set(tag, []);
    tagGroups.get(tag).push(parts);
  });

  const allReadings = [];
  lines.forEach(l => {
    const parts = l.split('\t');
    const rm = (parts[1] || parts[2] || '').trim();
    const latinIdx = rm.search(/[a-zA-Z]/);
    const reading = latinIdx > 0 ? rm.substring(0, latinIdx).trim() : (parts[1] || '').trim();
    if (reading) allReadings.push(reading);
  });

  const sections = [];
  let secIdx = 1;

  for (const [tag, rows] of tagGroups.entries()) {
    const match = tag.match(/第([１-８1-8])週([１-７1-7])日目/);
    let w = Math.ceil(secIdx / 7), d = ((secIdx - 1) % 7) + 1;
    if (match) {
      const fullToHalf = { '１': 1, '２': 2, '３': 3, '４': 4, '５': 5, '６': 6, '７': 7, '８': 8 };
      w = fullToHalf[match[1]] || parseInt(match[1], 10);
      d = fullToHalf[match[2]] || parseInt(match[2], 10);
    }
    const secId = `ks-w${w}d${d}`;
    const title = `Tuần ${w} • Ngày ${d}`;
    
    const themeDay = KANJI_WEEK_THEMES[w]?.days[d] || `Chủ đề Hán tự Tuần ${w} Ngày ${d}`;
    const subtitle = themeDay;
    const groupTitle = `Tuần ${w}: ${KANJI_WEEK_THEMES[w]?.name || 'Hán tự tổng hợp'}`;

    // Lấy 4 từ vựng tiêu biểu đại diện làm preview
    const previewItems = rows.slice(0, 4).map(r => r[0].trim());

    const secReadings = rows.map(r => {
      const rm = (r[1] || r[2] || '').trim();
      const latinIdx = rm.search(/[a-zA-Z]/);
      return latinIdx > 0 ? rm.substring(0, latinIdx).trim() : (r[1] || '').trim();
    }).filter(Boolean);

    const flashcards = rows.map((r, cardIdx) => {
      const word = r[0].trim();
      const rm = (r[1] || r[2] || '').trim();
      const latinIdx = rm.search(/[a-zA-Z]/);
      const reading = latinIdx > 0 ? rm.substring(0, latinIdx).trim() : (r[1] || '').trim();
      const meaning = latinIdx > 0 ? rm.substring(latinIdx).trim() : (r[2] || rm).trim();
      
      const cardId = `ks-w${w}d${d}-${cardIdx + 1}`;
      const correctAnswer = reading || word;
      
      const pool = secReadings.length >= 4 ? secReadings : allReadings;
      const distractors = getDistractors(correctAnswer, pool, 3);
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: cardId,
        bookId: 'kanji-soumatome',
        sectionId: secId,
        question: word,
        reading: reading,
        meaning: meaning,
        options,
        correctAnswer,
        explanation: `Từ vựng Hán tự N2: ${word} (${reading}) — Nghĩa: ${meaning}.`,
        questionType: 'meaning'
      };
    });

    sections.push({
      id: secId,
      bookId: 'kanji-soumatome',
      title,
      subtitle,
      week: w,
      groupTitle,
      previewItems,
      estimatedMinutes: Math.max(5, Math.ceil(flashcards.length * 0.4)),
      flashcards
    });
    secIdx++;
  }

  return {
    id: 'kanji-soumatome',
    title: 'Kanji Soumatome N2',
    badge: 'Hán tự N2',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconName: 'Languages',
    description: 'Trọn bộ 2.210 chữ Hán & từ vựng N2 chia theo 8 tuần luyện thi thực chiến',
    sections
  };
}

function buildGrammarSoumatome() {
  console.log('Building Grammar Soumatome...');
  const content = fs.readFileSync('Grammar_N2.txt', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => !l.startsWith('#') && l.trim());

  const tagGroups = new Map();
  const unclassified = [];

  lines.forEach(l => {
    const parts = l.split('\t');
    const tag = (parts[7] || '').trim();
    if (!tag) {
      unclassified.push(parts);
    } else if (!tag.startsWith('N3_')) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, []);
      tagGroups.get(tag).push(parts);
    }
  });

  const allMeanings = lines.map(l => l.split('\t')[3]?.trim()).filter(Boolean);

  const sections = [];
  let dayIdx = 0;

  for (const [tag, rows] of tagGroups.entries()) {
    const w = Math.floor(dayIdx / 6) + 1;
    const d = (dayIdx % 6) + 1;
    const secId = `gs-w${w}d${d}`;
    const title = `Tuần ${w} • Ngày ${d}`;
    const subtitle = GRAMMAR_THEMES[tag] || `Chủ đề: ${tag}`;
    const groupTitle = `Tuần ${w}: Ngữ pháp mục tiêu N2`;

    // Lấy 3 mẫu câu hoặc từ khóa đại diện
    const previewItems = Array.from(new Set(
      rows.map(r => r[4]?.trim() || '').filter(Boolean).map(n => n.split(/[\s,、]/)[0])
    )).slice(0, 4);
    if (previewItems.length === 0) {
      previewItems.push(tag);
    }

    const secMeanings = rows.map(r => r[3]?.trim()).filter(Boolean);

    const flashcards = rows.map((r, cardIdx) => {
      const sentence = r[0].trim();
      const furigana = (r[2] || sentence).trim();
      const meaning = (r[3] || '').trim();
      const note = (r[4] || '').trim();
      const cardId = `gs-w${w}d${d}-${cardIdx + 1}`;

      const pool = secMeanings.length >= 4 ? secMeanings : allMeanings;
      const distractors = getDistractors(meaning, pool, 3);
      const options = [meaning, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: cardId,
        bookId: 'grammar-soumatome',
        sectionId: secId,
        question: sentence,
        reading: note ? `〜 ${note}` : undefined,
        meaning,
        options,
        correctAnswer: meaning,
        explanation: `${note ? 'Ghi chú / Mẫu câu: ' + note + '. ' : ''}Thuộc chủ đề: ${tag}.`,
        example: furigana,
        exampleMeaning: meaning,
        questionType: 'grammar'
      };
    });

    sections.push({
      id: secId,
      bookId: 'grammar-soumatome',
      title,
      subtitle,
      week: w,
      groupTitle,
      previewItems,
      estimatedMinutes: Math.max(5, Math.ceil(flashcards.length * 0.5)),
      flashcards
    });
    dayIdx++;
  }

  // Include unclassified N2 grammar rows as extra advanced sections
  if (unclassified.length > 0) {
    const chunkSize = 20;
    for (let i = 0; i < unclassified.length; i += chunkSize) {
      const chunk = unclassified.slice(i, i + chunkSize);
      const advNum = Math.floor(i / chunkSize) + 1;
      const secId = `gs-adv-${advNum}`;
      const title = `Chuyên đề ${advNum}`;
      const subtitle = `Mẫu câu tổng hợp ứng dụng cao (${chunk.length} câu ví dụ thực tế)`;
      const groupTitle = `Chuyên đề N2 Nâng cao`;

      const previewItems = chunk.slice(0, 3).map(r => {
        const sentence = r[0].trim();
        return sentence.length > 12 ? sentence.substring(0, 12) + '...' : sentence;
      });

      const chunkMeanings = chunk.map(r => r[3]?.trim()).filter(Boolean);

      const flashcards = chunk.map((r, cardIdx) => {
        const sentence = r[0].trim();
        const furigana = (r[2] || sentence).trim();
        const meaning = (r[3] || '').trim();
        const note = (r[4] || '').trim();
        const cardId = `gs-adv-${advNum}-${cardIdx + 1}`;

        const pool = chunkMeanings.length >= 4 ? chunkMeanings : allMeanings;
        const distractors = getDistractors(meaning, pool, 3);
        const options = [meaning, ...distractors].sort(() => Math.random() - 0.5);

        return {
          id: cardId,
          bookId: 'grammar-soumatome',
          sectionId: secId,
          question: sentence,
          reading: note || undefined,
          meaning,
          options,
          correctAnswer: meaning,
          explanation: note ? `Phân tích: ${note}` : 'Ngữ pháp thực chiến N2.',
          example: furigana,
          exampleMeaning: meaning,
          questionType: 'grammar'
        };
      });

      sections.push({
        id: secId,
        bookId: 'grammar-soumatome',
        title,
        subtitle,
        week: 9, // Group as week 9+
        groupTitle,
        previewItems,
        estimatedMinutes: Math.max(5, Math.ceil(flashcards.length * 0.5)),
        flashcards
      });
    }
  }

  return {
    id: 'grammar-soumatome',
    title: 'Ngữ pháp Soumatome N2',
    badge: 'Ngữ pháp theo tuần',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    iconName: 'BookOpenCheck',
    description: 'Hệ thống ngữ pháp theo từng tuần, ví dụ ngắn gọn dễ nhớ kèm giải thích mẫu câu',
    sections
  };
}

function buildGrammarShinkanzen() {
  console.log('Building Grammar Shinkanzen...');
  const content = fs.readFileSync('Grammar_N2_shin.txt', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => !l.startsWith('#') && l.trim());

  const lessonGroups = new Map();
  const allPatterns = [];

  lines.forEach(l => {
    const parts = l.split('\t');
    const lesson = (parts[1] || '1課').trim();
    const pattern = (parts[3] || '').trim();
    if (pattern && !allPatterns.includes(pattern)) allPatterns.push(pattern);
    if (!lessonGroups.has(lesson)) lessonGroups.set(lesson, []);
    lessonGroups.get(lesson).push(parts);
  });

  const sections = [];

  for (const [lesson, rows] of lessonGroups.entries()) {
    const lessonNum = parseInt(lesson.replace(/[^0-9]/g, ''), 10) || 1;
    const secId = `gsk-b${lessonNum}`;
    const topic = (rows[0][2] || '').trim();
    const title = `Bài ${lessonNum}`;
    const subtitle = topic ? `${topic}` : `Chương ${lessonNum}`;
    const groupTitle = `Ngữ pháp Chuyên sâu Shinkanzen`;

    // Lấy tất cả mẫu ngữ pháp độc nhất làm preview
    const secPatterns = Array.from(new Set(rows.map(r => r[3]?.trim()).filter(Boolean)));
    const previewItems = secPatterns.slice(0, 4);

    const flashcards = rows.map((r, cardIdx) => {
      const pattern = r[3]?.trim() || '';
      const sentence = r[4]?.trim() || '';
      const furigana = r[5]?.trim() || sentence;
      const connection = r[6]?.trim() || '';
      const meaningEn = r[7]?.trim() || '';
      const nuance = r[8]?.trim() || '';
      const cardId = `gsk-b${lessonNum}-${cardIdx + 1}`;

      const pool = secPatterns.length >= 4 ? secPatterns : allPatterns;
      const distractors = getDistractors(pattern, pool, 3);
      const options = [pattern, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: cardId,
        bookId: 'grammar-shinkanzen',
        sectionId: secId,
        question: sentence,
        reading: pattern,
        meaning: meaningEn,
        options,
        correctAnswer: pattern,
        explanation: `Mẫu câu: ${pattern}. Cấu trúc: ${connection}. Ý nghĩa: ${nuance} (${meaningEn}).`,
        example: furigana,
        exampleMeaning: `Ý nghĩa: ${nuance} — ${meaningEn}`,
        questionType: 'grammar'
      };
    });

    sections.push({
      id: secId,
      bookId: 'grammar-shinkanzen',
      title,
      subtitle,
      groupTitle,
      previewItems,
      estimatedMinutes: Math.max(5, Math.ceil(flashcards.length * 0.5)),
      flashcards
    });
  }

  return {
    id: 'grammar-shinkanzen',
    title: 'Ngữ pháp Shinkanzen N2',
    badge: 'Ngữ pháp chuyên sâu',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    iconName: 'GraduationCap',
    description: 'Phân biệt tinh tế các mẫu ngữ pháp dễ nhầm lẫn trong giáo trình Shinkanzen Master N2',
    sections
  };
}

// Từ điển chủ đề 36 bài Từ vựng Shinkanzen Master
const VOCAB_LESSON_TITLES = {
  1: 'Quan hệ con người & Gia đình (握手, 一家, 奥様)',
  2: 'Tính cách & Thái độ con người (飽きっぽい, 厚かましい)',
  3: 'Tâm lý, Cảm xúc & Tình cảm (あこがれる, ありがたい)',
  4: 'Ẩm thực & Thưởng thức món ăn (味付け, 味わう, 意識)',
  5: 'Nấu nướng & Chế biến thực phẩm (揚げる, 暴れる, 編む)',
  6: 'Cơ thể & Tình trạng sức khỏe (青白い, あくび, 荒れる)',
  7: 'Trang phục & Đồ dùng sinh hoạt (編み物, 粗筋, 違反)',
  8: 'Giao thông, Đường xá & Đi lại (跡, 横断, 往復, 大通り)',
  9: 'Học tập, Trường lớp & Thi cử (暗記, 一時間目, 引用)',
  10: 'Công việc & Cơ quan xí nghiệp (一流校, 会計士, 案外)',
  11: 'Kinh doanh, Mua sắm & Tiền bạc (預ける, 祈る, 打ち合わせ)',
  12: 'Tài chính, Kinh tế & Hàng hóa (赤字, エネルギー, 負う)',
  13: 'Truyền thông, Báo chí & Thời sự (あらゆる, 幾分, いよいよ)',
  14: 'Môi trường tự nhiên & Thời tiết (植える, 生まれる, 影響)',
  15: 'Động vật, Sinh vật & Cây cỏ (えさ, 温暖化, 害虫)',
  16: 'Nhà cửa & Bất động sản (家主, 敷金, 礼金, 賃貸)',
  17: 'Công nghệ, Máy tính & Mạng (インストール, ウイルス)',
  18: 'Thể thao, Thư giãn & Du lịch (個人競技, 団体旅行)',
  19: 'Thời gian, Lịch trình & Khoảnh khắc (明け方, 終始, 時折)',
  20: 'Vị trí, Không gian & Phương hướng (位置, 空間, 沖, 岸)',
  21: 'Số lượng, Mức độ & Tỷ lệ (円, 大いに, 補う, 掛け算)',
  22: 'Trừu tượng, Quan niệm & Triết lý (アイデア, 援助, 各々)',
  23: 'Giao tiếp & Ngôn ngữ ứng xử (あがる, 頭に来る, 言い張る)',
  24: 'Hành động cơ thể & Cử chỉ (足を延ばす, 足を運ぶ)',
  25: 'Phó từ chỉ mức độ & Tần suất (あいにく, あくまで, 思い切り)',
  26: 'Phó từ chỉ tâm trạng & Đánh giá (あたかも, 一体, ちょうど)',
  27: 'Từ tượng thanh & Từ tượng hình (ぐちゃぐちゃ, くっきり)',
  28: 'Từ nối & Quán dụng ngữ thông dụng (腕が上がる, 腕がいい)',
  29: 'Từ ghép tiếp đầu ngữ (悪～, 片～, 旧～, 新～)',
  30: 'Từ ghép tiếp vĩ ngữ (～明け, ～扱い, ～相手, ～園)',
  31: 'Từ ghép dạng V+V (～合う, 遊び回る, 温め直す)',
  32: 'Tính từ đuôi な nâng cao (古典的, 実に, 未～)',
  33: 'Động từ ghép chuyển nghĩa (引き受ける, 見送る, 立ち上がる)',
  34: 'Quán dụng ngữ cơ thể người (頭が上がらない, 気が合う)',
  35: 'Hậu tố tính từ hóa (温かみ, 厚み, 甘み, ありがたさ)',
  36: 'Tổng ôn từ vựng then chốt N2 (ふさがる, ぶつかる, 触れる)'
};

function buildWordShinkanzen() {
  console.log('Building Word Shinkanzen...');
  const content = fs.readFileSync('Word_shinkanzen.txt', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => !l.startsWith('#') && l.trim());

  const rawPages = {};
  const allReadings = [];

  lines.forEach(l => {
    const parts = l.split('\t');
    const pageNum = parseInt((parts[5]?.trim() || '0').split(' ')[0], 10) || 0;
    if (!rawPages[pageNum]) rawPages[pageNum] = [];
    
    const word = parts[0].trim();
    const furi = (parts[1] || '').trim();
    const reading = extractReadingFromFurigana(furi) || word;
    const meaning = (parts[2] || '').trim();
    const note = (parts[3] || '').trim();

    if (reading) allReadings.push(reading);

    rawPages[pageNum].push({
      word,
      furigana: furi,
      reading,
      meaning,
      note,
      page: pageNum
    });
  });

  const sortedPages = Object.keys(rawPages).map(Number).sort((a, b) => a - b);
  const chunks = [];
  let currentChunk = { pageStart: 0, pageEnd: 0, items: [] };

  for (const p of sortedPages) {
    const pItems = rawPages[p];
    if (currentChunk.items.length === 0) {
      currentChunk.pageStart = p;
      currentChunk.pageEnd = p;
      currentChunk.items.push(...pItems);
    } else if ((Math.abs(p - currentChunk.pageEnd) <= 1 && currentChunk.items.length + pItems.length <= 75) || currentChunk.items.length < 30) {
      currentChunk.pageEnd = p;
      currentChunk.items.push(...pItems);
    } else {
      chunks.push(currentChunk);
      currentChunk = { pageStart: p, pageEnd: p, items: [...pItems] };
    }
  }
  if (currentChunk.items.length > 0) chunks.push(currentChunk);

  const sections = chunks.map((chunk, secIdx) => {
    const secNum = secIdx + 1;
    const secId = `wsk-sec-${secNum}`;
    const title = `Bài ${secNum}`;
    const subtitle = VOCAB_LESSON_TITLES[secNum] || `Từ vựng chủ đề bài ${secNum} (Trang ${chunk.pageStart}-${chunk.pageEnd})`;
    const chapterNum = Math.ceil(secNum / 6);
    const groupTitle = `Chương ${chapterNum}: Nhóm từ vựng trọng tâm`;

    const previewItems = chunk.items.slice(0, 4).map(w => w.word);
    const chunkReadings = chunk.items.map(w => w.reading).filter(Boolean);

    const flashcards = chunk.items.map((item, cardIdx) => {
      const cardId = `wsk-sec-${secNum}-${cardIdx + 1}`;
      const correctAnswer = item.reading;

      const pool = chunkReadings.length >= 4 ? chunkReadings : allReadings;
      const distractors = getDistractors(correctAnswer, pool, 3);
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: cardId,
        bookId: 'word-shinkanzen',
        sectionId: secId,
        question: item.word,
        reading: item.reading,
        meaning: item.meaning,
        options,
        correctAnswer,
        explanation: `Từ vựng N2: ${item.word} (${item.reading})${item.note ? ' — ' + item.note : ''}. Nghĩa: ${item.meaning}.`,
        example: item.furigana,
        exampleMeaning: item.meaning,
        questionType: 'meaning'
      };
    });

    return {
      id: secId,
      bookId: 'word-shinkanzen',
      title,
      subtitle,
      groupTitle,
      previewItems,
      estimatedMinutes: Math.max(5, Math.ceil(flashcards.length * 0.4)),
      flashcards
    };
  });

  return {
    id: 'word-shinkanzen',
    title: 'Từ vựng Shinkanzen N2',
    badge: 'Từ vựng chuyên sâu',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    iconName: 'BookMarked',
    description: 'Trọn bộ 2.273 từ vựng Shinkanzen Master N2 phân loại theo chủ đề và mối quan hệ từ',
    sections
  };
}

function main() {
  const outputDir = path.join(__dirname, '..', 'src', 'data', 'books');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const kanjiSoumatome = buildKanjiSoumatome();
  const grammarSoumatome = buildGrammarSoumatome();
  const grammarShinkanzen = buildGrammarShinkanzen();
  const wordShinkanzen = buildWordShinkanzen();

  fs.writeFileSync(
    path.join(outputDir, 'kanji-soumatome.json'),
    JSON.stringify(kanjiSoumatome, null, 2),
    'utf-8'
  );
  console.log(`Saved kanji-soumatome.json: ${kanjiSoumatome.sections.length} sections, ${kanjiSoumatome.sections.reduce((a, s) => a + s.flashcards.length, 0)} cards`);

  fs.writeFileSync(
    path.join(outputDir, 'grammar-soumatome.json'),
    JSON.stringify(grammarSoumatome, null, 2),
    'utf-8'
  );
  console.log(`Saved grammar-soumatome.json: ${grammarSoumatome.sections.length} sections, ${grammarSoumatome.sections.reduce((a, s) => a + s.flashcards.length, 0)} cards`);

  fs.writeFileSync(
    path.join(outputDir, 'grammar-shinkanzen.json'),
    JSON.stringify(grammarShinkanzen, null, 2),
    'utf-8'
  );
  console.log(`Saved grammar-shinkanzen.json: ${grammarShinkanzen.sections.length} sections, ${grammarShinkanzen.sections.reduce((a, s) => a + s.flashcards.length, 0)} cards`);

  fs.writeFileSync(
    path.join(outputDir, 'word-shinkanzen.json'),
    JSON.stringify(wordShinkanzen, null, 2),
    'utf-8'
  );
  console.log(`Saved word-shinkanzen.json: ${wordShinkanzen.sections.length} sections, ${wordShinkanzen.sections.reduce((a, s) => a + s.flashcards.length, 0)} cards`);

  console.log('All books data generated successfully!');
}

main();
