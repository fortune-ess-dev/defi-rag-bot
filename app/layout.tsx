'use client';
import { NextUIProvider } from '@nextui-org/react';
import './globals.css';
import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <NextUIProvider>
          <main className="min-h-screen bg-gray-50 py-8">
            {children}
          </main>
        </NextUIProvider>
      </body>
    </html>
  );
}