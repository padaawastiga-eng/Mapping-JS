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
  Palette,
  Sliders,
} from 'lucide-react';
import { AppConfig, Checkpoint } from '@/lib/types';
import { DEFAULT_APP_CONFIG } from '@/lib/default-config';

interface AdminSettingsProps {
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onResetToDefault: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  config,
  onSaveConfig,
  onResetToDefault,
}) => {
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-base font-extrabold text-white">PANEL PENGATURAN ADMIN</h2>
            <p className="text-xs text-slate-400">
              Konfigurasi parameter Rute, Titik POS, Toleransi, dan Tampilan Aplikasi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetToDefault}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Koordinat Resmi</span>
        </button>
      </div>

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
            <label className="text-[11px] font-bold text-slate-400">Informasi & Pengumuman Peserta</label>
            <textarea
              value={formData.announcementText}
              onChange={(e) => handleTextChange('announcementText', e.target.value)}
              rows={2}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>
        </div>

        {/* 2. Tolerance & Radius Parameters */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            PARAMETER DETEKSI GPS & TOLERANSI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400">
                Radius Checkpoint POS (Meter)
              </label>
              <input
                type="number"
                value={formData.checkpointRadius}
                onChange={(e) => handleTextChange('checkpointRadius', Number(e.target.value))}
                min={5}
                max={200}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Jarak radius untuk otomatis menandai POS terlewati (Default: 30m).
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400">
                Toleransi Koridor Keluar Rute (Meter)
              </label>
              <input
                type="number"
                value={formData.offRouteTolerance}
                onChange={(e) => handleTextChange('offRouteTolerance', Number(e.target.value))}
                min={10}
                max={200}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Batas maksimal penyimpangan sebelum peringatan merah (Default: 40m).
              </span>
            </div>
          </div>
        </div>

        {/* 3. Checkpoints Coordinates List */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              KOORDINAT RESMI TITIK JALUR & CHECKPOINT
            </h3>

            <button
              type="button"
              onClick={handleAddCheckpoint}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah POS</span>
            </button>
          </div>

          <div className="space-y-3">
            {formData.checkpoints.map((cp, idx) => (
              <div
                key={cp.id || idx}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cp.type === 'START'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : cp.type === 'FINISH'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}
                    >
                      {cp.type}
                    </span>
                    <input
                      type="text"
                      value={cp.name}
                      onChange={(e) => handleCheckpointChange(idx, 'name', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white"
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
            <span>Simpan Perubahan Admin</span>
          </button>
        </div>
      </form>
    </div>
  );
};
