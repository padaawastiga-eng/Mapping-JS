import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Navigasi Jalan Santai HGN & HUT Ke-81 PGRI Kecamatan Pasirwangi',
  description: 'Aplikasi Peta Interaktif & Navigasi Realtime Jalan Santai HGN dan HUT Ke-81 PGRI Kecamatan Pasirwangi dengan Deteksi Rute, Checkpoint POS 1-4, Peringatan Keluar Jalur, & Audio Notifikasi.',
  openGraph: {
    title: 'Navigasi Jalan Santai HGN & HUT Ke-81 PGRI Kecamatan Pasirwangi',
    description: 'Aplikasi Navigasi & Peta Realtime Jalan Santai HGN & HUT Ke-81 PGRI Kecamatan Pasirwangi.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Navigasi Jalan Santai HGN & HUT Ke-81 PGRI Pasirwangi',
    description: 'Panduan Rute & Peta Realtime Jalan Santai HGN & HUT Ke-81 PGRI Kecamatan Pasirwangi.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Jalan Santai PGRI',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="h-full bg-slate-950 text-slate-100 antialiased font-sans select-none overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
