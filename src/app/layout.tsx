import type { Metadata } from "next";
import "./globals.css";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { GlobalNotebookModal } from "@/components/GlobalNotebookModal";

export const metadata: Metadata = {
  title: "FAST JLPT N2 - Ôn thi cấp tốc",
  description: "Ứng dụng web tĩnh ôn thi JLPT N2 cấp tốc với Spaced Repetition và tra cứu Mazii nhanh chóng.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen text-slate-800 bg-slate-50 selection:bg-purple-100 selection:text-purple-900 pb-20">
        {children}
        <FloatingNavBar />
        <GlobalNotebookModal />
      </body>
    </html>
  );
}
