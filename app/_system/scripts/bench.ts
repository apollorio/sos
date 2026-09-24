import { startSession, processEvent } from "../src/core/process-event";
import { decide, decideCore } from "../src/core/planner/decide";
import { REG } from "../src/core/registry";
let r = startSession("b", 1e12);
r = processEvent(r.state, { kind: "tap", id: "1", at: 1e12 + 1000, cardInstanceId: r.state.card!.instanceId, actionId: "self" });
r = processEvent(r.state, { kind: "tap", id: "2", at: 1e12 + 2000, cardInstanceId: r.state.card!.instanceId, actionId: "none" });
const s = r.state; const now = 1e12 + 3000;
let t = performance.now(); for (let i = 0; i < 2000; i++) decide(s, now, REG); console.log("decide µs", ((performance.now() - t) / 2000 * 1000).toFixed(1));
t = performance.now(); for (let i = 0; i < 20000; i++) decideCore(s, now, REG); console.log("decideCore µs", ((performance.now() - t) / 20000 * 1000).toFixed(1));
