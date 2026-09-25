# Beta lab — small-group testing and clinical approval

**Status:** built 2026-09-25 (audit 009). The app is the v0.2 engine with **draft** clinical copy. The lab exists so that
(1) a small invited group can test it the way a person would use it, and (2) health professionals can review and sign
every rule and text the engine uses. Nothing in the lab sends data anywhere.

## What is where (the repository root is the site)

| URL | File | What it is |
|---|---|---|
| `/` | `index.html` | Gateway (entrance). "Preciso de ajuda" → `./app/`, "somar" → `./somar/`. Relative links: works on any host. |
| `/app/` | `app/index.html` | **SOS app** (entrance door): static 192 shell + engine PWA. Beta notice while the release gate is red. |
| `/app/lab/` | `app/lab/index.html` | Lab hub: safety notice, release-gate status, links for testers and clinicians, "Apagar os dados do app". |
| `/app/lab/roteiros.html` | generated | Tester missions: golden scenarios replayed through the real engine, in plain pt-BR, with feedback. |
| `/app/lab/revisao.html` | generated | Clinical review sheet: every hard rule, P0 text, question, strategy (with contraindications), risk rule, band rule and text trigger. |
| `/app/lab/simulador.html` | copy of `dist/simulator.html` | The engineering simulator (same engine, "why" panel, virtual clock, no dialer). |
| `/app/legacy.html` | moved from `app/index.html` | The previous production page, for comparison. Guarded by `npm run e2e:legacy`. |

Everything under `app/lab/` and the stamped parts of `app/` are build output: `npm run build`, never by hand.
`npm run build:check` and `npm test` fail when any of it is stale.

## How the lab stays honest

- **Missions are not hand-written about the engine.** `scripts/lab/model.ts` replays each selected golden scenario
  (`tests/scenarios/scenarios.ts`) and prints the real button labels and the real resulting card. Only the mission title,
  the story and "what to observe" are editorial. If the engine changes, the missions change with it, and `npm test`
  proves every scenario still passes.
- **The review sheet lists what the engine contains**, read from `registry/registry.json` and `registry/locales/pt-BR.json`:
  conditions are rendered in Portuguese with the answer labels that set them, and text-trigger regexes are expanded into
  example phrases. Every item carries a content hash; a verdict given on an older text is flagged as "changed".
- **Its required scope is wider than the release lint.** The lint requires sign-off on the 16 cards flagged `clinical`,
  the proposed hard rules and `meta.status`. The sheet also asks for every triage question and every strategy card,
  including the grounding exercises whose contraindications were audit 003's first blocker (59 required items, 6 optional).
  Whether those cards should also be flagged `clinical` in `pt-BR.json` (making the lint match) is an owner decision.
- **The beta notice is automatic.** `scripts/build.ts` stamps `<html data-channel="beta">` whenever
  `registry:lint --release` has errors; the notice disappears only when the gate is green.

## Sharing it with the group

1. Deploy the **repository root** of this branch to a preview URL (any static host; `/_headers` is in Netlify/Cloudflare
   Pages format and scopes cache and CSP by path). The app's own CSP is also in a `<meta>` tag, so it holds on hosts
   that ignore `_headers`.
2. Send the invited people the lab link: `<preview>/app/lab/`. Testers start with "Roteiros de teste"; clinicians with
   "Revisão clínica".
3. **Do not merge this to the branch that serves sos.apollo.rio.br before clinical sign-off** (CLAUDE.md rule 8). Merging
   makes `/app/` the beta engine for everyone who opens the gateway; the beta notice would say so, but the rule is the rule.

Testers are warned on every page and every relevant step: tapping "Ligar 192"/"Ligar 188" opens the real dialer and
"Abrir WhatsApp" opens a real message. They must cancel. The simulator never opens the dialer.

## Getting feedback back

Nothing is collected automatically. Answers live in the viewer's own browser (`localStorage`) until they tap
**Baixar retorno** and send the file through the channel they were invited on. A review survives a new build: items whose
text changed since the verdict are marked "O texto deste item mudou" and must be reviewed again.

| File | From | Next step |
|---|---|---|
| `revisao-clinica-sos-<registryHash>.json` | a clinician | `npm run review:summary -- <file>` prints a Markdown summary: counts, items with changes, required items without a verdict, stale items, and — only when every required item is approved on the current registry — the row to add to `docs/CLINICAL-REVIEW.md` → Record of approvals. |
| `retorno-beta-sos-<registryHash>.json` | a tester | Read it; turn findings into registry changes + golden scenarios (behavior is data), then rebuild. |

`review:summary` is read-only. Approving copy stays a deliberate human step: record the signature in
`docs/CLINICAL-REVIEW.md`, set the reviewed entries in `pt-BR.json` to `"review": "clinical"`, set `meta.status` to
`"approved"`, run `npm run verify`. When `registry:lint --release` is green the next build stamps `data-channel="release"`.

## Privacy

- No login, no analytics, no third-party request from any lab page (tested); the lab's simulator copy drops the web
  fonts the engineering simulator uses.
- Feedback fields ask for no personal data and say so; the tester nickname is optional.
- "Apagar os dados do app neste navegador" deletes the app's IndexedDB databases (`sos-apollo`, `sos-apollo-vault`)
  so each mission can start from zero. It is a lab-only button; the app itself keeps "Apagar agora".

## Verification

```bash
npm run build          # app/ shell + dist/simulator.html + app/lab/
npm run build:check    # all three are up to date
npm test               # includes tests/lab (coverage of the sheet, missions = passing scenarios, freshness)
npm run e2e            # shell (18 checks) + lab (13 checks) in Chromium, served from the repository root
npm run e2e:legacy     # the previous production page at /app/legacy.html
```
