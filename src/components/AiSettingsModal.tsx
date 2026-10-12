"use client";

import React, { useState } from "react";
import { useProgressStore } from "@/store/useProgressStore";
import { X, Sparkles, Key, Check, ShieldCheck, ExternalLink } from "lucide-react";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose }) => {
  const aiApiKey = useProgressStore((state) => state.aiApiKey);
  const aiProvider = useProgressStore((state) => state.aiProvider);
  const setAiSettings = useProgressStore((state) => state.setAiSettings);
  const setToastMessage = useProgressStore((state) => state.setToastMessage);

  const [keyInput, setKeyInput] = useState(aiApiKey);
  const [providerInput, setProviderInput] = useState<"gemini" | "openai">(aiProvider);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAiSettings(keyInput.trim(), providerInput);
    setToastMessage("Đã lưu cấu hình AI thành công!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Cài đặt AI Chấm điểm Dịch</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="text-xs text-slate-500 leading-relaxed space-y-2">
          <p>
            Nhập <strong>API Key</strong> để AI (Google Gemini hoặc OpenAI) chấm điểm câu dịch tiếng Nhật của bạn một cách thông minh và đưa ra lời khuyên ngữ pháp hữu ích.
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Key được lưu bảo mật trực tiếp trên trình duyệt của bạn (localStorage).</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Mô hình AI:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderInput("gemini")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  providerInput === "gemini"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100"
                }`}
              >
                Google Gemini (gemini-3.8-flash Siêu tốc)
              </button>
              <button
                type="button"
                onClick={() => setProviderInput("openai")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  providerInput === "openai"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100"
                }`}
              >
                OpenAI (GPT-4o)
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                API Key:
              </label>
              {providerInput === "gemini" ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline inline-flex items-center space-x-0.5"
                >
                  <span>Lấy Gemini Key miễn phí</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline inline-flex items-center space-x-0.5"
                >
                  <span>Lấy OpenAI Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={providerInput === "gemini" ? "AIzaSy..." : "sk-..."}
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <Key className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400">
              * Nếu để trống, hệ thống sẽ sử dụng thuật toán chấm điểm dự phòng offline.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Cài đặt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
