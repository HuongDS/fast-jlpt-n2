"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ExternalLink } from "lucide-react";

export const MaziiLookup: React.FC = () => {
  const [selectedText, setSelectedText] = useState("");
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [queryWord, setQueryWord] = useState("");
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      if (isModalOpen) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setButtonPos(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      // Show button if text is between 1 and 40 characters
      if (text.length > 0 && text.length <= 40) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          const top = rect.top + window.scrollY - 38;
          const left = rect.left + window.scrollX + rect.width / 2;

          setSelectedText(text);
          setButtonPos({ x: left, y: Math.max(10, top) });
        } catch {
          setButtonPos(null);
        }
      } else {
        setButtonPos(null);
      }
    };

    const handleMouseUp = () => {
      setTimeout(handleSelection, 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) {
        return;
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isModalOpen]);

  const handleOpenMazii = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedText) {
      setQueryWord(selectedText);
      setIsModalOpen(true);
      setButtonPos(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const maziiUrl = queryWord
    ? `https://mazii.net/search/word?dict=javi&query=${encodeURIComponent(queryWord)}`
    : "";

  return (
    <>
      {/* Floating "Tra Mazii" Button near highlighted text */}
      {buttonPos && selectedText && (
        <button
          ref={buttonRef}
          onClick={handleOpenMazii}
          style={{
            top: `${buttonPos.y}px`,
            left: `${buttonPos.x}px`,
            transform: "translateX(-50%)",
          }}
          className="fixed z-50 inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95 cursor-pointer ring-1 ring-white/20 select-none"
        >
          <Search className="w-3 h-3 text-amber-300" />
          <span>Tra Mazii</span>
        </button>
      )}

      {/* Mazii Modal with Iframe */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                  Mazii Dictionary
                </span>
                <span className="text-sm font-bold text-slate-800">
                  Từ khóa: <span className="text-indigo-600 font-mono">"{queryWord}"</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={maziiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mở tab mới nếu iframe bị chặn"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mở tab mới</span>
                </a>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe View */}
            <div className="flex-1 w-full bg-slate-50 relative">
              <iframe
                src={maziiUrl}
                title={`Tra từ Mazii: ${queryWord}`}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
