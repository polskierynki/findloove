import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "findloove.pl – Portal Randkowy",
  description: "Poznaj nowych przyjaciół i partnerów na portalu randkowym. Autentyczne znajomości i prawdziwe relacje.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

import CookieBanner from '@/components/layout/CookieBanner';
import NewHeader from '@/components/layout/NewHeader';
import FloatingParticles from '@/components/layout/FloatingParticles';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="preload" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-fuchsia-500/30 selection:text-fuchsia-100`}>
        {/* Animowane tło z "bombelkami" */}
        <FloatingParticles />
        
        {/* Background Neon Orbs - widoczne na wszystkich stronach */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-60 right-20 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-[90px]"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <NewHeader />
        <main className="relative z-10">
          {children}
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
