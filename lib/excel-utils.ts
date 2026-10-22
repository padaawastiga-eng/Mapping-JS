import { RegisteredParticipant } from './types';

export const SAMPLE_DEFAULT_PARTICIPANTS: RegisteredParticipant[] = [
  {
    id: 'reg-01',
    nomorPeserta: 'JS-001',
    name: 'Asep Saepulloh, S.Pd.',
    institution: 'SDN 1 Pasirwangi',
    registeredAt: 1727400000000,
    phone: '081234567890',
    notes: 'Ranting SDN Pasirwangi',
  },
  {
    id: 'reg-02',
    nomorPeserta: 'JS-002',
    name: 'Dede Kurniawan, M.Pd.',
    institution: 'SMPN 1 Pasirwangi',
    registeredAt: 1727400060000,
    phone: '081234567891',
    notes: 'Ranting SMPN Pasirwangi',
  },
  {
    id: 'reg-03',
    nomorPeserta: 'JS-003',
    name: 'Hj. Neneng Rosita, S.Pd.',
    institution: 'SDN 2 Padaawas',
    registeredAt: 1727400120000,
    phone: '081234567892',
    notes: 'Kepala Sekolah',
  },
  {
    id: 'reg-04',
    nomorPeserta: 'JS-004',
    name: 'Siti Rahmah, S.Pd.I.',
    institution: 'PGRI Ranting Barat',
    registeredAt: 1727400180000,
    phone: '081234567893',
    notes: 'Guru PAI',
  },
  {
    id: 'reg-05',
    nomorPeserta: 'JS-005',
    name: 'Budi Santoso, S.Pd.',
    institution: 'TK Pembina Pasirwangi',
    registeredAt: 1727400240000,
    phone: '081234567894',
    notes: 'IGTKI Pasirwangi',
  },
  {
    id: 'reg-06',
    nomorPeserta: 'JS-006',
    name: 'Iwan Setiawan, S.Pd.',
    institution: 'SMP PGRI Pasirwangi',
    registeredAt: 1727400300000,
    phone: '081234567895',
    notes: 'Pengurus Cabang',
  },
  {
    id: 'reg-07',
    nomorPeserta: 'JS-007',
    name: 'Dewi Sartika, S.Pd.',
    institution: 'SDN 1 Padaawas',
    registeredAt: 1727400360000,
    phone: '081234567896',
    notes: 'Guru Kelas',
  },
  {
    id: 'reg-08',
    nomorPeserta: 'JS-008',
    name: 'Agus Salim, M.Pd.',
    institution: 'SMKN 1 Pasirwangi',
    registeredAt: 1727400420000,
    phone: '081234567897',
    notes: 'Koordinator Lapangan',
  },
];

/**
 * Download sample Excel Template for participant data import
 */
