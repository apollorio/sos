/**
 * REPORT SOURCE — where the Relatório / Modo Médico pages read the episode from. Read-only, local, same origin:
 *   live: IndexedDB `sos-apollo/kv` ("state" + "journal", written by the app's live feed) and the
 *         BroadcastChannel "sos-apollo-live" (instant updates while the app is open in another tab);
 *   tiles: localStorage `sos_tiles_journal` (written by app/tiles-journal.js when the tiles page runs without the engine)
 *         + the `storage` event / BroadcastChannel "sos-apollo-tiles" for instant updates;
 *   lab:  app/lab/cenarios.json — golden scenarios replayed through the real engine at build time.
 * A snapshot older than the acute retention (12 h) is ignored, exactly like the app ignores it on boot.
 */
import type { SessionState } from "../core/domain/state";
import type { Journal, JournalEvent } from "../core/journal/journal";
import { partitionRecords } from "../runtime/continuity/journal-store";
import { LIVE_CHANNEL, type LiveMessage } from "../runtime/live-feed";
import { parseTiles, TILES_KEY, TILES_CHANNEL, type TilesEpisode } from "./tiles";

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

/** The tiles page (app/index.html without the engine) keeps its own journal: localStorage, same 12 h retention. */
export function readTiles(retentionHours: number, now: number): TilesEpisode | null {
  try { return parseTiles(localStorage.getItem(TILES_KEY), now, retentionHours); } catch { return null; }
}

/** Tiles journal changed in another tab (storage event) or the tiles page pinged (BroadcastChannel). */
export function subscribeTiles(on: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === TILES_KEY || e.key === null) on(); };
  window.addEventListener("storage", onStorage);
  const ch = typeof BroadcastChannel === "function" ? new BroadcastChannel(TILES_CHANNEL) : null;
  if (ch) ch.onmessage = () => on();
  return () => { window.removeEventListener("storage", onStorage); ch?.close(); };
}

export async function loadLab(url: string): Promise<LabScenario[]> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) return [];
    const list = (await r.json()) as LabScenario[];
    return Array.isArray(list) ? list.map((s) => ({ ...s, events: partitionRecords(s.events).ok })) : [];
  } catch { return []; }
}
