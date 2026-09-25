/**
 * LOCAL CONTINUITY VAULT (Phase 7, local half). IndexedDB `sos-apollo-vault`, memory fallback.
 * Append-only journal across episodes (180 days), a pending-sync set, consent preferences.
 * Opening the store never blocks the acute plane: boot() awaits nothing here (INV-019).
 */
import type { JournalEvent } from "../../core/journal/journal";
import { JOURNAL_KINDS } from "../../generated/registry.gen";

const KINDS = new Set<string>(JOURNAL_KINDS);
/** Event ids of whatever is in a record list — storage content is untrusted, so tolerate garbage. */
const idsOf = (evs: readonly unknown[]): Set<string> =>
  new Set(evs.flatMap((e) => (e && typeof e === "object" && typeof (e as { eventId?: unknown }).eventId === "string" ? [(e as { eventId: string }).eventId] : [])));
/** A record is accepted only if it has the v2 shape; anything else is quarantined, never fed to the snapshot. */
export function isJournalEvent(x: unknown): x is JournalEvent {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return typeof e["eventId"] === "string" && typeof e["episodeId"] === "string" && typeof e["clientSeq"] === "number" && typeof e["clientObservedAt"] === "number"
    && typeof e["kind"] === "string" && KINDS.has(e["kind"]) && typeof e["provenance"] === "string" && e["schemaVersion"] === 2
    && !!e["payload"] && typeof e["payload"] === "object" && !Array.isArray(e["payload"]);
}

export function partitionRecords(raw: unknown): { ok: JournalEvent[]; quarantined: unknown[] } {
  const list = Array.isArray(raw) ? raw : [];
  const ok: JournalEvent[] = [], quarantined: unknown[] = [];
  for (const x of list) (isJournalEvent(x) ? ok : quarantined).push(x);
  return { ok, quarantined };
}

const DB = "sos-apollo-vault";
const STORE = "kv";

export interface ConsentPrefs {
  continuity: boolean;
  emergencyPassport: boolean;
  location: "unavailable" | "approximate_region" | "explicit_current_location";
  decidedAt: number | null;
}

export interface VaultStore {
  /** Valid v2 events only; malformed records are moved to quarantine on read (INV-024). */
  readAll(): Promise<JournalEvent[]>;
  quarantined(): Promise<number>;
  append(evs: JournalEvent[]): Promise<{ added: number; duplicate: number }>;
  /** Replace the journal (retention purge); pending sync ids of removed events are dropped too. */
  replaceAll(evs: JournalEvent[]): Promise<void>;
  /** Erase one episode ("Apagar agora"). */
  removeEpisode(episodeId: string): Promise<number>;
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

  // Every operation is a read-modify-write over separate IDB transactions: run them one at a time, or an append
  // racing an erase could resurrect an erased episode (lost update).
  let tail: Promise<unknown> = Promise.resolve();
  const locked = <T>(f: () => Promise<T>): Promise<T> => {
    const run = tail.then(f, f);
    tail = run.catch(() => undefined);
    return run;
  };

  const events = async () => {
    const { ok, quarantined } = partitionRecords(await get<unknown>("journal"));
    if (quarantined.length) {
      const q = (await get<unknown[]>("quarantine")) ?? [];
      await put("quarantine", [...q, ...quarantined].slice(-100));
      await put("journal", ok);
    }
    return ok;
  };
  const replaceAll = async (evs: JournalEvent[]) => {
    await put("journal", evs);
    const keep = idsOf(evs);
    await put("pending", ((await get<string[]>("pending")) ?? []).filter((id) => keep.has(id)));
  };

  return {
    readAll: () => locked(events),
    quarantined: () => locked(async () => ((await get<unknown[]>("quarantine")) ?? []).length),
    append: (evs) => locked(async () => {
      const cur = await events();
      const seen = new Set(cur.map((e) => e.eventId));
      const fresh = evs.filter((e) => !seen.has(e.eventId));
      if (fresh.length) {
        await put("journal", [...cur, ...fresh]);
        const pend = (await get<string[]>("pending")) ?? [];
        await put("pending", [...pend, ...fresh.map((e) => e.eventId)]);
      }
      return { added: fresh.length, duplicate: evs.length - fresh.length };
    }),
    replaceAll: (evs) => locked(() => replaceAll(evs)),
    removeEpisode: (episodeId) => locked(async () => {
      const cur = await events();
      const kept = cur.filter((e) => e.episodeId !== episodeId);
      if (kept.length !== cur.length) await replaceAll(kept);
      return cur.length - kept.length;
    }),
    pending: () => locked(async () => (await get<string[]>("pending")) ?? []),
    markSynced: (ids, serverReceivedAt) => locked(async () => {
      const set = new Set(ids);
      const cur = await events();
      await put("journal", cur.map((e) => (set.has(e.eventId) && e.serverReceivedAt === null ? { ...e, serverReceivedAt } : e)));
      const pend = (await get<string[]>("pending")) ?? [];
      await put("pending", pend.filter((id) => !set.has(id)));
    }),
    consent: () => locked(async () => (await get<ConsentPrefs>("consent")) ?? DEFAULT_CONSENT),
    setConsent: (c) => locked(() => put("consent", c)),
    wipe: () => locked(async () => { mem.clear(); if (idb) await idbClear(idb).catch(() => undefined); }),
  };
}

/** In-memory vault for tests and the simulator. */
export function memoryVaultStore(): VaultStore {
  let journal: JournalEvent[] = [];
  let pending: string[] = [];
  let consent: ConsentPrefs = DEFAULT_CONSENT;
  let quarantine = 0;
  return {
    async readAll() { const { ok, quarantined } = partitionRecords(journal); quarantine += quarantined.length; journal = ok; return ok; },
    quarantined: async () => quarantine,
    async append(evs) {
      const seen = new Set(journal.map((e) => e.eventId));
      const fresh = evs.filter((e) => !seen.has(e.eventId));
      journal = [...journal, ...fresh];
      pending = [...pending, ...fresh.map((e) => e.eventId)];
      return { added: fresh.length, duplicate: evs.length - fresh.length };
    },
    async replaceAll(evs) { journal = evs; const keep = idsOf(evs); pending = pending.filter((id) => keep.has(id)); },
    async removeEpisode(episodeId) { const before = journal.length; journal = journal.filter((e) => e.episodeId !== episodeId); const keep = idsOf(journal); pending = pending.filter((id) => keep.has(id)); return before - journal.length; },
    pending: async () => pending,
    async markSynced(ids, at) {
      const set = new Set(ids);
      journal = journal.map((e) => (set.has(e.eventId) && e.serverReceivedAt === null ? { ...e, serverReceivedAt: at } : e));
      pending = pending.filter((id) => !set.has(id));
    },
    consent: async () => consent,
    async setConsent(c) { consent = c; },
    async wipe() { journal = []; pending = []; consent = DEFAULT_CONSENT; quarantine = 0; },
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
