import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'MONEYBOOK - Quản lý tài chính cá nhân',
  description: 'Theo dõi thu chi, ngân sách, nợ và tài sản ròng của bạn.',
  applicationName: 'MONEYBOOK',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  // iOS Safari ignores parts of the manifest, so it needs these tags for standalone mode.
  appleWebApp: { capable: true, title: 'MONEYBOOK', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // lets the bottom nav respect the iPhone home-indicator safe area
  themeColor: '#0f766e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
