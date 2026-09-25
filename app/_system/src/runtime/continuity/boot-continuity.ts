/**
 * CONTINUITY BOOT — wires the continuity plane around an EngineLoop. Everything is optional and lazy:
 * the acute plane never awaits it (INV-019). Sync stays disabled until a VaultClient exists (server phase)
 * AND the person has accepted continuity outside a crisis (consent, L20, D11).
 */
import { REG } from "../../core/registry";
import type { EngineLoop } from "../engine-loop";
import type { JournalEvent } from "../../core/journal/journal";
import { deriveSnapshot } from "../../core/continuity/snapshot";
import { strategyPriors } from "../../core/continuity/priors";
import { purgeExpired } from "../../core/continuity/retention";
import type { StrategyPriors, ContinuitySnapshot } from "../../core/continuity/types";
import { openVaultStore, type VaultStore, type ConsentPrefs } from "./journal-store";
import { SyncQueue, type VaultClient } from "./sync";
import type { VaultIdentity } from "../trust/vault-identity";
import { opsLog } from "../observability";

export interface Continuity {
  store: VaultStore;
  snapshot: ContinuitySnapshot | null;
  priors: StrategyPriors;
  consent: ConsentPrefs;
  setConsent(c: ConsentPrefs): Promise<void>;
  events(): Promise<JournalEvent[]>;
}

export async function attachContinuity(
  loop: Pick<EngineLoop, "hooks">,
  clock: () => number,
  identity: VaultIdentity | null = null,
  client: VaultClient | null = null,
  vault?: VaultStore,
): Promise<Continuity> {
  const store = vault ?? (await openVaultStore());
  const consent = await store.consent();
  let snapshot: ContinuitySnapshot | null = null;
  let priors: StrategyPriors = {};
  const queue = new SyncQueue(store, identity, client, { clock });

  // Retention is enforced on storage, not only in memory: expired episodes are deleted (Phase 2, 180 d).
  const refresh = async () => {
    const stored = await store.readAll();
    const all = purgeExpired(stored, clock(), REG);
    if (all.length < stored.length) await store.replaceAll(all);
    snapshot = deriveSnapshot(all, clock(), REG);
    priors = consent.continuity ? strategyPriors(snapshot, REG) : {};
  };
  await refresh().catch(() => undefined);

  loop.hooks = {
    priors: () => (consent.continuity ? priors : undefined),
    onWipe: async (episodeId) => { await store.removeEpisode(episodeId); await refresh().catch(() => undefined); },
    onJournal: async (evs) => {
      if (!consent.continuity) return; // no consent ⇒ nothing persists beyond the acute plane (L20)
      await queue.enqueue(evs);
      const n = await queue.flush();
      if (n) opsLog("info", "sync", { flushed: n });
      if (evs.some((e) => e.kind === "EPISODE_ENDED" || e.kind === "STRATEGY_OUTCOME")) await refresh().catch(() => undefined);
    },
  };

  return {
    store,
    get snapshot() { return snapshot; },
    get priors() { return priors; },
    consent,
    async setConsent(c) { Object.assign(consent, c); await store.setConsent(c); if (!c.continuity) { priors = {}; } else await refresh(); },
    events: () => store.readAll(),
  };
}
