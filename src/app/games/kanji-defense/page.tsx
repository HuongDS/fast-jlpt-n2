"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import * as wanakana from "wanakana";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Flame,
  Heart,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Zap,
  Trophy,
  Target,
  Sparkles,
  Info,
  ChevronRight,
  Crosshair,
  Sun,
  Moon,
  SlidersHorizontal,
  Settings,
  BookMarked,
  Gauge,
  BookOpen,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { useProgressStore } from "@/store/useProgressStore";
import {
  getDefenseWordPool,
  getDefenseSourceCounts,
  normalizeDefenseMatch,
  DefenseWord,
  DefenseSourceMode,
} from "@/data/kanjiDefenseData";
import { FastJlptLogoMark } from "@/components/FastJlptLogo";
import { Toast } from "@/components/Toast";

type DefenseSpeedMode = "slow" | "normal" | "fast" | "extreme";

interface SpeedConfigItem {
  id: DefenseSpeedMode;
  label: string;
  sublabel: string;
  badge: string;
  baseSpeed: number; // Tốc độ di chuyển Y trên mỗi frame 50ms
  spawnInterval: number; // ms giữa 2 lần xuất hiện từ mới
  color: string;
}

const SPEED_CONFIG: Record<DefenseSpeedMode, SpeedConfigItem> = {
  slow: {
    id: "slow",
    label: "Thong thả",
    sublabel: "Dành cho người mới làm quen",
    badge: "0.6x",
    baseSpeed: 0.25,
    spawnInterval: 2800,
    color: "#10b981",
  },
  normal: {
    id: "normal",
    label: "Tiêu chuẩn",
    sublabel: "Tốc độ phản xạ chuẩn JLPT",
    badge: "1.0x",
    baseSpeed: 0.42,
    spawnInterval: 2000,
    color: "#6366f1",
  },
  fast: {
    id: "fast",
    label: "Tốc chiến",
    sublabel: "Luyện gõ tốc độ cao",
    badge: "1.5x",
    baseSpeed: 0.65,
    spawnInterval: 1400,
    color: "#f59e0b",
  },
  extreme: {
    id: "extreme",
    label: "Cuồng phong",
    sublabel: "Thách thức phản xạ đỉnh cao",
    badge: "2.0x",
    baseSpeed: 0.95,
    spawnInterval: 1000,
    color: "#ef4444",
  },
};

interface SourceConfigItem {
  id: DefenseSourceMode;
  title: string;
  desc: string;
  badge?: string;
}

const SOURCE_OPTIONS: SourceConfigItem[] = [
  {
    id: "all",
    title: "Tất cả N2",
    desc: "Tổng hợp toàn bộ Hán tự, từ vựng và ngữ pháp",
  },
  {
    id: "notebook",
    title: "Sổ tay của tôi",
    desc: "Các từ vựng bạn đã lưu riêng trong sổ tay",
    badge: "Cá nhân hóa",
  },
  {
    id: "kanji_vocab",
    title: "Chữ Hán & Từ vựng",
    desc: "Kanji âm On/Kun và từ vựng Shinkanzen",
  },
  {
    id: "grammar",
    title: "Ngữ pháp N2",
    desc: "Mẫu câu Soumatome & Shinkanzen (Bỏ qua ~)",
    badge: "Bỏ qua ~",
  },
];

interface ActiveFallingWord {
  instanceId: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  x: number; // percentage (8% .. 82%)
  y: number; // percentage (-6% .. 86%)
  speed: number;
  acceptedInputs: string[];
  sourceType?: string;
}

interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
  word: string;
}

/**
 * Trình tổng hợp âm thanh Web Audio API độc lập
 */
class GameSoundFX {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playLaser() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  playDamage() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }
}

