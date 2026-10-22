import { NextRequest, NextResponse } from 'next/server';
import { PanitiaTelemetry, RegisteredParticipant } from '@/lib/types';
import { DEFAULT_APP_CONFIG } from '@/lib/default-config';
import { SAMPLE_DEFAULT_PARTICIPANTS } from '@/lib/excel-utils';

// Global in-memory storage for active participant locations across all clients
declare global {
  var participantsStore: Map<string, PanitiaTelemetry> | undefined;
}

if (!globalThis.participantsStore) {
  globalThis.participantsStore = new Map<string, PanitiaTelemetry>();
}

function seedDefaultParticipants() {
  const store = globalThis.participantsStore!;
  if (store.size > 0) return;

  const now = Date.now();
  const cps = DEFAULT_APP_CONFIG.checkpoints;

  SAMPLE_DEFAULT_PARTICIPANTS.forEach((p, idx) => {
    const cpIdx = (idx + 1) % cps.length;
    const cp = cps[cpIdx] || cps[0];
    const isAtFinish = cp.type === 'FINISH';

    const runner: PanitiaTelemetry = {
      participantId: p.id,
      name: p.name,
      institution: p.institution,
      lastLat: cp.lat + ((idx % 3) - 1) * 0.00015,
      lastLng: cp.lng + (((idx * 2) % 3) - 1) * 0.00015,
      lastUpdate: now - idx * 10000,
      currentPOS: cp.name,
      progress: isAtFinish ? 100 : Math.min(95, Math.round(((cpIdx + 1) / cps.length) * 100)),
      isOffRoute: idx === 3, // demo one off route for visualization
      finished: isAtFinish,
      speed: isAtFinish ? 0 : 4.5 + (idx % 3) * 0.3,
    };
    store.set(p.id, runner);
  });
}

export async function GET() {
  seedDefaultParticipants();
  const store = globalThis.participantsStore!;
  const runners = Array.from(store.values());

  return NextResponse.json({
    success: true,
    total: runners.length,
    runners,
    timestamp: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const store = globalThis.participantsStore!;

    // Action: Sync full registered participants list from Admin Panel
    if (action === 'sync-registered') {
      const { registeredList } = (await req.json()) as { registeredList: RegisteredParticipant[] };

      if (Array.isArray(registeredList)) {
        const allowedIds = new Set(registeredList.map((p) => p.id));

        // 1. Remove deleted participants from server store
        for (const [id] of store.entries()) {
          if (id !== 'user-self' && !allowedIds.has(id)) {
            store.delete(id);
          }
        }

        // 2. Add or update current registered participants
        const cps = DEFAULT_APP_CONFIG.checkpoints;
        const now = Date.now();

        registeredList.forEach((reg, idx) => {
          const existing = store.get(reg.id);
          if (existing) {
            existing.name = reg.name;
            existing.institution = reg.institution;
            store.set(reg.id, existing);
          } else {
            const cpIdx = (idx + 1) % cps.length;
            const cp = cps[cpIdx] || cps[0];
            const isAtFinish = cp.type === 'FINISH';

            store.set(reg.id, {
              participantId: reg.id,
              name: reg.name,
              institution: reg.institution,
              lastLat: cp.lat + ((idx % 3) - 1) * 0.00015,
              lastLng: cp.lng + (((idx * 2) % 3) - 1) * 0.00015,
              lastUpdate: now,
              currentPOS: cp.name,
              progress: isAtFinish ? 100 : Math.min(95, Math.round(((cpIdx + 1) / cps.length) * 100)),
              isOffRoute: false,
              finished: isAtFinish,
              speed: isAtFinish ? 0 : 4.8,
            });
          }
        });

        return NextResponse.json({
          success: true,
          syncedCount: store.size,
          runners: Array.from(store.values()),
        });
      }
    }

    // Standard single participant GPS telemetry update
    const body = (await req.json()) as Partial<PanitiaTelemetry>;

    if (!body.participantId || typeof body.lastLat !== 'number' || typeof body.lastLng !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid participant telemetry payload' },
        { status: 400 }
      );
    }

    const existing = store.get(body.participantId);

    const updated: PanitiaTelemetry = {
      participantId: body.participantId,
      name: body.name || existing?.name || 'Peserta Tanpa Nama',
      institution: body.institution || existing?.institution || 'Peserta Umum',
      lastLat: body.lastLat,
      lastLng: body.lastLng,
      lastUpdate: Date.now(),
      currentPOS: body.currentPOS || existing?.currentPOS || 'Rute',
      progress: typeof body.progress === 'number' ? body.progress : existing?.progress || 0,
      isOffRoute: Boolean(body.isOffRoute),
      finished: Boolean(body.finished),
      speed: typeof body.speed === 'number' ? body.speed : existing?.speed || null,
    };

    store.set(body.participantId, updated);

    return NextResponse.json({
      success: true,
      participant: updated,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process telemetry' },
      { status: 500 }
    );
  }
}
