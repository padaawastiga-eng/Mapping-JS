import { AppConfig } from './types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  eventName: 'JALAN SANTAI HGN & HUT KE-81 PGRI',
  subTitle: 'KECAMATAN PASIRWANGI',
  organizer: 'Pengurus Cabang PGRI Kecamatan Pasirwangi',
  checkpoints: [
    {
      id: 'START',
      name: 'START',
      type: 'START',
      lat: -7.218420061372144,
      lng: 107.80347852494886,
      description: 'Titik awal keberangkatan Jalan Santai PGRI Pasirwangi',
    },
    {
      id: 'POS_1',
      name: 'POS 1',
      type: 'POS',
      lat: -7.2168328952312875,
      lng: 107.80728060724292,
      description: 'POS 1 Checkpoint & Penukaran Kupon 1',
    },
    {
      id: 'POS_2',
      name: 'POS 2',
      type: 'POS',
      lat: -7.212187332127545,
      lng: 107.80200207867729,
      description: 'POS 2 Checkpoint Utama Jalur Utara',
    },
    {
      id: 'POS_3',
      name: 'POS 3',
      type: 'POS',
      lat: -7.212982611724765,
      lng: 107.79518867755725,
      description: 'POS 3 Pos Kesegaran (Jalur Lurus Utama - Tanpa Belok Kanan Gang)',
    },
    {
      id: 'POS_4',
      name: 'POS 4',
      type: 'POS',
      lat: -7.217256211874366,
      lng: 107.7987291553488,
      description: 'POS 4 Checkpoint Terakhir Sebelum Finish',
    },
    {
      id: 'FINISH',
      name: 'FINISH',
      type: 'FINISH',
      lat: -7.218720840778179,
      lng: 107.803363456828,
      description: 'Titik Akhir Finish & panggung Utama HGN Pasirwangi',
    },
  ],
  checkpointRadius: 30, // meters
  offRouteTolerance: 40, // meters
  polylineColor: '#2563eb', // Royal Blue
  polylineWeight: 6,
  audioAlertsEnabled: true,
  announcementText: 'Selamat mengikuti Jalan Santai HGN & HUT Ke-81 PGRI Kecamatan Pasirwangi! Tetap di jalur dan jaga ketertiban.',
};
