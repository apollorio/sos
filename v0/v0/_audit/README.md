# _audit: SOS Apollo audit trail

This folder is the permanent record of each audit phase. Every phase gets its own folder and adds an entry to the log below. Content and design decisions should cite the phase document they came from.

| Phase | Folder | Status | Date | Summary |
|---|---|---|---|---|
| 000 | `000-mapeamento/` | ✅ done | 2026-09-22 | Mapped the project, flows, design and content. Includes the full Mermaid flowcharts, 9 critical findings (C1–C9), a proposed skeleton, the roadmap and the connectors map. No code changed. |
| 000.5 | n/a | ⏳ decisions pending | n/a | Decisions and hot adjustments to make before 001 (see `000-mapa-do-projeto.md` §7) |
| 001 | `001-design/` | 🔜 | n/a | Design audit: principles, grid, components, animations |
| 002 | `002-conteudo/` | 🔜 | n/a | Flows and content vs. frequency (motivational / techniques / therapy / regulation) |
| 003 | `003-melhorias/` | 🔜 | n/a | Improvements built on 001 + 002 |
| 004–008 | n/a | off-computer | n/a | Hospitals, government, partnerships |

## Rules for this trail
- Only add to the trail. If a finding turns out to be wrong, strike it through and add a note; don't delete it.
- Regenerate the charts and integrity report after **every** content change:
  - `node _audit/000-mapeamento/tools/mermaid.js _audit/000-mapeamento/mermaid`
  - `node _audit/000-mapeamento/tools/analyze.js > _audit/000-mapeamento/graph-integrity.txt`
- Record every clinical sign-off (who, date, which flow and node) in `docs/clinical-review-log.md` once that file exists.