export async function downloadParticipantTemplate() {
  const XLSX = await import('xlsx');

  const sampleData = [
    {
      'No': 1,
      'Nomor Peserta': 'JS-001',
      'Nama Peserta': 'Asep Saepulloh, S.Pd.',
      'Asal Sekolah / Ranting': 'SDN 1 Pasirwangi',
      'No HP (Opsional)': '081234567890',
      'Keterangan': 'Guru Kelas',
    },
    {
      'No': 2,
      'Nomor Peserta': 'JS-002',
      'Nama Peserta': 'Dede Kurniawan, M.Pd.',
      'Asal Sekolah / Ranting': 'SMPN 1 Pasirwangi',
      'No HP (Opsional)': '081234567891',
      'Keterangan': 'Ranting SMP',
    },
    {
      'No': 3,
      'Nomor Peserta': 'JS-003',
      'Nama Peserta': 'Hj. Neneng Rosita, S.Pd.',
      'Asal Sekolah / Ranting': 'SDN 2 Padaawas',
      'No HP (Opsional)': '081234567892',
      'Keterangan': 'Kepala Sekolah',
    },
    {
      'No': 4,
      'Nomor Peserta': 'JS-004',
      'Nama Peserta': 'Siti Rahmah, S.Pd.I.',
      'Asal Sekolah / Ranting': 'PGRI Ranting Barat',
      'No HP (Opsional)': '081234567893',
      'Keterangan': 'Guru PAI',
    },
    {
      'No': 5,
      'Nomor Peserta': 'JS-005',
      'Nama Peserta': 'Budi Santoso, S.Pd.',
      'Asal Sekolah / Ranting': 'TK Pembina Pasirwangi',
      'No HP (Opsional)': '081234567894',
      'Keterangan': 'IGTKI',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // Nomor Peserta
    { wch: 30 }, // Nama Peserta
    { wch: 30 }, // Asal Sekolah / Ranting
    { wch: 18 }, // No HP
    { wch: 25 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Peserta');

  XLSX.writeFile(workbook, 'Template_Data_Peserta_Jalan_Santai.xlsx');
}

/**
 * Export registered participants list to an Excel (.xlsx) file
 */
export async function exportParticipantsToExcel(
  participants: RegisteredParticipant[],
  eventName: string = 'Jalan Santai PGRI Pasirwangi'
) {
  const XLSX = await import('xlsx');

  const exportData = participants.map((p, idx) => ({
    'No': idx + 1,
    'Nomor Peserta': p.nomorPeserta || `JS-${String(idx + 1).padStart(3, '0')}`,
    'Nama Peserta': p.name,
    'Asal Sekolah / Ranting': p.institution,
    'No HP': p.phone || '-',
    'Keterangan': p.notes || '-',
    'Tanggal Daftar': p.registeredAt ? new Date(p.registeredAt).toLocaleDateString('id-ID') : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // Nomor Peserta
    { wch: 32 }, // Nama Peserta
    { wch: 32 }, // Asal Sekolah / Ranting
    { wch: 18 }, // No HP
    { wch: 25 }, // Keterangan
    { wch: 16 }, // Tanggal Daftar
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peserta');

  const cleanEvent = eventName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Data_Peserta_${cleanEvent}.xlsx`);
}

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file into participant objects
 */
export async function parseParticipantsFromExcel(
  file: File
): Promise<Array<{ nomorPeserta: string; name: string; institution: string; phone?: string; notes?: string }>> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with raw values
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

  if (!rawRows || rawRows.length === 0) {
    throw new Error('File excel kosong atau tidak memiliki data baris.');
  }

  const results: Array<{ nomorPeserta: string; name: string; institution: string; phone?: string; notes?: string }> = [];

  rawRows.forEach((row, idx) => {
    let name = '';
    let institution = '';
    let nomorPeserta = '';
    let phone = '';
    let notes = '';

    for (const [key, val] of Object.entries(row)) {
      const lowerKey = key.toLowerCase().trim();
      const strVal = String(val ?? '').trim();

      if (!name && (lowerKey.includes('nama') || lowerKey.includes('peserta') || lowerKey === 'name')) {
        name = strVal;
      } else if (
        !institution &&
        (lowerKey.includes('sekolah') || lowerKey.includes('ranting') || lowerKey.includes('asal') || lowerKey.includes('instansi') || lowerKey.includes('unit'))
      ) {
        institution = strVal;
      } else if (
        !nomorPeserta &&
        (lowerKey.includes('nomor') || lowerKey.includes('no') || lowerKey.includes('bib') || lowerKey.includes('id'))
      ) {
        nomorPeserta = strVal;
      } else if (!phone && (lowerKey.includes('hp') || lowerKey.includes('telp') || lowerKey.includes('wa') || lowerKey.includes('phone'))) {
        phone = strVal;
      } else if (!notes && (lowerKey.includes('ket') || lowerKey.includes('keterangan') || lowerKey.includes('notes'))) {
        notes = strVal;
      }
    }

    if (!name && row['Nama']) name = String(row['Nama']).trim();
    if (!institution && row['Sekolah']) institution = String(row['Sekolah']).trim();

    if (name) {
      results.push({
        nomorPeserta: nomorPeserta || `JS-${String(idx + 1).padStart(3, '0')}`,
        name,
        institution: institution || 'Umum / PGRI Pasirwangi',
        phone: phone || undefined,
        notes: notes || undefined,
      });
    }
  });

  if (results.length === 0) {
    throw new Error('Tidak dapat menemukan kolom Nama Peserta dan Asal Sekolah/Ranting pada file yang diunggah.');
  }

  return results;
}
