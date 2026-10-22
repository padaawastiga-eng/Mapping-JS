'use client';

import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Building,
  Hash,
  Phone,
  RotateCcw,
  AlertTriangle,
  X,
  UserX,
} from 'lucide-react';
import { RegisteredParticipant } from '@/lib/types';
import {
  downloadParticipantTemplate,
  exportParticipantsToExcel,
  parseParticipantsFromExcel,
  SAMPLE_DEFAULT_PARTICIPANTS,
} from '@/lib/excel-utils';

interface AdminParticipantManagerProps {
  participants: RegisteredParticipant[];
  onUpdateParticipants: (newList: RegisteredParticipant[]) => void;
  eventName?: string;
}

export const AdminParticipantManager: React.FC<AdminParticipantManagerProps> = ({
  participants,
  onUpdateParticipants,
  eventName = 'Jalan Santai PGRI Pasirwangi',
}) => {
  // Form input state
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [nomorPeserta, setNomorPeserta] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // UI status
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Modal Verifikasi Hapus State
  const [participantToDelete, setParticipantToDelete] = useState<RegisteredParticipant | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextAutoNumber = `JS-${String(participants.length + 1).padStart(3, '0')}`;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // 1. Handle Manual Add Participant
  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Nama peserta wajib diisi!');
      return;
    }

    if (!institution.trim()) {
      showError('Asal Sekolah / Ranting wajib diisi!');
      return;
    }

    const newParticipant: RegisteredParticipant = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nomorPeserta: nomorPeserta.trim() || nextAutoNumber,
      name: name.trim(),
      institution: institution.trim(),
      registeredAt: Date.now(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const updated = [newParticipant, ...participants];
    onUpdateParticipants(updated);

    // Reset Form
    setName('');
    setInstitution('');
    setNomorPeserta('');
    setPhone('');
    setNotes('');

    showSuccess(`Peserta "${newParticipant.name}" (${newParticipant.nomorPeserta}) dari ${newParticipant.institution} berhasil didaftarkan!`);
  };

  // 2. Action Confirm Delete Single Participant (Triggered by Modal)
  const confirmDeleteParticipant = () => {
    if (!participantToDelete) return;

    const targetName = participantToDelete.name;
    const targetId = participantToDelete.id;

    const updated = participants.filter((p) => p.id !== targetId);
    onUpdateParticipants(updated);

    setParticipantToDelete(null);
    showSuccess(`Peserta "${targetName}" berhasil dihapus dari sistem.`);
  };

  // 3. Action Confirm Delete All Participants (Triggered by Modal)
  const confirmDeleteAllParticipants = () => {
    onUpdateParticipants([]);
    setIsDeleteAllModalOpen(false);
    showSuccess('Seluruh daftar peserta terdaftar telah berhasil dikosongkan.');
  };

  // 4. Handle Reset to Sample
  const handleResetSample = () => {
    onUpdateParticipants(SAMPLE_DEFAULT_PARTICIPANTS);
    showSuccess('Data contoh peserta resmi Pasirwangi berhasil dimuat ulang.');
  };

  // 5. Handle Excel Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsed = await parseParticipantsFromExcel(file);

      const newItems: RegisteredParticipant[] = parsed.map((item, idx) => ({
        id: `reg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        nomorPeserta: item.nomorPeserta,
        name: item.name,
        institution: item.institution,
        phone: item.phone,
        notes: item.notes,
        registeredAt: Date.now(),
      }));

      // Merge avoiding duplicates by exact name & institution
      const existingKeySet = new Set(participants.map((p) => `${p.name.toLowerCase()}|${p.institution.toLowerCase()}`));
      const nonDuplicates = newItems.filter((p) => !existingKeySet.has(`${p.name.toLowerCase()}|${p.institution.toLowerCase()}`));

      const updated = [...nonDuplicates, ...participants];
      onUpdateParticipants(updated);

      showSuccess(`Berhasil mengimpor ${nonDuplicates.length} peserta baru dari file Excel "${file.name}"!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel. Pastikan format kolom sesuai.';
      showError(msg);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered participants
  const filtered = participants.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.institution.toLowerCase().includes(q) ||
      p.nomorPeserta.toLowerCase().includes(q)
    );
  });

  const uniqueInstitutionsCount = new Set(participants.map((p) => p.institution.trim().toLowerCase())).size;

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">TOTAL TERDAFTAR</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{participants.length}</div>
          <p className="text-[11px] text-blue-400 mt-0.5">Peserta resmi tercatat</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">ASAL SEKOLAH/RANTING</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 mt-1 font-mono">{uniqueInstitutionsCount}</div>
          <p className="text-[11px] text-indigo-400 mt-0.5">Unit kerja terdaftar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">INTEGRASI EXCEL</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-slate-200 mt-2">Dukungan .XLSX & .CSV</div>
          <p className="text-[11px] text-emerald-400 mt-0.5">Import / Export instan</p>
        </div>
      </div>

      {/* SECTION 1: Excel Import, Export & Template Tools */}
      <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 md:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">ALAT EXCEL: IMPORT, EXPORT & TEMPLATE</h3>
              <p className="text-xs text-slate-400">
                Kelola data ratusan peserta secara massal menggunakan file Excel (.xlsx / .csv)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Button 1: Download Template Excel */}
          <button
            type="button"
            onClick={downloadParticipantTemplate}
            className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow group"
          >
            <FileDown className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span>Unduh Template Excel</span>
          </button>

          {/* Button 2: Import Excel */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Memproses File...' : 'Import Data dari Excel'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Button 3: Export Excel */}
          <button
            type="button"
            onClick={() => exportParticipantsToExcel(participants, eventName)}
            disabled={participants.length === 0}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export ke Excel ({participants.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Form Input Tambah Peserta Baru */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <UserPlus className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white">FORMULIR INPUT PESERTA BARU</h3>
            <p className="text-xs text-slate-400">
              Tambahkan data peserta satu per satu langsung ke dalam database panitia
            </p>
          </div>
        </div>

        <form onSubmit={handleAddParticipant} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input Nama Peserta */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nama Lengkap Peserta <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Asep Saepulloh, S.Pd."
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Input Asal Sekolah / Ranting */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Asal Sekolah / Ranting PGRI <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Contoh: SDN 1 Pasirwangi / Ranting Barat"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Nomor Peserta */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Nomor Peserta (Opsional)
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={nomorPeserta}
                  onChange={(e) => setNomorPeserta(e.target.value)}
                  placeholder={`Auto: ${nextAutoNumber}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {/* No HP */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                No. WhatsApp / HP (Opsional)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Keterangan / Jabatan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Guru Kelas / Kepala Sekolah"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Simpan & Daftarkan Peserta</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Daftar Seluruh Peserta Terdaftar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-extrabold text-sm text-white">
              DAFTAR PESERTA TERDAFTAR ({filtered.length} dari {participants.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama / sekolah..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleResetSample}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Reset ke Contoh Peserta"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {participants.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 transition"
                title="Hapus Semua Peserta"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table of Participants */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-500 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">
              {searchTerm ? 'Tidak ada peserta yang cocok dengan kata kunci pencarian.' : 'Belum ada data peserta terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filtered.map((p, idx) => (
              <div
                key={p.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-900 to-blue-900 border border-indigo-500/40 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-indigo-300">{p.institution}</span>
                      {p.notes && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500">{p.notes}</span>
                        </>
                      )}
                      {p.phone && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500 font-mono">{p.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString('id-ID') : '-'}
                  </span>
                  
                  {/* TOMBOL HAPUS PESERTA (MEMBUKA MODAL VERIFIKASI) */}
                  <button
                    type="button"
                    onClick={() => setParticipantToDelete(p)}
                    className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 hover:text-white transition flex items-center gap-1 shadow-sm active:scale-95"
                    title="Hapus Data Peserta"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] font-bold">Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 MODAL VERIFIKASI HAPUS PESERTA TUNGGAL (REQUEST USER) */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/50 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5 relative">
            {/* Close Button */}
            <button
              onClick={() => setParticipantToDelete(null)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-rose-950/90 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner shrink-0 p-3">
                <UserX className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                  VERIFIKASI TINDAKAN
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  Hapus Data Peserta?
                </h3>
              </div>
            </div>

            {/* Target Participant Information Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">Nama Peserta:</span>
                <span className="text-sm font-extrabold text-white text-right">
                  {participantToDelete.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">Asal Sekolah/Ranting:</span>
                <span className="text-xs font-bold text-indigo-300 text-right">
                  {participantToDelete.institution}
                </span>
              </div>
            </div>

            {/* Warning Note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>
                Data peserta ini akan dihapus permanen dari sistem pendaftaran dan tidak akan tampil lagi di halaman <strong>Pantau Panitia</strong>.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDeleteParticipant}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow-lg shadow-rose-950 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Peserta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL VERIFIKASI HAPUS SEMUA PESERTA */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/50 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5 relative">
            <button
              onClick={() => setIsDeleteAllModalOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-rose-950/90 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner shrink-0 p-3">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                  PERINGATAN BERAT
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  Kosongkan Semua Peserta?
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
              Apakah Anda yakin ingin menghapus <strong>seluruh {participants.length} data peserta terdaftar</strong>? Tindakan ini akan mengosongkan tabel pendaftaran panitia.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDeleteAllParticipants}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow-lg shadow-rose-950 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
