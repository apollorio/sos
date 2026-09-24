/** SHARE CAPSULES — INV-026: scoped, expiring, revocable, view-limited; key only in the fragment. */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { newCapsule, capsuleAccess, recordView, revokeCapsule, capsuleLink, parseCapsuleLink } from "../../src/core/handoff/capsule";
import { sealCapsule, openCapsule, newCapsuleId } from "../../src/runtime/handoff/capsule-crypto";

const NOW = 1_800_000_000_000;

describe("share capsule policy", () => {
  it("defaults: audience scopes, 6 h, 3 views", () => {
    const c = newCapsule({ id: "abc", now: NOW, audience: "trusted_person" }, REG);
    expect(c.scopes).toEqual(["CURRENT_EPISODE"]);
    expect(c.expiresAt - c.createdAt).toBe(6 * 3_600_000);
    expect(c.maxViews).toBe(3);
    expect(capsuleAccess(c, NOW)).toBe("ok");
  });
  it("caps ttl and views at the registry maximum and only allows listed expiries", () => {
    expect(() => newCapsule({ id: "x", now: NOW, audience: "trusted_person", ttlHours: 3 }, REG)).toThrow();
    const c = newCapsule({ id: "x", now: NOW, audience: "health_professional", ttlHours: 48, maxViews: 99 }, REG);
    expect(c.expiresAt - c.createdAt).toBe(24 * 3_600_000);
    expect(c.maxViews).toBe(3);
  });
  it("expires, exhausts and revokes", () => {
    let c = newCapsule({ id: "x", now: NOW, audience: "trusted_person", ttlHours: 1 }, REG);
    expect(capsuleAccess(c, NOW + 3_600_000)).toBe("expired");
    for (let i = 0; i < 3; i++) c = recordView(c, NOW).capsule;
    expect(capsuleAccess(c, NOW)).toBe("exhausted");
    const r = revokeCapsule(newCapsule({ id: "y", now: NOW, audience: "trusted_person" }, REG), NOW + 1);
    expect(capsuleAccess(r, NOW + 2)).toBe("revoked");
  });
  it("drops scopes the audience may not receive", () => {
    const c = newCapsule({ id: "x", now: NOW, audience: "trusted_person", scopes: ["CURRENT_EPISODE", "EXPOSURE_CONTEXT", "LOCATION_CURRENT"] }, REG);
    expect(c.scopes).toEqual(["CURRENT_EPISODE", "LOCATION_CURRENT"]);
  });
  it("seals and opens with the key from the fragment only", async () => {
    const id = newCapsuleId();
    const { sealed, keyB64u } = await sealCapsule("resumo · 18:42 · sozinha");
    expect(JSON.stringify(sealed)).not.toContain(keyB64u);
    const link = capsuleLink("https://sos.apollo.rio.br", id, keyB64u);
    expect(new URL(link).hash).toBe(`#k=${keyB64u}`);
    const parsed = parseCapsuleLink(link)!;
    expect(parsed.id).toBe(id);
    expect(await openCapsule(sealed, parsed.key)).toBe("resumo · 18:42 · sozinha");
    await expect(openCapsule(sealed, keyB64u.slice(0, -2) + "AA")).rejects.toBeTruthy();
  });
});
