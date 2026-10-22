import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "500", "600"], variable: "--font-te" });
const hindi = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-hi",
});

export const metadata: Metadata = {
  title: "SelfX Admin",
  description: "Platform administration for SelfX Retail",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${telugu.variable} ${hindi.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('selfx-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}",
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-bg font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
