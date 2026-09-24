/**
 * LOCAL CONTINUITY VAULT (Phase 7, local half). IndexedDB `sos-apollo-vault`, memory fallback.
 * Append-only journal across episodes (180 days), a pending-sync set, consent preferences.
 * Opening the store never blocks the acute plane: boot() awaits nothing here (INV-019).
 */
import type { JournalEvent } from "../../core/journal/journal";

const DB = "sos-apollo-vault";
const STORE = "kv";

export interface ConsentPrefs {
  continuity: boolean;
  emergencyPassport: boolean;
  location: "unavailable" | "approximate_region" | "explicit_current_location";
  decidedAt: number | null;
}

export interface VaultStore {
  readAll(): Promise<JournalEvent[]>;
  append(evs: JournalEvent[]): Promise<{ added: number; duplicate: number }>;
  replaceAll(evs: JournalEvent[]): Promise<void>;
  pending(): Promise<string[]>;
  markSynced(eventIds: string[], serverReceivedAt: number): Promise<void>;
  consent(): Promise<ConsentPrefs>;
  setConsent(c: ConsentPrefs): Promise<void>;
  wipe(): Promise<void>;
}

export const DEFAULT_CONSENT: ConsentPrefs = { continuity: false, emergencyPassport: false, location: "unavailable", decidedAt: null };

export async function openVaultStore(): Promise<VaultStore> {
  const idb = await openIdb().catch(() => null);
  const mem = new Map<string, unknown>();
  const get = async <T>(k: string): Promise<T | undefined> => (idb ? idbGet<T>(idb, k).catch(() => mem.get(k) as T) : (mem.get(k) as T));
  const put = async (k: string, v: unknown) => { mem.set(k, v); if (idb) await idbPut(idb, k, v).catch(() => undefined); };
  const events = async () => (await get<JournalEvent[]>("journal")) ?? [];

  return {
    readAll: events,
    async append(evs) {
      const cur = await events();
      const seen = new Set(cur.map((e) => e.eventId));
      const fresh = evs.filter((e) => !seen.has(e.eventId));
      if (fresh.length) {
        await put("journal", [...cur, ...fresh]);
        const pend = (await get<string[]>("pending")) ?? [];
        await put("pending", [...pend, ...fresh.map((e) => e.eventId)]);
      }
      return { added: fresh.length, duplicate: evs.length - fresh.length };
    },
    replaceAll: (evs) => put("journal", evs),
    async pending() { return (await get<string[]>("pending")) ?? []; },
    async markSynced(ids, serverReceivedAt) {
      const set = new Set(ids);
      const cur = await events();
      await put("journal", cur.map((e) => (set.has(e.eventId) && e.serverReceivedAt === null ? { ...e, serverReceivedAt } : e)));
      const pend = (await get<string[]>("pending")) ?? [];
      await put("pending", pend.filter((id) => !set.has(id)));
    },
    async consent() { return (await get<ConsentPrefs>("consent")) ?? DEFAULT_CONSENT; },
    setConsent: (c) => put("consent", c),
    async wipe() { mem.clear(); if (idb) await idbClear(idb).catch(() => undefined); },
  };
}

/** In-memory vault for tests and the simulator. */
export function memoryVaultStore(): VaultStore {
  let journal: JournalEvent[] = [];
  let pending: string[] = [];
  let consent: ConsentPrefs = DEFAULT_CONSENT;
  return {
    readAll: async () => journal,
    async append(evs) {
      const seen = new Set(journal.map((e) => e.eventId));
      const fresh = evs.filter((e) => !seen.has(e.eventId));
      journal = [...journal, ...fresh];
      pending = [...pending, ...fresh.map((e) => e.eventId)];
      return { added: fresh.length, duplicate: evs.length - fresh.length };
    },
    async replaceAll(evs) { journal = evs; },
    pending: async () => pending,
    async markSynced(ids, at) {
      const set = new Set(ids);
      journal = journal.map((e) => (set.has(e.eventId) && e.serverReceivedAt === null ? { ...e, serverReceivedAt: at } : e));
      pending = pending.filter((id) => !set.has(id));
    },
    consent: async () => consent,
    async setConsent(c) { consent = c; },
    async wipe() { journal = []; pending = []; consent = DEFAULT_CONSENT; },
  };
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no idb"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    const req = f(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
const idbGet = <T>(db: IDBDatabase, k: string) => tx<T>(db, "readonly", (s) => s.get(k) as IDBRequest<T>);
const idbPut = (db: IDBDatabase, k: string, v: unknown) => tx(db, "readwrite", (s) => s.put(v, k));
const idbClear = (db: IDBDatabase) => tx(db, "readwrite", (s) => s.clear());
