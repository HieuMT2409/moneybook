import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Makes "Add to Home Screen" open MONEYBOOK as a standalone app
// (no browser address bar) with its own icon and splash colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MONEYBOOK',
    short_name: 'MONEYBOOK',
    description: 'Quản lý tài chính cá nhân',
    lang: 'vi',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
