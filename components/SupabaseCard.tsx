'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  UploadCloud,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SUPABASE_CONFIG,
  testSupabaseConnection,
  syncParticipantsToSupabase,
  SUPABASE_SETUP_SQL,
} from '@/lib/supabase';
import { RegisteredParticipant } from '@/lib/types';

interface SupabaseCardProps {
  participants: RegisteredParticipant[];
  onSyncComplete?: () => void;
}

export const SupabaseCard: React.FC<SupabaseCardProps> = ({
  participants,
  onSyncComplete,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    loading: boolean;
    ok: boolean;
    message: string;
    tableReady: boolean;
  }>({
    tested: false,
    loading: false,
    ok: false,
    message: '',
    tableReady: false,
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [isSqlExpanded, setIsSqlExpanded] = useState<boolean>(false);

  // Check connection on mount
  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      setConnectionStatus((prev) => ({ ...prev, loading: true }));
      const result = await testSupabaseConnection();
      if (isMounted) {
        setConnectionStatus({
          tested: true,
          loading: false,
          ok: result.ok,
          message: result.message,
          tableReady: result.tableReady,
        });
      }
    };

    runCheck();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus((prev) => ({ ...prev, loading: true }));
    const result = await testSupabaseConnection();
    setConnectionStatus({
      tested: true,
      loading: false,
      ok: result.ok,
      message: result.message,
      tableReady: result.tableReady,
    });
  };

  const handleSyncToSupabase = async () => {
    if (participants.length === 0) {
      setSyncFeedback('Tidak ada data peserta untuk disinkronkan.');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    const success = await syncParticipantsToSupabase(participants);
    setIsSyncing(false);

    if (success) {
      setSyncFeedback(`Berhasil menyinkronkan ${participants.length} peserta ke Supabase!`);
      if (onSyncComplete) onSyncComplete();
    } else {
      setSyncFeedback('Gagal menyinkronkan. Pastikan tabel "participants" sudah dibuat di Supabase.');
    }

    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-4 md:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">INTEGRASI SUPABASE BACKEND</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-[10px] font-black text-emerald-300">
                TERHUBUNG
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Project: <strong className="text-emerald-300">{SUPABASE_CONFIG.projectName}</strong> ({SUPABASE_CONFIG.projectId})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={connectionStatus.loading}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${connectionStatus.loading ? 'animate-spin' : ''}`} />
            <span>Test Koneksi</span>
          </button>

          <a
            href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition shadow"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Buka Dashboard</span>
          </a>
        </div>
      </div>

      {/* Status Bar */}
      {connectionStatus.tested && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            connectionStatus.ok
              ? connectionStatus.tableReady
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {connectionStatus.ok ? (
              connectionStatus.tableReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{connectionStatus.message}</span>
          </div>

          {!connectionStatus.tableReady && connectionStatus.ok && (
            <button
              type="button"
              onClick={() => setIsSqlExpanded((prev) => !prev)}
              className="text-[11px] underline font-bold text-amber-300 hover:text-white shrink-0"
            >
              Lihat SQL Setup
            </button>
          )}
        </div>
      )}

      {/* Sync feedback banner */}
      {syncFeedback && (
        <div className="p-3 bg-blue-950/80 border border-blue-500/50 rounded-2xl text-blue-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Actions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleSyncToSupabase}
          disabled={isSyncing || participants.length === 0}
          className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isSyncing ? 'Menyinkronkan...' : `Sinkronkan ${participants.length} Peserta ke Supabase`}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSqlExpanded((prev) => !prev)}
          className="py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition shadow"
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>{isSqlExpanded ? 'Tutup Script SQL Tabel' : 'Script SQL Tabel Peserta'}</span>
          {isSqlExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* SQL Script Accordion Drawer */}
      {isSqlExpanded && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-300">
              Query SQL untuk Membuat Tabel di Supabase SQL Editor:
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Tersalin!' : 'Salin Query SQL'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48 whitespace-pre">
            {SUPABASE_SETUP_SQL}
          </pre>

          <p className="text-[11px] text-slate-400">
            Buka <a href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql`} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Supabase SQL Editor</a>, tempel (*paste*) query di atas, lalu klik <strong>Run</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
