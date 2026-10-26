'use client';

import React, { useState } from 'react';
import {
  Shield,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  AlertCircle,
  Check,
  MapPin,
  Settings,
  Users,
  Route,
  Sparkles,
  FileSpreadsheet,
  UserCheck,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { AppConfig, Checkpoint, RegisteredParticipant } from '@/lib/types';
import { AdminParticipantManager } from './AdminParticipantManager';
import { SupabaseCard } from './SupabaseCard';

interface AdminSettingsProps {
  config: AppConfig;
  registeredParticipants?: RegisteredParticipant[];
  onSaveConfig: (newConfig: AppConfig) => void;
  onResetToDefault: () => void;
  onUpdateParticipants?: (newList: RegisteredParticipant[]) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  config,
  registeredParticipants = [],
  onSaveConfig,
  onResetToDefault,
  onUpdateParticipants,
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'peserta' | 'supabase' | 'rute'>('peserta');
  const [formData, setFormData] = useState<AppConfig>(JSON.parse(JSON.stringify(config)));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTextChange = (field: keyof AppConfig, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckpointChange = (
    index: number,
    field: keyof Checkpoint,
    value: string | number
  ) => {
    const updatedCheckpoints = [...formData.checkpoints];
    updatedCheckpoints[index] = {
      ...updatedCheckpoints[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, checkpoints: updatedCheckpoints }));
  };

  const handleAddCheckpoint = () => {
    const posCount = formData.checkpoints.filter((c) => c.type === 'POS').length + 1;
    const lastCp = formData.checkpoints[formData.checkpoints.length - 2] || formData.checkpoints[0];

    const newCp: Checkpoint = {
      id: `POS_${Date.now()}`,
      name: `POS ${posCount}`,
      type: 'POS',
      lat: lastCp.lat - 0.001,
      lng: lastCp.lng + 0.001,
      description: `POS Checkpoint ${posCount} Tambahan`,
    };

    // Insert before FINISH
    const updated = [...formData.checkpoints];
    updated.splice(updated.length - 1, 0, newCp);
    setFormData((prev) => ({ ...prev, checkpoints: updated }));
  };

  const handleDeleteCheckpoint = (index: number) => {
    const cp = formData.checkpoints[index];
    if (cp.type === 'START' || cp.type === 'FINISH') {
      alert('Titik START dan FINISH tidak dapat dihapus.');
      return;
    }
    const updated = formData.checkpoints.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, checkpoints: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate coordinates
    for (const cp of formData.checkpoints) {
      if (isNaN(cp.lat) || cp.lat < -90 || cp.lat > 90) {
        setErrorMessage(`Latitude untuk ${cp.name} tidak valid (-90 s.d 90).`);
        return;
      }
      if (isNaN(cp.lng) || cp.lng < -180 || cp.lng > 180) {
        setErrorMessage(`Longitude untuk ${cp.name} tidak valid (-180 s.d 180).`);
        return;
      }
    }

    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. KOTAK RANGKUMAN & PEMBAHARUAN FITUR SISTEM TERBARU */}
      <div className="bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 border-2 border-indigo-500/50 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-[10px] font-black text-emerald-400">
                  PEMBAHARUAN FITUR AKTIF
                </span>
                <span className="text-xs font-mono text-slate-400">v2.4 - PGRI Pasirwangi</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                RANGKUMAN & PEMBAHARUAN FITUR ADMIN PANEL
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-indigo-900/60 border border-indigo-500/40 text-xs font-bold text-indigo-200">
              {registeredParticipants.length} Peserta Terdaftar
            </span>
          </div>
        </div>

        {/* 4 Pilar Fitur Utama Baru */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-900/80 border border-indigo-500/20 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xs mb-1">
              <Users className="w-4 h-4 shrink-0" />
              <span>1. Input Peserta Baru</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formulir lengkap: Nama, Asal Sekolah/Ranting, Nomor Peserta otomatis, No HP, dan Keterangan.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/20 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs mb-1">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>2. Alat Excel (.xlsx)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Unduh Template Excel resmi, Import ratusan peserta massal, dan Export ke file .xlsx instan.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/20 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs mb-1">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>3. Daftar Peserta Admin</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Pencarian instan per sekolah/nama, kelola hapus/edit data peserta, dan statistik kehadiran.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/20 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs mb-1">
              <Route className="w-4 h-4 shrink-0" />
              <span>4. Sinkron Pantau Panitia</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Seluruh peserta yang didaftarkan langsung terlihat di halaman Pantau Panitia dan Peta Radar.
            </p>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATOR MENU ADMIN */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">MENU PENGATURAN ADMIN</h3>
              <p className="text-xs text-slate-400">
                Pilih menu untuk mengelola data peserta terdaftar atau konfigurasi rute kegiatan
              </p>
            </div>
          </div>

          {activeAdminSubTab === 'rute' && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Koordinat Resmi</span>
            </button>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveAdminSubTab('peserta')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition ${
              activeAdminSubTab === 'peserta'
                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">PESERTA ({registeredParticipants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('supabase')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition ${
              activeAdminSubTab === 'supabase'
                ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="truncate">SUPABASE DB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('rute')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition ${
              activeAdminSubTab === 'rute'
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Route className="w-4 h-4 shrink-0" />
            <span className="truncate">RUTE & POS</span>
          </button>
        </div>

        {/* SECTION 1: DATA PESERTA TERDAFTAR */}
        {activeAdminSubTab === 'peserta' && (
          <AdminParticipantManager
            participants={registeredParticipants}
            onUpdateParticipants={onUpdateParticipants || (() => {})}
            eventName={config.eventName}
          />
        )}

        {/* SECTION 2: KONEKSI SUPABASE BACKEND */}
        {activeAdminSubTab === 'supabase' && (
          <SupabaseCard
            participants={registeredParticipants}
            onSyncComplete={() => {}}
          />
        )}

        {/* SECTION: PENGATURAN RUTE & POS CHECKPOINT */}
        {activeAdminSubTab === 'rute' && (
          <div className="space-y-6">
            {savedSuccess && (
              <div className="p-3 bg-emerald-950 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Pengaturan berhasil disimpan! Peta dan deteksi rute diperbarui.
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-950 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. General Event Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  INFORMASI KEGIATAN & EVENT
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Nama Kegiatan</label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) => handleTextChange('eventName', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Subjudul Kegiatan</label>
                    <input
                      type="text"
                      value={formData.subTitle}
                      onChange={(e) => handleTextChange('subTitle', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Penyelenggara</label>
                    <input
                      type="text"
                      value={formData.organizer}
                      onChange={(e) => handleTextChange('organizer', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Warna Jalur Polyline</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={formData.polylineColor}
                        onChange={(e) => handleTextChange('polylineColor', e.target.value)}
                        className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        value={formData.polylineColor}
                        onChange={(e) => handleTextChange('polylineColor', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400">Teks Pengumuman Default</label>
                  <textarea
                    value={formData.announcementText}
                    onChange={(e) => handleTextChange('announcementText', e.target.value)}
                    rows={2}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* 2. Checkpoints (START, POS, FINISH) */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    TITIK CHECKPOINT & POS JALAN SANTAI
                  </h3>

                  <button
                    type="button"
                    onClick={handleAddCheckpoint}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Titik POS</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.checkpoints.map((cp, idx) => (
                    <div
                      key={cp.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              cp.type === 'START'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                : cp.type === 'FINISH'
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                : 'bg-blue-950 text-blue-400 border border-blue-500/40'
                            }`}
                          >
                            {cp.type}
                          </span>
                          <input
                            type="text"
                            value={cp.name}
                            onChange={(e) => handleCheckpointChange(idx, 'name', e.target.value)}
                            className="bg-transparent font-bold text-xs text-white border-b border-transparent focus:border-blue-500 outline-none"
                          />
                        </div>

                        {cp.type === 'POS' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCheckpoint(idx)}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-950 transition"
                            title="Hapus POS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={cp.lat}
                            onChange={(e) => handleCheckpointChange(idx, 'lat', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={cp.lng}
                            onChange={(e) => handleCheckpointChange(idx, 'lng', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Rute</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
