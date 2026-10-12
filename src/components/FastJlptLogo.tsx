"use client";

import React, { useId } from "react";

export interface FastJlptLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string | null;
  className?: string;
  isDarkTheme?: boolean;
}

export const FastJlptLogoMark: React.FC<{
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const uid = useId().replace(/:/g, "_");

  // Kích thước chuẩn
  const dimensionMap = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const dimClass = dimensionMap[size] || "w-10 h-10";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl select-none group-hover:scale-105 transition-transform duration-300 shadow-sm ${dimClass} ${className}`}
    >
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Nền badge đen ánh tím huyền bí */}
          <linearGradient id={`bg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="50%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#0B0F19" />
          </linearGradient>

          {/* Viền sáng Gradient tương phản cao */}
          <linearGradient id={`border_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#C084FC" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.8" />
          </linearGradient>

          {/* Mặt trời đỏ Nhật Bản (Hinomaru) */}
          <radialGradient id={`sun_${uid}`} cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="#FF4365" />
            <stop offset="60%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#881337" />
          </radialGradient>

          {/* Hào quang tỏa sáng của mặt trời */}
          <radialGradient id={`halo_${uid}`} cx="50%" cy="46%" r="65%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
          </radialGradient>

          {/* Cổng Torii trắng ngọc */}
          <linearGradient id={`torii_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          {/* Tia chớp vàng cam (Tốc độ / FAST) */}
          <linearGradient id={`bolt_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>

          {/* N2 Metallic */}
          <linearGradient id={`gold_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>

          <linearGradient id={`badge_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          <filter id={`shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          <filter id={`boltGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#F59E0B" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 1. Nền Squircle Badge */}
        <rect
          x="6"
          y="6"
          width="116"
          height="116"
          rx="32"
          fill={`url(#bg_${uid})`}
          stroke={`url(#border_${uid})`}
          strokeWidth="2.5"
        />

        {/* 2. Quầng sáng mặt trời */}
        <circle cx="64" cy="54" r="42" fill={`url(#halo_${uid})`} />

        {/* 3. Vòng tròn mặt trời đỏ */}
        <circle cx="64" cy="54" r="28" fill={`url(#sun_${uid})`} filter={`url(#shadow_${uid})`} />

        {/* 4. Cổng Torii Nhật Bản */}
        {/* Mái cong Kasagi (島木) */}
        <path
          d="M 22 40 C 38 35, 50 33, 64 33 C 78 33, 90 35, 106 40 C 108 40.8, 108 43, 106 44 C 92 40, 78 38, 64 38 C 50 38, 36 40, 22 44 C 20 43, 20 40.8, 22 40 Z"
          fill={`url(#torii_${uid})`}
          filter={`url(#shadow_${uid})`}
        />
        {/* Xà ngang Shimaki */}
        <rect x="32" y="47" width="64" height="4.5" rx="1.5" fill={`url(#torii_${uid})`} opacity="0.95" />

        {/* Trụ cột 2 bên */}
        <rect x="35" y="49" width="5.5" height="42" rx="2" fill={`url(#torii_${uid})`} opacity="0.85" />
        <rect x="87.5" y="49" width="5.5" height="42" rx="2" fill={`url(#torii_${uid})`} opacity="0.85" />

        {/* 5. Tia chớp tốc độ FAST (Cắt chéo xuyên qua cổng) */}
        <polygon
          points="74,18 53,52 65,52 47,88 77,48 64,48"
          fill={`url(#bolt_${uid})`}
          filter={`url(#boltGlow_${uid})`}
        />

        {/* 6. Chữ "N2" sắc nét */}
        <text
          x="45"
          y="97"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="28"
          fontWeight="900"
          fill={`url(#gold_${uid})`}
          textAnchor="middle"
          letterSpacing="-1px"
          filter={`url(#shadow_${uid})`}
        >
          N
        </text>

        {/* Badge số 2 */}
        <rect
          x="63"
          y="73"
          width="26"
          height="26"
          rx="8"
          fill={`url(#badge_${uid})`}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        <text
          x="76"
          y="93"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="20"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          2
        </text>

        {/* 3 vạch tốc độ dưới chân */}
        <rect x="42" y="104" width="8" height="2" rx="1" fill="#818CF8" opacity="0.7" />
        <rect x="54" y="104" width="16" height="2" rx="1" fill="#F43F5E" opacity="0.9" />
        <rect x="74" y="104" width="8" height="2" rx="1" fill="#F59E0B" opacity="0.7" />
      </svg>
    </div>
  );
};

export const FastJlptLogo: React.FC<FastJlptLogoProps> = ({
  size = "md",
  showText = true,
  subtitle = "Ôn thi cấp tốc • Spaced Repetition",
  className = "",
  isDarkTheme = false,
}) => {
  return (
    <div className={`inline-flex items-center space-x-3 group ${className}`}>
      {/* Biểu tượng Logo Mark */}
      <FastJlptLogoMark size={size} />

      {/* Tên thương hiệu & Phụ đề */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-2">
            <span
              className={`font-black tracking-tight leading-none ${
                size === "sm"
                  ? "text-base"
                  : size === "lg" || size === "xl"
                  ? "text-xl sm:text-2xl"
                  : "text-lg sm:text-xl"
              } ${isDarkTheme ? "text-white" : "text-slate-900"}`}
            >
              FAST <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 bg-clip-text text-transparent">JLPT</span>
            </span>

            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/10 to-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 tracking-wide">
              N2
            </span>
          </div>

          {subtitle && (
            <p
              className={`text-[11px] font-medium mt-1 leading-tight hidden sm:block ${
                isDarkTheme ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FastJlptLogo;
