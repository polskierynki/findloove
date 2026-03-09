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
      { url: '/favicon.ico', sizes: '32x32' },
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
        <NewHeader />
        <main className="relative z-10">
          {children}
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
