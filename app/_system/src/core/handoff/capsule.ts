/**
 * SHARE CAPSULE policy (Blueprint v0.2 §9, ADR-0009, INV-026). PURE: ids, times and keys come from the runtime.
 * Scoped · expiring · revocable · view-limited. The decryption key never appears here (it lives in the URL fragment).
 */
import type { AccessScope, ShareAudience } from "../../generated/registry.gen";
import type { Reg } from "../registry";
import { allowedScopes, defaultScopes } from "./summary";

export interface ShareCapsule {
  id: string;
  audience: ShareAudience;
  scopes: AccessScope[];
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  maxViews: number;
  views: number;
}

export type CapsuleAccess = "ok" | "expired" | "revoked" | "exhausted";

export interface NewCapsuleOptions {
  id: string;
  now: number;
  audience: ShareAudience;
  scopes?: AccessScope[];
  ttlHours?: number;
  maxViews?: number;
}

export function newCapsule(o: NewCapsuleOptions, reg: Reg): ShareCapsule {
  const c = reg.data.continuity;
  const allowed = allowedScopes(o.audience, reg);
  const scopes = (o.scopes ?? defaultScopes(o.audience, reg)).filter((s) => allowed.includes(s));
  if (!scopes.length) throw new Error("capsule: no valid scope");
  const ttl = Math.min(o.ttlHours ?? c.retention.shareCapsuleDefaultHours, c.retention.shareCapsuleMaxHours);
  if (!c.share.expiryHours.includes(ttl)) throw new Error(`capsule: ttl ${ttl}h not in ${c.share.expiryHours.join("/")}`);
  return {
    id: o.id,
    audience: o.audience,
    scopes,
    createdAt: o.now,
    expiresAt: o.now + ttl * 3_600_000,
    revokedAt: null,
    maxViews: Math.min(o.maxViews ?? c.retention.shareCapsuleMaxViews, c.retention.shareCapsuleMaxViews),
    views: 0,
  };
}

export function capsuleAccess(c: ShareCapsule, now: number): CapsuleAccess {
  if (c.revokedAt !== null) return "revoked";
  if (now >= c.expiresAt) return "expired";
  if (c.views >= c.maxViews) return "exhausted";
  return "ok";
}

export function recordView(c: ShareCapsule, now: number): { capsule: ShareCapsule; access: CapsuleAccess } {
  const access = capsuleAccess(c, now);
  return { capsule: access === "ok" ? { ...c, views: c.views + 1 } : c, access };
}

export function revokeCapsule(c: ShareCapsule, now: number): ShareCapsule {
  return c.revokedAt === null ? { ...c, revokedAt: now } : c;
}

/** The capability link. The fragment (#k=…) is never sent to the server by any browser. */
export function capsuleLink(origin: string, id: string, keyB64u: string): string {
  return `${origin}/s/${id}#k=${keyB64u}`;
}

export function parseCapsuleLink(url: string): { id: string; key: string } | null {
  const m = /\/s\/([A-Za-z0-9_-]{8,})#k=([A-Za-z0-9_-]{16,})$/.exec(url);
  return m ? { id: m[1]!, key: m[2]! } : null;
}
