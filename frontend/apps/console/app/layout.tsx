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
  title: "SelfX Store Console",
  description: "Store console and point of sale",
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
            __html: `
              try {
                if (localStorage.getItem('selfx-theme') === 'dark') document.documentElement.dataset.theme = 'dark';
                if ('serviceWorker' in navigator && location.pathname !== '/pos' && !location.pathname.startsWith('/pos/')) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var i = 0; i < regs.length; i++) {
                      var scope = regs[i].scope;
                      if (scope.endsWith('/') && !scope.includes('/pos')) {
                        regs[i].unregister();
                      }
                    }
                  });
                }
                if ('caches' in window && (location.pathname === '/login' || !location.pathname.startsWith('/pos'))) {
                  caches.keys().then(function(keys) {
                    for (var j = 0; j < keys.length; j++) {
                      if (keys[j].indexOf('selfx-pos') !== -1 && keys[j] !== 'selfx-pos-v3') {
                        caches.delete(keys[j]);
                      }
                    }
                  });
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-bg font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
