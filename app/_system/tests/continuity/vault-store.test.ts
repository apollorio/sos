/** Vault hygiene — INV-024 quarantine, Phase-2 retention enforced on storage, "Apagar agora" erases the episode. */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { memoryVaultStore, partitionRecords } from "../../src/runtime/continuity/journal-store";
import { attachContinuity } from "../../src/runtime/continuity/boot-continuity";
import { deriveSnapshot } from "../../src/core/continuity/snapshot";
import type { ContinuityHooks } from "../../src/runtime/engine-loop";
import type { JournalEvent } from "../../src/core/journal/journal";
import { synthHistory } from "./helpers";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000 + 400 * DAY;

describe("vault store", () => {
  it("quarantines malformed records instead of feeding them to the snapshot", async () => {
    const good = synthHistory("grounding", "feet_floor", 1, "better", NOW - DAY);
    const bad = [{ garbage: true }, { ...good[0]!, payload: undefined }, { ...good[1]!, kind: "NOT_A_KIND" }, null];
    const { ok, quarantined } = partitionRecords([...good, ...bad]);
    expect(ok).toHaveLength(good.length);
    expect(quarantined).toHaveLength(bad.length);
    const v = memoryVaultStore();
    await v.replaceAll([...good, ...(bad as unknown as JournalEvent[])]);
    expect(await v.readAll()).toHaveLength(good.length);
    expect(await v.quarantined()).toBe(bad.length);
    // Even a caller that bypasses the store cannot crash the snapshot with a payload-less event (red-team probe D).
    expect(() => deriveSnapshot([...good, { ...good[0]!, payload: undefined } as unknown as JournalEvent], NOW, REG)).not.toThrow();
  });

  it("removeEpisode erases one episode and its pending sync ids only", async () => {
    const v = memoryVaultStore();
    await v.append([...synthHistory("grounding", "feet_floor", 2, "better", NOW - DAY, "A"), ...synthHistory("grounding", "feet_floor", 1, "better", NOW - DAY, "B")]);
    expect(await v.removeEpisode("A0")).toBeGreaterThan(0);
    const left = await v.readAll();
    expect(new Set(left.map((e) => e.episodeId))).toEqual(new Set(["A1", "B0"]));
    expect((await v.pending()).every((id) => !id.startsWith("A0:"))).toBe(true);
  });

  it("attachContinuity deletes expired episodes from storage (not only from the in-memory view) and erases on wipe", async () => {
    const v = memoryVaultStore();
    await v.append([...synthHistory("grounding", "feet_floor", 1, "better", NOW - 200 * DAY, "OLD"), ...synthHistory("grounding", "feet_floor", 2, "better", NOW - 3 * DAY, "NEW")]);
    const loop: { hooks: ContinuityHooks } = { hooks: {} };
    const c = await attachContinuity(loop, () => NOW, null, null, v);
    expect(new Set((await v.readAll()).map((e) => e.episodeId))).toEqual(new Set(["NEW0", "NEW1"]));
    expect(c.snapshot?.episodeCount).toBe(2);
    await loop.hooks.onWipe!("NEW0");
    expect(new Set((await v.readAll()).map((e) => e.episodeId))).toEqual(new Set(["NEW1"]));
    expect(c.snapshot?.episodeCount).toBe(1);
  });
});