export default function KanjiDefenseGamePage() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "paused" | "gameover">("idle");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wordsDefeated, setWordsDefeated] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Cấu hình game: Tốc độ & Nguồn từ vựng
  const [speedMode, setSpeedMode] = useState<DefenseSpeedMode>("normal");
  const [sourceMode, setSourceMode] = useState<DefenseSourceMode>("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Danh sách các từ đang rơi
  const [fallingWords, setFallingWords] = useState<ActiveFallingWord[]>([]);
  const fallingWordsRef = useRef<ActiveFallingWord[]>([]);
  fallingWordsRef.current = fallingWords;

  // Hiệu ứng tia laser & vụ nổ
  const [laserBeam, setLaserBeam] = useState<{ targetX: number; targetY: number } | null>(null);
  const [explosions, setExplosions] = useState<ExplosionEffect[]>([]);
  const [fortressHit, setFortressHit] = useState(false);
  const [inputShake, setInputShake] = useState(false);

  // Input gõ phím
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Âm thanh
  const soundFx = useMemo(() => new GameSoundFX(), []);

  // Store data
  const studiedItems = useProgressStore((state) => state.studiedItems);
  const masteredIds = useProgressStore((state) => state.masteredFlashcardIds);
  const notebookItems = useProgressStore((state) => state.notebookItems);
  const logActivity = useProgressStore((state) => state.logActivity);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  // Đếm số lượng từ theo từng nguồn
  const sourceCounts = useMemo(() => {
    return getDefenseSourceCounts(notebookItems);
  }, [notebookItems]);

  // Kho từ vựng được trích xuất theo nguồn được chọn
  const wordPool = useMemo(() => {
    return getDefenseWordPool(studiedItems, masteredIds, notebookItems, sourceMode);
  }, [studiedItems, masteredIds, notebookItems, sourceMode]);

  // Bộ đếm spawn và loop refs
  const lastSpawnTimeRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const missedWordsRef = useRef<DefenseWord[]>([]);
  const timeElapsedRef = useRef(0);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("fast-jlpt-defense-theme", next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem("fast-jlpt-defense-theme");
      if (savedTheme === "dark") {
        setTheme("dark");
      } else {
        setTheme("light");
      }

      const savedSpeed = localStorage.getItem("fast-jlpt-defense-speed") as DefenseSpeedMode;
      if (savedSpeed && SPEED_CONFIG[savedSpeed]) {
        setSpeedMode(savedSpeed);
      }

      const savedSource = localStorage.getItem("fast-jlpt-defense-source") as DefenseSourceMode;
      if (savedSource && ["all", "notebook", "kanji_vocab", "grammar"].includes(savedSource)) {
        setSourceMode(savedSource);
      }
    } catch {}
  }, []);

  // Lưu thiết lập tốc độ
  const handleSelectSpeed = (newSpeed: DefenseSpeedMode) => {
    setSpeedMode(newSpeed);
    try {
      localStorage.setItem("fast-jlpt-defense-speed", newSpeed);
    } catch {}

    // Đồng bộ tốc độ các từ đang rơi nếu game đang chạy
    if (fallingWordsRef.current.length > 0) {
      const base = SPEED_CONFIG[newSpeed].baseSpeed;
      fallingWordsRef.current = fallingWordsRef.current.map((w) => ({
        ...w,
        speed: base + Math.min(timeElapsedRef.current * 0.002, base * 0.5),
      }));
      setFallingWords(fallingWordsRef.current);
    }
  };

  // Lưu thiết lập nguồn từ vựng
  const handleSelectSource = (newSource: DefenseSourceMode) => {
    setSourceMode(newSource);
    try {
      localStorage.setItem("fast-jlpt-defense-source", newSource);
    } catch {}
  };

  // Giữ auto-focus liên tục vào ô input khi đang chơi
  useEffect(() => {
    if (gameState === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  // Âm thanh mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.isMuted = next;
  };

  // Tạm dừng / Tiếp tục
  const togglePause = () => {
    if (gameState === "playing") {
      setGameState("paused");
    } else if (gameState === "paused") {
      setGameState("playing");
    }
  };

  // Tạo từ vựng mới rơi từ trên xuống
  const createNewFallingWord = useCallback((): ActiveFallingWord | null => {
    if (!wordPool || wordPool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * wordPool.length);
    const wordItem = wordPool[randomIndex];

    // Tọa độ X ngẫu nhiên tránh sát mép biên (10% đến 80%)
    const randomX = Math.floor(Math.random() * 70) + 10;
    const speedConf = SPEED_CONFIG[speedMode];
    // Tốc độ cơ bản theo cấu hình được chọn
    const baseSpeed =
      speedConf.baseSpeed + Math.min(timeElapsedRef.current * 0.002, speedConf.baseSpeed * 0.5);

    return {
      instanceId: `fall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      word: wordItem.word,
      reading: wordItem.reading,
      romaji: wordItem.romaji,
      meaning: wordItem.meaning,
      x: randomX,
      y: 0,
      speed: baseSpeed,
      acceptedInputs: wordItem.acceptedInputs || [],
      sourceType: wordItem.sourceType,
    };
  }, [wordPool, speedMode]);

  // Bắt đầu game mới
  const startGame = useCallback(() => {
    if (!wordPool || wordPool.length === 0) {
      setToastMessage("Nguồn từ vựng hiện tại chưa có từ nào. Hãy đổi nguồn khác!");
      return;
    }

    setGameState("playing");
    setLives(3);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setWordsDefeated(0);
    setTimeElapsed(0);
    timeElapsedRef.current = 0;
    setLaserBeam(null);
    setExplosions([]);
    setInputValue("");
    missedWordsRef.current = [];
    setIsSettingsOpen(false);

    // Tạo ngay từ đầu tiên rơi xuống ngay lập tức khi vừa bấm Bắt đầu
    const firstWord = createNewFallingWord();
    const initialList = firstWord ? [firstWord] : [];
    fallingWordsRef.current = initialList;
    setFallingWords(initialList);

    lastSpawnTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [createNewFallingWord, wordPool, setToastMessage]);

  // Bộ đếm thời gian sống sót độc lập (1 giây)
  useEffect(() => {
    if (gameState !== "playing") return;
    const timerInterval = setInterval(() => {
      timeElapsedRef.current += 1;
      setTimeElapsed(timeElapsedRef.current);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [gameState]);

  // Game Loop chính (60fps requestAnimationFrame)
  useEffect(() => {
    if (gameState !== "playing") return;

    lastFrameTimeRef.current = performance.now();
    lastSpawnTimeRef.current = performance.now();

    const spawnInterval = SPEED_CONFIG[speedMode].spawnInterval;

    const gameLoop = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Sinh từ vựng mới theo chu kỳ tốc độ đã cấu hình
      if (timestamp - lastSpawnTimeRef.current >= spawnInterval) {
        const nextWord = createNewFallingWord();
        if (nextWord) {
          fallingWordsRef.current.push(nextWord);
        }
        lastSpawnTimeRef.current = timestamp;
      }

      // Cập nhật vị trí rơi của các từ vựng
      const currentList = fallingWordsRef.current;
      const nextList: ActiveFallingWord[] = [];
      let breachedCount = 0;

      for (const item of currentList) {
        // Tọa độ Y tăng dần theo delta time
        const nextY = item.y + item.speed * (deltaTime / 50);

        // Chạm mốc đáy (84% - vị trí thành trì)
        if (nextY >= 84) {
          breachedCount++;
          missedWordsRef.current.push({
            id: item.instanceId,
            word: item.word,
            reading: item.reading,
            romaji: item.romaji,
            meaning: item.meaning,
            sourceType: (item.sourceType as any) || "vocab",
            acceptedInputs: item.acceptedInputs || [],
          });
        } else {
          nextList.push({
            ...item,
            y: nextY,
          });
        }
      }

      // Lưu lại danh sách mới
      fallingWordsRef.current = nextList;
      setFallingWords(nextList);

      // Nếu có từ chạm đáy -> Mất mạng
      if (breachedCount > 0) {
        soundFx.playDamage();
        setFortressHit(true);
        setTimeout(() => setFortressHit(false), 350);

        setStreak(0);
        setLives((prevLives) => {
          const updated = Math.max(0, prevLives - breachedCount);
          if (updated <= 0) {
            setGameState("gameover");
            logActivity(undefined, 2); // Lưu điểm kỷ luật học tập
          }
          return updated;
        });
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, createNewFallingWord, soundFx, logActivity, speedMode]);

  // Chuyển đổi Romaji sang Hiragana theo thời gian thực (đã chuẩn hóa bỏ ký tự đặc biệt)
  const convertedKana = useMemo(() => {
    if (!inputValue.trim()) return "";
    const norm = normalizeDefenseMatch(inputValue.trim());
    return wanakana.toHiragana(norm);
  }, [inputValue]);

  // Tìm mục tiêu đang bị khóa (gõ khớp âm đọc, Romaji, Hiragana, tự động bỏ qua ~)
  const lockedTarget = useMemo(() => {
    const rawVal = inputValue.trim().toLowerCase();
    if (!rawVal) return null;
    const normVal = normalizeDefenseMatch(rawVal);
    if (!normVal) return null;

    const normKana = normalizeDefenseMatch(wanakana.toHiragana(normVal));
    const normRomaji = normalizeDefenseMatch(wanakana.toRomaji(normVal));

    return (
      fallingWords.find((w) => {
        // 1. Kiểm tra trong acceptedInputs (đã chuẩn hóa và loại bỏ dấu ~ cho ngữ pháp)
        if (w.acceptedInputs && w.acceptedInputs.length > 0) {
          const matchAny = w.acceptedInputs.some((acc) => {
            return (
              acc === normVal ||
              acc === normKana ||
              acc === normRomaji ||
              acc.startsWith(normVal) ||
              acc.startsWith(normKana) ||
              acc.startsWith(normRomaji)
            );
          });
          if (matchAny) return true;
        }

        // 2. Fallback kiểm tra reading / romaji / word
        const normReading = normalizeDefenseMatch(w.reading);
        const normRom = normalizeDefenseMatch(w.romaji);
        const normWord = normalizeDefenseMatch(w.word);

        return (
          normReading.startsWith(normKana) ||
          normRom.startsWith(normRomaji) ||
          normRom.startsWith(normVal) ||
          normWord === normVal
        );
      }) || null
    );
  }, [fallingWords, inputValue]);

  // Xử lý bắn phá khi người dùng nhấn Enter hoặc Space
  const handleFire = () => {
    if (gameState !== "playing" || !inputValue.trim()) return;

    const trimmed = inputValue.trim();
    const normVal = normalizeDefenseMatch(trimmed);
    if (!normVal) return;

    const normKana = normalizeDefenseMatch(wanakana.toHiragana(normVal));
    const normRomaji = normalizeDefenseMatch(wanakana.toRomaji(normVal));

    const exactMatch = fallingWordsRef.current.find((w) => {
      // 1. Khớp chính xác với danh sách acceptedInputs (tự động bỏ qua ~ cho ngữ pháp)
      if (w.acceptedInputs && w.acceptedInputs.length > 0) {
        if (
          w.acceptedInputs.includes(normVal) ||
          w.acceptedInputs.includes(normKana) ||
          w.acceptedInputs.includes(normRomaji)
        ) {
          return true;
        }
      }

      // 2. Fallback so sánh chuẩn hóa trực tiếp
      const normReading = normalizeDefenseMatch(w.reading);
      const normRom = normalizeDefenseMatch(w.romaji);
      const normWord = normalizeDefenseMatch(w.word);

      return (
        normReading === normKana ||
        normReading === normVal ||
        normRom === normRomaji ||
        normRom === normVal ||
        normWord === normVal
      );
    });

    if (exactMatch) {
      // 1. Kích hoạt tia Laser
      soundFx.playLaser();
      setLaserBeam({
        targetX: exactMatch.x,
        targetY: exactMatch.y,
      });

      // 2. Kích hoạt vụ nổ
      setTimeout(() => {
        soundFx.playExplosion();
        setExplosions((prev) => [
          ...prev,
          {
            id: `exp-${Date.now()}`,
            x: exactMatch.x,
            y: exactMatch.y,
            word: exactMatch.word,
          },
        ]);
        setLaserBeam(null);
      }, 90);

      // Xóa vụ nổ sau 450ms
      setTimeout(() => {
        setExplosions((prev) => prev.filter((e) => e.word !== exactMatch.word));
      }, 550);

      // 3. Xóa từ vựng khỏi mảng rơi đồng bộ
      fallingWordsRef.current = fallingWordsRef.current.filter((w) => w.instanceId !== exactMatch.instanceId);
      setFallingWords(fallingWordsRef.current);

      // 4. Cộng điểm & Combo
      const newStreak = streak + 1;
      const multiplier = Math.min(newStreak, 5);
      const points = 10 * multiplier;
      setScore((s) => s + points);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setWordsDefeated((w) => w + 1);

      // Pháo hoa khi đạt mốc combo đẹp
      if (newStreak > 0 && newStreak % 5 === 0) {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#a855f7", "#ec4899", "#38bdf8", "#fbbf24"],
        });
      }

      // Xóa trắng input
      setInputValue("");
    } else {
      // Bắn trượt
      setInputShake(true);
      setTimeout(() => setInputShake(false), 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFire();
    }
  };

  if (!mounted) {
    return (
      <main className="h-screen w-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="animate-pulse text-sm text-purple-600 font-semibold">Đang khởi tạo Kanji Defense...</div>
      </main>
    );
  }

  const activeSpeedConf = SPEED_CONFIG[speedMode];

  return (
    <main
      className={`fixed inset-0 z-20 overflow-hidden flex flex-col select-none font-sans transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Background Cyber Starfield / Light Nebula Glow */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-200 ${
          isDark
            ? "bg-gradient-to-b from-slate-950 via-[#0f0c1b] to-[#120e24]"
            : "bg-gradient-to-b from-slate-50 via-purple-50/50 to-indigo-50/40"
        }`}
      />
      <div
        className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none ${
          isDark ? "bg-purple-900/15" : "bg-purple-200/40"
        }`}
      />
      <div
        className={`absolute top-1/3 left-10 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none ${
          isDark ? "bg-indigo-900/15" : "bg-indigo-200/35"
        }`}
      />

      {/* Grid Lines overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isDark ? "opacity-10" : "opacity-35"
        }`}
        style={{
          backgroundImage: isDark
            ? "linear-gradient(to right, #a855f7 1px, transparent 1px), linear-gradient(to bottom, #a855f7 1px, transparent 1px)"
            : "linear-gradient(to right, rgba(168, 85, 247, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(168, 85, 247, 0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ================= 1. HEADER STATUS BAR ================= */}
      <header
        className={`relative z-30 shrink-0 h-14 sm:h-16 px-4 sm:px-6 border-b backdrop-blur-md flex items-center justify-between transition-colors duration-150 ${
          isDark
            ? "border-purple-500/20 bg-slate-950/80 text-white"
            : "border-gray-200/80 bg-white/85 shadow-2xs text-slate-800"
        }`}
      >
        {/* Back link & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            href="/"
            className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              isDark
                ? "text-slate-300 hover:text-white bg-white/10 hover:bg-white/20"
                : "text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div
            className={`h-4 w-px hidden sm:block ${
              isDark ? "bg-white/20" : "bg-gray-200"
            }`}
          />

          <div className="flex items-center space-x-2">
            <Shield
              className={`w-4 h-4 ${
                isDark ? "text-purple-400" : "text-purple-600"
              }`}
            />
            <h1
              className={`text-sm sm:text-base font-black tracking-tight ${
                isDark
                  ? "bg-gradient-to-r from-purple-300 via-indigo-200 to-amber-200 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 bg-clip-text text-transparent"
              }`}
            >
              Kanji Defense
            </h1>
          </div>
        </div>

        {/* Live HUD Metrics: Lives, Score, Combo, Speed, Source, Settings, Theme, Sound */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold">
          {/* HP Hearts */}
          <div
            className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs ${
              isDark
                ? "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                : "bg-rose-50 border border-rose-200/80 text-rose-700"
            }`}
          >
            <span
              className={`text-[10px] uppercase mr-1 hidden md:inline ${
                isDark ? "text-rose-400" : "text-rose-600"
              }`}
            >
              Mạng:
            </span>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Heart
                key={`heart-${idx}`}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                  idx < lives
                    ? "text-rose-500 fill-rose-500 animate-pulse"
                    : isDark
                    ? "text-slate-600 fill-transparent"
                    : "text-slate-300 fill-transparent"
                }`}
              />
            ))}
          </div>

          {/* Score */}
          <div
            className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs font-mono ${
              isDark
                ? "bg-purple-950/60 border border-purple-500/40 text-purple-200"
                : "bg-purple-50 border border-purple-200/80 text-purple-800"
            }`}
          >
            <Trophy
              className={`w-3.5 h-3.5 ${
                isDark ? "text-amber-400" : "text-amber-500"
              }`}
            />
            <span>{score}</span>
          </div>

          {/* Combo */}
          {streak > 1 && (
            <div
              className={`hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl animate-bounce text-[11px] font-black font-mono ${
                isDark
                  ? "bg-amber-950/80 border border-amber-500/50 text-amber-300"
                  : "bg-amber-50 border border-amber-200/80 text-amber-800"
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>x{streak}</span>
            </div>
          )}

          {/* Quick Speed & Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 border-white/10 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200/80 text-slate-700"
            }`}
            title="Tùy chỉnh tốc độ & nguồn từ vựng"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-mono text-[11px] text-purple-600 dark:text-purple-300 font-extrabold">
              {activeSpeedConf.badge}
            </span>
            <span
              className={`hidden md:inline text-[10px] px-1.5 py-0.5 rounded-md ${
                sourceMode === "notebook"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                  : sourceMode === "grammar"
                  ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                  : "bg-purple-500/20 text-purple-600 dark:text-purple-300"
              }`}
            >
              {sourceMode === "notebook"
                ? "Sổ tay"
                : sourceMode === "grammar"
                ? "Ngữ pháp"
                : sourceMode === "kanji_vocab"
                ? "Hán tự"
                : "Tất cả"}
            </span>
          </button>

          {/* Pause / Resume Button (when playing or paused) */}
          {(gameState === "playing" || gameState === "paused") && (
            <button
              onClick={togglePause}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                gameState === "paused"
                  ? "bg-amber-500 text-white animate-pulse"
                  : isDark
                  ? "bg-white/10 hover:bg-white/20 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
              title={gameState === "paused" ? "Tiếp tục chơi" : "Tạm dừng"}
            >
              {gameState === "paused" ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
          )}

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-amber-300"
                : "bg-slate-100 hover:bg-slate-200 text-purple-700"
            }`}
            title={isDark ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sound Mute */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-slate-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2
                className={`w-4 h-4 ${
                  isDark ? "text-purple-300" : "text-purple-600"
                }`}
              />
            )}
          </button>
        </div>
      </header>

      {/* ================= 2. BẦU TRỜ CHIẾN ĐẤU (SKY BATTLEFIELD) ================= */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {/* SVG Laser Beam Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          {laserBeam && (
            <g>
              {/* Outer Glow Line */}
              <line
                x1="50%"
                y1="100%"
                x2={`${laserBeam.targetX}%`}
                y2={`${laserBeam.targetY}%`}
                stroke={isDark ? "#c084fc" : "#9333ea"}
                strokeWidth="7"
                strokeLinecap="round"
                opacity={isDark ? "0.8" : "0.7"}
                className={`filter ${
                  isDark
                    ? "drop-shadow-[0_0_12px_#a855f7]"
                    : "drop-shadow-[0_0_10px_#c084fc]"
                }`}
              />
              {/* Core Intense Laser Line */}
              <line
                x1="50%"
                y1="100%"
                x2={`${laserBeam.targetX}%`}
                y2={`${laserBeam.targetY}%`}
                stroke={isDark ? "#ffffff" : "#4f46e5"}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </svg>

        {/* Explosion Effects */}
        {explosions.map((exp) => (
          <div
            key={exp.id}
            style={{ left: `${exp.x}%`, top: `${exp.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center animate-out zoom-out duration-300"
          >
            {/* Shockwave Rings */}
            <div className="w-20 h-20 rounded-full border-4 border-amber-400 animate-ping absolute" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 blur-xs animate-spin absolute" />
            <span
              className={`font-japanese font-black text-2xl scale-125 z-10 ${
                isDark
                  ? "text-amber-200 drop-shadow-[0_0_8px_#f59e0b]"
                  : "text-purple-900 drop-shadow-[0_0_6px_#c084fc]"
              }`}
            >
              {exp.word}
            </span>
          </div>
        ))}

        {/* Falling Kanji Words */}
        {fallingWords.map((item) => {
          const isLocked = lockedTarget?.instanceId === item.instanceId;

          return (
            <div
              key={item.instanceId}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: "translate3d(-50%, 0, 0)",
              }}
              className={`absolute z-20 transition-transform duration-75 will-change-transform ${
                isLocked ? "scale-110 z-30" : ""
              }`}
            >
              <div
                className={`flex flex-col items-center px-4 py-2 rounded-2xl backdrop-blur-md border shadow-lg transition-all ${
                  isLocked
                    ? isDark
                      ? "bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)] ring-2 ring-amber-300"
                      : "bg-amber-50/95 border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400"
                    : isDark
                    ? "bg-slate-900/85 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                    : "bg-white/95 border-purple-200/90 shadow-md hover:border-purple-300"
                }`}
              >
                {/* Tag nguồn đặc biệt (Ngữ pháp hoặc Sổ tay) */}
                {item.sourceType === "grammar" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 mb-0.5">
                    Ngữ pháp • Bỏ qua ~
                  </span>
                )}
                {item.sourceType === "notebook" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 mb-0.5">
                    ⭐ Sổ tay
                  </span>
                )}

                {/* Kanji chính to rõ nét */}
                <span
                  className={`text-2xl sm:text-3xl font-black font-japanese tracking-wide ${
                    isLocked
                      ? isDark
                        ? "text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        : "text-amber-950"
                      : isDark
                      ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      : "text-slate-900 drop-shadow-xs"
                  }`}
                >
                  {item.word}
                </span>

                {/* Ý nghĩa tiếng Việt */}
                <span
                  className={`text-[11px] font-medium max-w-[170px] truncate mt-0.5 ${
                    isLocked
                      ? isDark
                        ? "text-amber-300"
                        : "text-amber-800 font-semibold"
                      : isDark
                      ? "text-purple-200 opacity-90"
                      : "text-purple-700 font-semibold"
                  }`}
                >
                  {item.meaning}
                </span>

                {/* Crosshair indicator khi được nhắm trúng */}
                {isLocked && (
                  <div className="absolute -top-3 -right-3 p-1 rounded-full bg-amber-500 text-white shadow-md animate-spin">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Start / Idle Overlay */}
        {gameState === "idle" && (
          <div
            className={`absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto ${
              isDark ? "bg-slate-950/70" : "bg-slate-900/25"
            }`}
          >
            <div
              className={`max-w-lg w-full p-6 sm:p-7 rounded-3xl border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto ${
                isDark
                  ? "bg-slate-900/95 border-purple-500/50 text-white"
                  : "bg-white/95 border-purple-100 text-slate-800"
              }`}
            >
              <div className="text-center space-y-2">
                <div
                  className={`inline-flex p-3 rounded-2xl border shadow-inner ${
                    isDark
                      ? "bg-purple-900/40 border-purple-400/40 text-purple-300"
                      : "bg-purple-50 border-purple-200 text-purple-600"
                  }`}
                >
                  <Shield className="w-9 h-9" />
                </div>

                <h2
                  className={`text-2xl font-black tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Sẵn Sàng Phòng Thủ!
                </h2>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Gõ âm đọc (Hiragana hoặc Romaji) và nhấn <strong>Enter / Space</strong> để kích hoạt tháp pháo tiêu diệt từ đang rơi trước khi chạm đất.
                </p>
              </div>

              {/* 1. Chọn nguồn từ vựng */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                    1. Nguồn từ vựng huấn luyện:
                  </span>
                  <span className="text-[11px] font-mono text-purple-600 dark:text-purple-300">
                    Kho đạn: <strong>{wordPool.length}</strong> từ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_OPTIONS.map((src) => {
                    const isSelected = sourceMode === src.id;
                    const count = sourceCounts[src.id];
                    const isNotebookEmpty = src.id === "notebook" && count === 0;

                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => handleSelectSource(src.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? isDark
                              ? "bg-purple-950/70 border-purple-400 text-white ring-2 ring-purple-400/30"
                              : "bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-300"
                            : isDark
                            ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        } ${isNotebookEmpty ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black truncate">{src.title}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : isDark
                                ? "bg-white/10 text-slate-400"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {count} từ
                          </span>
                        </div>
                        <p className="text-[10px] leading-tight opacity-75 line-clamp-2">
                          {src.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {sourceMode === "notebook" && sourceCounts.notebook === 0 && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                      isDark
                        ? "bg-amber-950/50 border-amber-500/40 text-amber-200"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Sổ tay của bạn hiện chưa có từ vựng nào. Hãy chọn nguồn khác hoặc lưu từ vào Sổ tay để luyện tập!
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Chọn tốc độ rơi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                    2. Thiết lập tốc độ rơi:
                  </span>
                  <span className="text-[11px] font-mono text-amber-500 font-bold">
                    {activeSpeedConf.label} ({activeSpeedConf.badge})
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(SPEED_CONFIG) as DefenseSpeedMode[]).map((spKey) => {
                    const sp = SPEED_CONFIG[spKey];
                    const isSelected = speedMode === spKey;

                    return (
                      <button
                        key={spKey}
                        type="button"
                        onClick={() => handleSelectSpeed(spKey)}
                        className={`py-2 px-1 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? isDark
                              ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-500/30"
                              : "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20"
                            : isDark
                            ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="text-xs font-black">{sp.badge}</div>
                        <div className="text-[10px] font-medium opacity-85 truncate">{sp.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tip ngữ pháp không cần gõ ~ */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center space-x-2.5 ${
                  isDark
                    ? "bg-purple-950/60 border-purple-500/30 text-purple-200"
                    : "bg-purple-50 border-purple-200/80 text-purple-900"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span className="leading-snug">
                  <strong>Mẹo Ngữ pháp:</strong> Bạn <strong>không cần gõ dấu ~</strong>! Chỉ cần gõ trực tiếp Romaji/Hiragana (Ví dụ: <code>〜際</code> gõ <code>sai</code>, <code>〜以上に</code> gõ <code>ijouni</code>).
                </span>
              </div>

              {/* Start Button */}
              <button
                onClick={startGame}
                disabled={wordPool.length === 0}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center space-x-2 ${
                  wordPool.length === 0
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {wordPool.length === 0 ? "Vui lòng chọn nguồn có từ vựng" : "Bắt đầu chiến dịch"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div
            className={`absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
              isDark ? "bg-slate-950/70" : "bg-slate-900/30"
            }`}
          >
            <div
              className={`max-w-sm w-full p-6 rounded-3xl border shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 ${
                isDark
                  ? "bg-slate-900/95 border-purple-500/40 text-white"
                  : "bg-white/95 border-purple-100 text-slate-800"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 mx-auto flex items-center justify-center">
                <Pause className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black">Trò Chơi Tạm Dừng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thời gian và các từ vựng đang được đóng băng.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setGameState("playing")}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-purple-500/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Tiếp tục chơi</span>
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    isDark
                      ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-200"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-purple-500" />
                  <span>Điều chỉnh tốc độ & nguồn từ</span>
                </button>

                <button
                  onClick={startGame}
                  className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    isDark
                      ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chơi lại từ đầu</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === "gameover" && (
          <div
            className={`absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg ${
              isDark ? "bg-slate-950/80" : "bg-slate-900/35"
            }`}
          >
            <div
              className={`max-w-md w-full p-6 sm:p-8 rounded-3xl border shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 ${
                isDark
                  ? "bg-slate-900 border-rose-500/50 text-white"
                  : "bg-white border-rose-200 text-slate-800"
              }`}
            >
              <div
                className={`inline-flex p-3.5 rounded-2xl border ${
                  isDark
                    ? "bg-rose-950/60 border-rose-500/50 text-rose-400"
                    : "bg-rose-50 border-rose-200 text-rose-600"
                }`}
              >
                <Shield className="w-10 h-10 text-rose-500" />
              </div>

              <div className="space-y-1">
                <h3
                  className={`text-2xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Thành Trì Đã Thất Thủ!
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Bạn đã chiến đấu dũng cảm trong <strong>{timeElapsed}</strong> giây ở tốc độ <strong>{activeSpeedConf.label} ({activeSpeedConf.badge})</strong>.
                </p>
              </div>

              {/* Game Stats Summary */}
              <div className="grid grid-cols-3 gap-2.5 py-2">
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark
                      ? "bg-white/5 border-white/10"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Điểm số
                  </span>
                  <span
                    className={`text-xl font-black font-mono ${
                      isDark ? "text-amber-400" : "text-purple-700"
                    }`}
                  >
                    {score}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark
                      ? "bg-white/5 border-white/10"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Đã diệt
                  </span>
                  <span
                    className={`text-xl font-black font-mono ${
                      isDark ? "text-purple-300" : "text-indigo-600"
                    }`}
                  >
                    {wordsDefeated}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark
                      ? "bg-white/5 border-white/10"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Combo Max
                  </span>
                  <span className="text-xl font-black font-mono text-rose-500">
                    {maxStreak}
                  </span>
                </div>
              </div>

              {/* Review missed words */}
              {missedWordsRef.current.length > 0 && (
                <div
                  className={`text-left space-y-1.5 p-3 rounded-2xl border max-h-32 overflow-y-auto scrollbar-thin ${
                    isDark
                      ? "bg-slate-950/80 border-purple-500/20 text-slate-300"
                      : "bg-slate-50 border-purple-100 text-slate-700"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Các từ lọt lưới cần ôn tập lại:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missedWordsRef.current.slice(0, 10).map((mw, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-lg border ${
                          isDark
                            ? "bg-purple-900/40 border-purple-500/30 text-purple-200"
                            : "bg-purple-100 border-purple-200 text-purple-800"
                        }`}
                        title={`${mw.reading} • ${mw.meaning}`}
                      >
                        {mw.word} ({mw.reading})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/"
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    isDark
                      ? "bg-white/10 hover:bg-white/15 text-slate-200 border-white/15"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  Về Dashboard
                </Link>
                <button
                  onClick={startGame}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-purple-500/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Chơi lại</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 3. KHU VỰC THÀNH TRÌ & THÁP PHÁO (FORTRESS DEFENSE BAR) ================= */}
      <footer
        className={`relative z-30 shrink-0 border-t transition-colors duration-150 p-4 sm:p-5 pb-6 sm:pb-7 backdrop-blur-xl ${
          fortressHit
            ? isDark
              ? "bg-rose-950/90 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)]"
              : "bg-rose-50/95 border-rose-400 shadow-[0_-4px_25px_rgba(244,63,94,0.25)]"
            : isDark
            ? "bg-slate-900/95 border-purple-500/40 shadow-2xl"
            : "bg-white/90 border-purple-100 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]"
        }`}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center space-y-3">
          {/* Laser Cannon Turret Centerpiece */}
          <div className="relative -mt-8 sm:-mt-10 mb-1 flex items-center justify-center pointer-events-none">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-t from-purple-700 to-indigo-600 border-2 flex items-center justify-center ${
                isDark
                  ? "border-purple-300 shadow-[0_0_20px_#a855f7]"
                  : "border-white shadow-lg shadow-purple-500/30"
              }`}
            >
              <Zap className="w-6 h-6 text-amber-300 fill-amber-300 animate-pulse" />
            </div>
          </div>

          {/* Real-time Kana conversion preview badge & Hint */}
          <div className="h-5 flex items-center justify-center text-xs font-bold font-japanese">
            {convertedKana ? (
              <span
                className={`px-3 py-0.5 rounded-full border animate-in fade-in ${
                  isDark
                    ? "bg-purple-900/80 border-purple-400/60 text-purple-200"
                    : "bg-purple-100 border-purple-300 text-purple-900"
                }`}
              >
                Đang gõ:{" "}
                <strong
                  className={`text-sm ${
                    isDark ? "text-white" : "text-purple-950"
                  }`}
                >
                  {convertedKana}
                </strong>
              </span>
            ) : (
              <span
                className={`text-[11px] font-sans ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Gõ Romaji hoặc Hiragana rồi nhấn{" "}
                <strong className={isDark ? "text-slate-300" : "text-slate-700"}>
                  Enter / Space
                </strong>
                {sourceMode === "grammar" && (
                  <span className="ml-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                    • Không cần gõ dấu ~
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Big Input Text Box with Fire Button */}
          <div className="w-full flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={gameState !== "playing"}
                placeholder={
                  gameState === "playing"
                    ? sourceMode === "grammar"
                      ? "Gõ cách đọc ngữ pháp (bỏ qua dấu ~)..."
                      : "Nhập cách đọc Hiragana / Romaji..."
                    : "Nhấn Bắt đầu để chơi..."
                }
                className={`w-full py-3.5 sm:py-4 px-5 rounded-2xl text-center text-lg sm:text-2xl font-bold font-japanese tracking-wider border-2 focus:outline-hidden transition-all ${
                  isDark
                    ? "bg-slate-950/90 text-white placeholder:text-slate-600"
                    : "bg-white text-slate-900 placeholder:text-slate-400 shadow-inner"
                } ${
                  inputShake
                    ? isDark
                      ? "border-rose-500 ring-4 ring-rose-500/30 animate-shake"
                      : "border-rose-500 ring-4 ring-rose-200 animate-shake bg-rose-50/40 text-rose-900"
                    : lockedTarget
                    ? isDark
                      ? "border-amber-400 ring-4 ring-amber-400/30 text-amber-200"
                      : "border-amber-400 ring-4 ring-amber-200 bg-amber-50/50 text-amber-950"
                    : isDark
                    ? "border-purple-500/60 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30"
                    : "border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
                }`}
              />

              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg ${
                    isDark
                      ? "text-slate-500 hover:text-white"
                      : "text-slate-400 hover:text-slate-800"
                  }`}
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Fire Button for mobile touch or fast click */}
            <button
              onClick={handleFire}
              disabled={gameState !== "playing" || !inputValue.trim()}
              className={`h-[54px] sm:h-[62px] px-5 sm:px-7 rounded-2xl font-black text-sm sm:text-base flex items-center space-x-2 transition-all shrink-0 ${
                gameState === "playing" && inputValue.trim()
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  : isDark
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              <span>Bắn</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ================= 4. SETTINGS MODAL DIALOG ================= */}
      {isSettingsOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
            isDark ? "bg-slate-950/70" : "bg-slate-900/30"
          }`}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
              isDark
                ? "bg-slate-900 border-purple-500/40 text-white"
                : "bg-white border-purple-100 text-slate-800"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-white/10">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-black">Cài Đặt Trò Chơi</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tốc độ rơi */}
            <div className="space-y-2">
              <label className="text-xs font-bold block text-slate-700 dark:text-slate-300">
                Tốc độ rơi của từ:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SPEED_CONFIG) as DefenseSpeedMode[]).map((spKey) => {
                  const sp = SPEED_CONFIG[spKey];
                  const isSelected = speedMode === spKey;
                  return (
                    <button
                      key={spKey}
                      type="button"
                      onClick={() => handleSelectSpeed(spKey)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/30"
                          : isDark
                          ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold">{sp.label}</span>
                        <span className="text-[10px] font-mono font-bold opacity-90">{sp.badge}</span>
                      </div>
                      <p className="text-[10px] opacity-75 mt-0.5">{sp.sublabel}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nguồn từ vựng */}
            <div className="space-y-2">
              <label className="text-xs font-bold block text-slate-700 dark:text-slate-300">
                Nguồn từ vựng huấn luyện:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOURCE_OPTIONS.map((src) => {
                  const isSelected = sourceMode === src.id;
                  const count = sourceCounts[src.id];
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => handleSelectSource(src.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? isDark
                            ? "bg-purple-950/80 border-purple-400 text-white ring-2 ring-purple-400/40"
                            : "bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-300"
                          : isDark
                          ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black truncate">{src.title}</span>
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                          {count}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{src.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mẹo Ngữ pháp */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center space-x-2 ${
                isDark
                  ? "bg-purple-950/60 border-purple-500/30 text-purple-200"
                  : "bg-purple-50 border-purple-200 text-purple-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>
                Ngữ pháp tự động bỏ qua dấu <strong>~</strong> (ví dụ <code>〜際</code> gõ <code>sai</code>).
              </span>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-purple-500/30 transition-all cursor-pointer"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      )}

      <Toast />
    </main>
  );
}
