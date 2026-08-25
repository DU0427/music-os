import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: '音乐宇宙',
  description: '面向个人音乐体验的空间式操作系统。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable}`}>
      <body className="font-sans bg-space-navy text-white/90 overflow-hidden antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

