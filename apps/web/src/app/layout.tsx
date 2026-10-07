import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'MONEYBOOK - Quản lý tài chính cá nhân',
  description: 'Theo dõi thu chi, ngân sách, nợ và tài sản ròng của bạn.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f766e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
