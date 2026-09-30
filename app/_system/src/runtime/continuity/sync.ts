/**
 * SYNC QUEUE (Phase 6). Append-only, idempotent, best-effort, NEVER on the critical path (INV-019, L13, L19).
 * The client encrypts each event payload (envelope) and pushes batches signed by the vault identity.
 * `VaultClient` is the protocol boundary (docs/api/VAULT-PROTOCOL.md); `MemoryVaultServer` is its reference.
 */
import type { JournalEvent } from "../../core/journal/journal";
import type { VaultStore } from "./journal-store";
import type { VaultIdentity } from "../trust/vault-identity";
import { signRequest, verifyRequest } from "../trust/vault-identity";
import { seal, open, newDek, type Envelope } from "../trust/envelope";

/** What crosses the wire: everything but the payload is operational; the payload is ciphertext. */
export interface WireEvent {
  eventId: string; episodeId: string; clientSeq: number; clientObservedAt: number; kind: string; schemaVersion: 2;
  payloadEnc: Envelope;
}
export interface PushResult { accepted: string[]; duplicate: string[]; serverReceivedAt: number }
export interface VaultClient {
  push(vault: string, events: WireEvent[], auth: { ts: number; sig: string }, body: string): Promise<PushResult>;
}

export interface SyncOptions { batchSize?: number; clock: () => number }

export class SyncQueue {
  private flushing = false;
  private online = true;
  constructor(private readonly store: VaultStore, private readonly identity: VaultIdentity | null, private readonly client: VaultClient | null, private readonly opts: SyncOptions) {}

  setOnline(on: boolean): void { this.online = on; }

  /** Enqueue is local and cannot fail the caller. Returns after the local append only. */
  async enqueue(evs: JournalEvent[]): Promise<void> {
    try { await this.store.append(evs); } catch { /* local vault unavailable: acute plane unaffected */ }
  }

  /** Best-effort flush. Never throws. Returns how many were accepted by the server this round. */
  async flush(): Promise<number> {
    if (this.flushing || !this.online || !this.identity || !this.client) return 0;
    this.flushing = true;
    let total = 0;
    try {
      const pendingIds = new Set(await this.store.pending());
      if (!pendingIds.size) return 0;
      const all = (await this.store.readAll()).filter((e) => pendingIds.has(e.eventId)).sort((a, b) => a.clientObservedAt - b.clientObservedAt || a.clientSeq - b.clientSeq);
      const size = this.opts.batchSize ?? 100;
      for (let i = 0; i < all.length; i += size) {
        const batch = all.slice(i, i + size);
        const wire = await Promise.all(batch.map((e) => toWire(e, this.identity!)));
        const body = JSON.stringify(wire);
        const ts = this.opts.clock();
        const auth = await signRequest(this.identity, body, ts);
        const res = await this.client.push(this.identity.vaultId, wire, { ts: auth.ts, sig: auth.sig }, body);
        const done = [...res.accepted, ...res.duplicate];
        await this.store.markSynced(done, res.serverReceivedAt);
        total += res.accepted.length;
      }
    } catch { /* retry on next flush; nothing on screen changes (INV-019) */ }
    finally { this.flushing = false; }
    return total;
  }
}

async function toWire(e: JournalEvent, id: VaultIdentity): Promise<WireEvent> {
  const dek = await newDek();
  const payloadEnc = await seal(JSON.stringify({ origin: e.origin, provenance: e.provenance, confidenceClass: e.confidenceClass, payload: e.payload }), dek, id.kek);
  return { eventId: e.eventId, episodeId: e.episodeId, clientSeq: e.clientSeq, clientObservedAt: e.clientObservedAt, kind: e.kind, schemaVersion: 2, payloadEnc };
}

export async function fromWire(w: WireEvent, kek: CryptoKey, serverReceivedAt: number | null): Promise<JournalEvent> {
  const inner = JSON.parse(await open(w.payloadEnc, kek)) as Pick<JournalEvent, "origin" | "provenance" | "confidenceClass" | "payload">;
  return { eventId: w.eventId, episodeId: w.episodeId, clientSeq: w.clientSeq, clientObservedAt: w.clientObservedAt, serverReceivedAt, kind: w.kind as JournalEvent["kind"], schemaVersion: 2, ...inner };
}

/** Reference server: exactly the contract in docs/api/VAULT-PROTOCOL.md. Stores ciphertext only. */
export class MemoryVaultServer implements VaultClient {
  readonly vaults = new Map<string, string>(); // vaultId → publicKey
  readonly events = new Map<string, WireEvent & { serverReceivedAt: number }>();
  readonly security: { at: number; kind: string }[] = [];
  constructor(private readonly clock: () => number, public failNext = 0) {}

  register(vaultId: string, publicKeyB64u: string): void { this.vaults.set(vaultId, publicKeyB64u); }

  async push(vault: string, events: WireEvent[], auth: { ts: number; sig: string }, body: string): Promise<PushResult> {
    if (this.failNext > 0) { this.failNext -= 1; throw new Error("503"); }
    const pk = this.vaults.get(vault);
    const now = this.clock();
    if (!pk || !(await verifyRequest(pk, body, auth.ts, auth.sig, now))) { this.security.push({ at: now, kind: "bad_signature" }); throw new Error("401"); }
    if (body !== JSON.stringify(events)) throw new Error("400");
    const accepted: string[] = [], duplicate: string[] = [];
    for (const e of events) {
      if (!e.eventId.startsWith(`${e.episodeId}:`)) throw new Error("400 eventId");
      if (this.events.has(e.eventId)) { duplicate.push(e.eventId); continue; }
      this.events.set(e.eventId, { ...e, serverReceivedAt: now });
      accepted.push(e.eventId);
    }
    return { accepted, duplicate, serverReceivedAt: now };
  }
}
