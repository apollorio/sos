/**
 * LIVE FEED — lets the Relatório and Modo Médico pages (same origin, same device) follow the episode in real time.
 * Read-only for them: they get the journal (enums, ids, numbers — never free text, L17) and the state snapshot.
 * Two paths, both best-effort and never awaited by the acute loop (INV-019):
 *   1. IndexedDB `sos-apollo/kv` key "journal" — same store, retention and wipe as the state (12 h, "Apagar agora").
 *   2. BroadcastChannel "sos-apollo-live" — a page that is already open updates the moment a card changes;
 *      a page that just opened asks "hello" and gets the current snapshot at once.
 * Nothing leaves the device.
 */
import type { EngineLoop } from "./engine-loop";
import type { Store } from "./storage/session-store";
import type { Journal } from "../core/journal/journal";
import type { SessionState } from "../core/domain/state";

export const LIVE_CHANNEL = "sos-apollo-live";

export type LiveMessage =
  | { v: 1; kind: "hello" }
  | { v: 1; kind: "wiped" }
  | { v: 1; kind: "step"; episodeId: string; journal: Journal; state: SessionState; sentAt: number };

export function attachLiveFeed(loop: EngineLoop, store: Store, clock: () => number): void {
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(LIVE_CHANNEL) : null;

  const snapshot = (): LiveMessage | null => {
    const state = loop.current, journal = loop.episodeJournal;
    if (!state || !journal || journal.episodeId !== state.sessionId || state.status === "wiped") return null;
    return { v: 1, kind: "step", episodeId: state.sessionId, journal, state, sentAt: clock() };
  };
  const send = (m: LiveMessage | null) => { if (m && channel) { try { channel.postMessage(m); } catch { /* a closed page is fine */ } } };
  const post = () => send(snapshot());

  loop.observe((r, journal) => {
    // "Apagar agora": open pages clear at once; nothing of the erased session is written or sent.
    if (r.state.status === "wiped") { send({ v: 1, kind: "wiped" }); return; }
    if (!journal || !store.saveJournal) { post(); return; }
    const j = journal;
    loop.persistAlso(() => store.saveJournal!(j)); // on the loop's own write chain: a later wipe always wins
    post();
  });
  if (channel) channel.onmessage = (e: MessageEvent<LiveMessage>) => { if (e.data && e.data.kind === "hello") post(); };
}
