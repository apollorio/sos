/**
 * Local-only persistence (IndexedDB, memory fallback). No PII by construction: the state holds
 * enums, timestamps and ids — never names, numbers, locations or free text (registry.storage).
 * Retention: a snapshot older than retentionHours is destroyed on load, never resumed.
 */
import type { SessionState } from "../../core/domain/state";
import type { LogEntry } from "../../core/domain/decision";

const DB = "sos-apollo";
const STORE = "kv";

export interface Store {
  loadState(): Promise<SessionState | null>;
  saveState(s: SessionState): Promise<void>;
  appendLog(e: LogEntry): Promise<void>;
  readLogs(): Promise<LogEntry[]>;
  wipe(): Promise<void>;
}

export async function openStore(retentionHours: number, maxLogs: number, clock: () => number): Promise<Store> {
  const idb = await openIdb().catch(() => null);
  const mem = new Map<string, unknown>();
  const get = async <T>(k: string): Promise<T | undefined> => (idb ? idbGet<T>(idb, k).catch(() => mem.get(k) as T) : (mem.get(k) as T));
  const put = async (k: string, v: unknown) => { mem.set(k, v); if (idb) await idbPut(idb, k, v).catch(() => undefined); };

  const store: Store = {
    async loadState() {
      const s = await get<SessionState>("state");
      if (!s) return null;
      if (clock() - s.lastAt > retentionHours * 3_600_000) { await store.wipe(); return null; }
      return s;
    },
    saveState: (s) => put("state", s),
    async appendLog(e) {
      const logs = (await get<LogEntry[]>("logs")) ?? [];
      await put("logs", [...logs, e].slice(-maxLogs));
    },
    async readLogs() { return (await get<LogEntry[]>("logs")) ?? []; },
    async wipe() {
      mem.clear();
      if (idb) await idbClear(idb).catch(() => undefined);
    },
  };
  return store;
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
