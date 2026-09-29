# _audit: SOS Apollo audit trail

This folder is the permanent record of each audit phase. Every phase gets its own folder and adds an entry to the log below. Content and design decisions should cite the phase document they came from.

| Phase | Folder | Status | Date | Summary |
|---|---|---|---|---|
| 000 | `000-mapeamento/` | ✅ done | 2026-09-22 | Mapped the project, flows, design and content. Includes the full Mermaid flowcharts, 9 critical findings (C1–C9), a proposed skeleton, the roadmap and the connectors map. No code changed. |
| 000.5 | n/a | ⏳ decisions pending | n/a | Decisions and hot adjustments to make before 001 (see `000-mapa-do-projeto.md` §7) |
| 001 | `001-design/` | 🔜 | n/a | Design audit: principles, grid, components, animations |
| 001 | `001-design/` | ✅ design layer done | 2026-09-23 | "Abraço": connected gateway→app transition, calm preloader (C1), static 188/192 (C7), resume by choice (C9), pastel orb, sheet quiets home, focus mode (wake lock). Clinical content untouched. See `001-design/001-design-abraco.md` |
| C3 | n/a | ✅ resolved | 2026-09-23 | Removed the debug `fetch` to `127.0.0.1:7796` from `plogAudio` in `script.js` (now a no-op; the GSAP-ticker call site listed in `000-mapa-do-projeto.md` §C3 was already gone). No other localhost fetches remain. Cache-bust `script.js?v=1.1.2`. Backups in `.superseeded/*pre-C3 2026-09-23*`. |
| 002 | `002-continuidade/` | ✅ plan + foundations | 2026-09-24 | Blueprint v0.2 (two planes: acute core + 180-day pseudonymous continuity vault), laws L13–L20, invariants INV-019–026, journal/snapshot/priors/summaries/capsules + crypto with tests; toolchain files restored to `_system` root. See `002-continuidade/002-plano-continuidade.md` |
| 002-c | `002-conteudo/` | 🔜 | n/a | Flows and content vs. frequency (motivational / techniques / therapy / regulation) |
| 003 | `003-auditoria-adversarial/` | ✅ audit + remediation | 2026-09-24/25 | Hostile audit of engine + production, then remediation: grounding contraindications (INV-027), helper perspective (L10, incl. a helper being offered a 'não tô muito bem' WhatsApp after 16 min), content-hashed build + SRI + stamped SW, render-first engine loop with bounded storage (boot read included), vault purge/erase/quarantine, legacy crisis bar in every flow + 12 h progress expiry, `core.js` evidence. Verdict: production STRUCTURALLY MISALIGNED (release gate), engine PARTIALLY COMPLIANT, no open UNSAFE. See `003-auditoria-adversarial/003-adversarial-audit.md` |
| 003-m | `003-melhorias/` | 🔜 | n/a | Improvements built on 001 + 002 |
| 004–008 | n/a | off-computer | n/a | Hospitals, government, partnerships |
| 010 | `010-acolhimento/` | ✅ built | 2026-09-29 | Owner feedback: the engine felt aggressive ("how are you now?" again and again, no pauses for real help). Measured and fixed: help first (cold water after 4 taps, even alone), at most one question between helps, silence brings "Tô aqui com você. Sem pressa." instead of a question, question intervals, a menu of techniques / people / "how I am" on every non-emergency card, 4 new techniques from the live page. Laws L21–L24, INV-028/029. See `010-acolhimento/010-acolhimento.md` |
| 009 | `009-laboratorio-beta/` | ✅ built | 2026-09-25 | Beta lab for a small test group and clinical approval. Gateway at `/` (relative links), SOS engine as the entrance door at `/app/index.html` (legacy moved to `/app/legacy.html`), beta notice stamped while the release gate is red, CSP in the shell, `/app/lab/` with tester missions replayed from golden scenarios, a clinical review sheet generated from the registry (59 required items, wider than the lint: finding F1), simulator, file-based feedback + `npm run review:summary`. See `009-laboratorio-beta/009-laboratorio-beta.md` and `_system/docs/BETA-LAB.md` |

## Rules for this trail
- Only add to the trail. If a finding turns out to be wrong, strike it through and add a note; don't delete it.
- Regenerate the charts and integrity report after **every** content change:
  - `node _audit/000-mapeamento/tools/mermaid.js _audit/000-mapeamento/mermaid`
  - `node _audit/000-mapeamento/tools/analyze.js > _audit/000-mapeamento/graph-integrity.txt`
- Record every clinical sign-off (who, date, which flow and node) in `docs/clinical-review-log.md` once that file exists.
