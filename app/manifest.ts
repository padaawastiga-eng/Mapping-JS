import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Navigasi Jalan Santai HGN & HUT Ke-81 PGRI Pasirwangi',
    short_name: 'Jalan Santai',
    description: 'Aplikasi Peta Interaktif & Navigasi Realtime Jalan Santai HGN dan HUT Ke-81 PGRI Kecamatan Pasirwangi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1e3a8a',
    icons: [
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
