import { createClient } from '@supabase/supabase-js';
import { RegisteredParticipant, PanitiaTelemetry } from './types';

// Supabase Credentials provided by user
export const SUPABASE_CONFIG = {
  projectName: 'Jalan Santai Monitoring',
  projectId: 'nyklzuiytafdiidqrfnv',
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nyklzuiytafdiidqrfnv.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_74yjGS-VXDg74M6I-7E6Hw_FGKjl5n3',
};

// Clean Base URL without trailing /rest/v1/
const rawUrl = SUPABASE_CONFIG.url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabase = createClient(rawUrl, SUPABASE_CONFIG.anonKey);

export const SUPABASE_SETUP_SQL = `-- SQL SETUP TABEL SUPABASE UNTUK JALAN SANTAI PGRI PASIRWANGI
-- Jalankan query ini di menu SQL Editor pada Dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  nomor_peserta TEXT,
  phone TEXT,
  notes TEXT,
  registered_at BIGINT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_update BIGINT,
  current_pos TEXT,
  progress INTEGER DEFAULT 0,
  is_off_route BOOLEAN DEFAULT FALSE,
  finished BOOLEAN DEFAULT FALSE,
  speed DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buka izin akses baca dan tulis (RLS Policy)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to participants" ON participants;
CREATE POLICY "Public full access to participants" 
ON participants FOR ALL 
USING (true) 
WITH CHECK (true);
`;

/**
 * Test Supabase connectivity
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; tableReady: boolean }> {
  try {
    const res = await fetch(`${rawUrl}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_CONFIG.anonKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
      },
    });

    if (!res.ok && res.status !== 200) {
      return {
        ok: false,
        message: `HTTP ${res.status}: ${res.statusText}`,
        tableReady: false,
      };
    }

    // Check if participants table exists
    const { error } = await supabase.from('participants').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist') || error.code === 'PGRST205') {
        return {
          ok: true,
          message: 'Terhubung ke Supabase, namun tabel "participants" belum dibuat di database.',
          tableReady: false,
        };
      }
      return {
        ok: true,
        message: `Terhubung ke Supabase: ${error.message}`,
        tableReady: false,
      };
    }

    return {
      ok: true,
      message: 'Koneksi ke Supabase aktif dan tabel "participants" siap digunakan!',
      tableReady: true,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menghubungi server Supabase';
    return {
      ok: false,
      message: errorMsg,
      tableReady: false,
    };
  }
}

/**
 * Fetch all registered participants from Supabase
 */
export async function fetchParticipantsFromSupabase(): Promise<RegisteredParticipant[] | null> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error || !data) {
      return null;
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      institution: item.institution,
      nomorPeserta: item.nomor_peserta || '',
      phone: item.phone || undefined,
      notes: item.notes || undefined,
      registeredAt: Number(item.registered_at) || Date.now(),
    }));
  } catch {
    return null;
  }
}

/**
 * Upsert list of participants to Supabase
 */
export async function syncParticipantsToSupabase(participants: RegisteredParticipant[]): Promise<boolean> {
  if (participants.length === 0) return true;

  try {
    const rows = participants.map((p) => ({
      id: p.id,
      name: p.name,
      institution: p.institution,
      nomor_peserta: p.nomorPeserta,
      phone: p.phone || null,
      notes: p.notes || null,
      registered_at: p.registeredAt,
    }));

    const { error } = await supabase
      .from('participants')
      .upsert(rows, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete a participant from Supabase
 */
export async function deleteParticipantFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync single participant telemetry (GPS, POS, Progress) to Supabase
 */
export async function updateParticipantTelemetryInSupabase(telemetry: Partial<PanitiaTelemetry>): Promise<boolean> {
  if (!telemetry.participantId) return false;

  try {
    const payload: Record<string, unknown> = {
      id: telemetry.participantId,
      last_lat: telemetry.lastLat,
      last_lng: telemetry.lastLng,
      last_update: telemetry.lastUpdate || Date.now(),
      current_pos: telemetry.currentPOS,
      progress: telemetry.progress,
      is_off_route: telemetry.isOffRoute,
      finished: telemetry.finished,
      speed: telemetry.speed || 0,
    };

    if (telemetry.name) payload.name = telemetry.name;
    if (telemetry.institution) payload.institution = telemetry.institution;

    const { error } = await supabase
      .from('participants')
      .upsert(payload, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}
