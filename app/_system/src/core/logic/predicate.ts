/**
 * Predicate DSL — the ONLY way rules express conditions.
 *
 * Why a DSL instead of TS lambdas?
 *  1. Rules live in registry.json → reviewable by clinicians, diffable, versioned.
 *  2. evaluate() returns the exact leaves that made a rule true → the explanation log
 *     ("whySkill") is generated from the same tree that decided. Logic and 'why' cannot drift.
 *  3. The linter can type-check every path/value against the fact catalog before runtime.
 */
import type { Primitive } from "../domain/signals";

export type Path = string;

export type Pred =
  | { all: Pred[] }
  | { any: Pred[] }
  | { not: Pred }
  | { eq: [Path, Primitive] }
  | { neq: [Path, Primitive] }
  | { in: [Path, Primitive[]] }
  | { gte: [Path, number] }
  | { lte: [Path, number] }
  | { known: Path }
  | { unknown: Path }
  | { always: true };

export type Facts = Readonly<Record<string, Primitive | undefined>>;

export interface TraceLeaf {
  path: Path;
  op: string;
  expected: Primitive | Primitive[] | null;
  actual: Primitive | null;
}

export interface EvalResult {
  ok: boolean;
  because: TraceLeaf[];
}

const ALWAYS: EvalResult = { ok: true, because: [{ path: "(always)", op: "always", expected: null, actual: null }] };
const FALSE: EvalResult = { ok: false, because: [] };

const isUnknown = (v: Primitive | undefined) => v === undefined || v === "unknown";

export function evaluate(p: Pred, facts: Facts): EvalResult {
  if ("always" in p) return ALWAYS;
  if ("all" in p) {
    const because: TraceLeaf[] = [];
    for (const c of p.all) {
      const r = evaluate(c, facts);
      if (!r.ok) return FALSE;
      because.push(...r.because);
    }
    return { ok: true, because };
  }
  if ("any" in p) {
    for (const c of p.any) {
      const r = evaluate(c, facts);
      if (r.ok) return r;
    }
    return FALSE;
  }
  if ("not" in p) {
    const r = evaluate(p.not, facts);
    return r.ok ? FALSE : { ok: true, because: [{ path: "(not)", op: "not", expected: null, actual: null }] };
  }
  const leaf = (path: Path, op: string, expected: TraceLeaf["expected"], ok: boolean): EvalResult =>
    ok ? { ok: true, because: [{ path, op, expected, actual: facts[path] ?? null }] } : FALSE;

  if ("eq" in p) return leaf(p.eq[0], "=", p.eq[1], (facts[p.eq[0]] ?? "unknown") === p.eq[1]);
  if ("neq" in p) return leaf(p.neq[0], "≠", p.neq[1], (facts[p.neq[0]] ?? "unknown") !== p.neq[1]);
  if ("in" in p) return leaf(p.in[0], "∈", p.in[1], p.in[1].includes(facts[p.in[0]] ?? "unknown"));
  if ("gte" in p) {
    const v = facts[p.gte[0]];
    return leaf(p.gte[0], "≥", p.gte[1], typeof v === "number" && v >= p.gte[1]);
  }
  if ("lte" in p) {
    const v = facts[p.lte[0]];
    return leaf(p.lte[0], "≤", p.lte[1], typeof v === "number" && v <= p.lte[1]);
  }
  if ("known" in p) return leaf(p.known, "known", null, !isUnknown(facts[p.known]));
  if ("unknown" in p) return leaf(p.unknown, "unknown", null, isUnknown(facts[p.unknown]));
  const never: never = p;
  throw new Error(`predicate: unsupported node ${JSON.stringify(never)}`);
}

/** Every path referenced by a predicate (used by the linter and by exhaustive coverage). */
export function pathsOf(p: Pred): Path[] {
  if ("always" in p) return [];
  if ("all" in p) return p.all.flatMap(pathsOf);
  if ("any" in p) return p.any.flatMap(pathsOf);
  if ("not" in p) return pathsOf(p.not);
  if ("eq" in p) return [p.eq[0]];
  if ("neq" in p) return [p.neq[0]];
  if ("in" in p) return [p.in[0]];
  if ("gte" in p) return [p.gte[0]];
  if ("lte" in p) return [p.lte[0]];
  if ("known" in p) return [p.known];
  return [p.unknown];
}

/** Every (path, literal) pair a predicate compares against (for domain checks in the linter). */
export function literalsOf(p: Pred): [Path, Primitive][] {
  if ("always" in p || "known" in p || "unknown" in p) return [];
  if ("all" in p) return p.all.flatMap(literalsOf);
  if ("any" in p) return p.any.flatMap(literalsOf);
  if ("not" in p) return literalsOf(p.not);
  if ("eq" in p) return [p.eq];
  if ("neq" in p) return [p.neq];
  if ("in" in p) return p.in[1].map((v) => [p.in[0], v] as [Path, Primitive]);
  if ("gte" in p) return [p.gte];
  return [p.lte];
}
