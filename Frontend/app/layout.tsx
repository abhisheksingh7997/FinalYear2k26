import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/hooks/useAuth'; // ✅ ADD THIS

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Face Recognition System',
  description:
    'Advanced AI-powered face detection and identification system with secure authentication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>   {/* ✅ WRAP APP */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}