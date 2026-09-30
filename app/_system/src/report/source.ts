/**
 * REPORT SOURCE — where the Relatório / Modo Médico pages read the episode from. Read-only, local, same origin:
 *   live: IndexedDB `sos-apollo/kv` ("state" + "journal", written by the app's live feed) and the
 *         BroadcastChannel "sos-apollo-live" (instant updates while the app is open in another tab);
 *   lab:  app/lab/cenarios.json — golden scenarios replayed through the real engine at build time.
 * A snapshot older than the acute retention (12 h) is ignored, exactly like the app ignores it on boot.
 */
import type { SessionState } from "../core/domain/state";
import type { Journal, JournalEvent } from "../core/journal/journal";
import { partitionRecords } from "../runtime/continuity/journal-store";
import { LIVE_CHANNEL, type LiveMessage } from "../runtime/live-feed";

export interface Snapshot { episodeId: string; events: JournalEvent[]; state: SessionState | null; now: number | null }
export interface LabScenario { name: string; title: string; doc: string; episodeId: string; events: JournalEvent[]; state: SessionState; now: number }

const DB = "sos-apollo";
const STORE = "kv";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      if (typeof indexedDB === "undefined") return res(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch { res(null); }
  });
}
function get<T>(db: IDBDatabase, k: string): Promise<T | undefined> {
  return new Promise((res) => {
    try {
      const q = db.transaction(STORE, "readonly").objectStore(STORE).get(k);
      q.onsuccess = () => res(q.result as T | undefined);
      q.onerror = () => res(undefined);
    } catch { res(undefined); }
  });
}

/** One read of the app's acute store. Null when there is no active or recent episode on this device. */
export async function readLive(retentionHours: number, now: number): Promise<Snapshot | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const state = await get<SessionState>(db, "state");
    if (!state || state.status === "wiped" || now - state.lastAt > retentionHours * 3_600_000) return null;
    const j = await get<Journal>(db, "journal");
    const events = j && j.episodeId === state.sessionId ? partitionRecords(j.events).ok : [];
    return { episodeId: state.sessionId, events, state, now: null };
  } finally { db.close(); }
}

/** Live updates from an open app tab. Returns an unsubscribe function. */
export function subscribeLive(on: (s: Snapshot | "wiped") => void): () => void {
  if (typeof BroadcastChannel !== "function") return () => undefined;
  const ch = new BroadcastChannel(LIVE_CHANNEL);
  ch.onmessage = (e: MessageEvent<LiveMessage>) => {
    const m = e.data;
    if (!m || m.v !== 1) return;
    if (m.kind === "wiped") on("wiped");
    else if (m.kind === "step" && m.journal && m.state && m.journal.episodeId === m.state.sessionId) {
      on({ episodeId: m.episodeId, events: partitionRecords(m.journal.events).ok, state: m.state, now: null });
    }
  };
  const hello: LiveMessage = { v: 1, kind: "hello" };
  try { ch.postMessage(hello); } catch { /* no app open: IndexedDB covers it */ }
  return () => ch.close();
}

export async function loadLab(url: string): Promise<LabScenario[]> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) return [];
    const list = (await r.json()) as LabScenario[];
    return Array.isArray(list) ? list.map((s) => ({ ...s, events: partitionRecords(s.events).ok })) : [];
  } catch { return []; }
}
