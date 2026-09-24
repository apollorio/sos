/** VAULT IDENTITY + ENVELOPE + SYNC — ADR-0007, D13, INV-019, INV-024 (server side). Node WebCrypto. */
import { describe, it, expect } from "vitest";
import { newSeed, deriveIdentity, seedToRecoveryKey, recoveryKeyToSeed, verifySignature, vaultIdFromPublicKey, signRequest, verifyRequest } from "../../src/runtime/trust/vault-identity";
import { seal, open, newDek } from "../../src/runtime/trust/envelope";
import { memoryVaultStore } from "../../src/runtime/continuity/journal-store";
import { SyncQueue, MemoryVaultServer, fromWire } from "../../src/runtime/continuity/sync";
import { runWithJournal } from "../continuity/helpers";

describe("vault identity", () => {
  it("same seed ⇒ same vaultId and public key; recovery key round-trips (ADR-0007)", async () => {
    const seed = newSeed();
    const a = await deriveIdentity(seed);
    const key = seedToRecoveryKey(seed);
    expect(key).toMatch(/^[0-9A-Z]{5}(-[0-9A-Z]{5}){4}-[0-9A-Z]{1}$|^[0-9A-Z]{5}(-[0-9A-Z]{1,5}){4,5}$/);
    const b = await deriveIdentity(recoveryKeyToSeed(key.toLowerCase().replace(/0/g, "O")));
    expect(b.vaultId).toBe(a.vaultId);
    expect(b.publicKeyB64u).toBe(a.publicKeyB64u);
    expect(a.vaultId).toHaveLength(26);
    expect(await vaultIdFromPublicKey(a.publicKeyB64u)).toBe(a.vaultId);
    const c = await deriveIdentity(newSeed());
    expect(c.vaultId).not.toBe(a.vaultId);
  });
  it("signs and verifies; a tampered body or stale timestamp fails", async () => {
    const id = await deriveIdentity(newSeed());
    const msg = new TextEncoder().encode("hello");
    expect(await verifySignature(id.publicKeyB64u, msg, await id.sign(msg))).toBe(true);
    const req = await signRequest(id, "{}", 1000);
    expect(await verifyRequest(id.publicKeyB64u, "{}", req.ts, req.sig, 1000 + 60_000)).toBe(true);
    expect(await verifyRequest(id.publicKeyB64u, "{x}", req.ts, req.sig, 1000 + 60_000)).toBe(false);
    expect(await verifyRequest(id.publicKeyB64u, "{}", req.ts, req.sig, 1000 + 10 * 60_000)).toBe(false);
  });
  it("envelope: DEK wrapped by KEK; another vault cannot open it (D13)", async () => {
    const a = await deriveIdentity(newSeed());
    const b = await deriveIdentity(newSeed());
    const env = await seal("sensível", await newDek(), a.kek);
    expect(await open(env, a.kek)).toBe("sensível");
    await expect(open(env, b.kek)).rejects.toBeTruthy();
  });
});

describe("sync queue (append-only, idempotent, never gating)", () => {
  it("pushes ciphertext only, marks serverReceivedAt, ignores duplicates, survives server failures", async () => {
    let now = 1_800_000_000_000;
    const clock = () => now;
    const id = await deriveIdentity(newSeed());
    const server = new MemoryVaultServer(clock);
    server.register(id.vaultId, id.publicKeyB64u);
    const store = memoryVaultStore();
    const q = new SyncQueue(store, id, server, { clock, batchSize: 5 });
    const { journal } = runWithJournal([{ k: "tap", pick: 0, dt: 2 }, { k: "tap", pick: 0, dt: 2 }, { k: "tap", pick: 1, dt: 2 }], "S1");
    await q.enqueue(journal.events);
    expect((await store.pending()).length).toBe(journal.events.length);

    server.failNext = 1;
    expect(await q.flush()).toBe(0); // failure is silent (INV-019)
    expect((await store.pending()).length).toBe(journal.events.length);

    now += 1000;
    const n = await q.flush();
    expect(n).toBe(journal.events.length);
    expect((await store.pending()).length).toBe(0);
    for (const e of await store.readAll()) expect(e.serverReceivedAt).toBe(now);

    // Wire never carries plaintext payloads.
    for (const w of server.events.values()) expect(JSON.stringify(w)).not.toMatch(/"signal"|"cardId"|"value"/);
    // The vault owner can read them back; the server cannot.
    const w = [...server.events.values()][1]!;
    const back = await fromWire(w, id.kek, w.serverReceivedAt);
    expect(back.payload).toEqual(journal.events[1]!.payload);

    // Re-enqueue everything: nothing new locally, nothing new on the server (INV-024).
    await q.enqueue(journal.events);
    expect(await q.flush()).toBe(0);
    expect(server.events.size).toBe(journal.events.length);
  });
  it("rejects a foreign signature and logs it in the security table, not in events", async () => {
    const clock = () => 1_800_000_000_000;
    const a = await deriveIdentity(newSeed()); const b = await deriveIdentity(newSeed());
    const server = new MemoryVaultServer(clock);
    server.register(a.vaultId, b.publicKeyB64u); // wrong key registered
    const store = memoryVaultStore();
    const q = new SyncQueue(store, a, server, { clock });
    await q.enqueue(runWithJournal([], "S2").journal.events);
    expect(await q.flush()).toBe(0);
    expect(server.security.some((s) => s.kind === "bad_signature")).toBe(true);
    expect(server.events.size).toBe(0);
  });
});
