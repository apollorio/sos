# 011 · Pista: what was used, care in a loop, anxiety once, pace, and the breathing orb

**Date:** 2026-09-29 · **Branch:** `claude/connect-i913l0` · **Trigger:** owner request after audit 010 (two messages).

## The request (owner, paraphrased)

1. Work like Akinator: find out what the person used (alcohol, which drug exactly), map the combinations (including
   sex enhancers such as sildenafil and poppers) and, from what is known, keep giving practical tips: cold water, a
   shower, brushing teeth, **soro fisiológico** for a burning throat or nose.
2. An endless loop. Ask anxiety **once**; after that, read the person from the options they pick and the time they take.
3. Talk like the live flows (`app/data.json`): a person talking to a person, to build trust.
4. Read every study (`_knowledge/studies/001`, `002` + flows, `003`) and keep their structure and voice.
5. (Second message.) The breathing ball already lives behind the live page with its message. A breathing *card* in the
   flow makes no sense: it takes the place of a flow that works. Breathing should be the ball, centered, behind the flows.

## Sources read for this phase

`studies/001/workflows 001.md`, `workflows  002.md`; `studies/002/002-estrategia-harm-control.md`, `002-patch-de-nos.md`,
`flows/*.mmd` (overview, torto, panico, realidade, trava, falar, samu, cssrs); `studies/003/bateu_brainstorm.txt`,
`panico.txt`; the live `app/data.json` (the `torto` flow, node by node) for the voice.

What the engine took from them:

| Study says | Engine now |
|---|---|
| Triage the **body**, not the drug (bateu: acelerado / desconectado / visual-loop) | `Q_SUBSTANCE` is now «Como bateu no corpo?»: «Acelerado, calor, coração batendo» / «Pesado, lento, com sono» / «Estranho, visual, em loop» |
| Class-specific care: MD heat and "goles, não litros"; pó = stop redosing; G/ket/álcool = de lado, não deixa só, "nada de banho pra acordar"; psicodélico = uma mudança, não luta com a onda; lança = ar + 192 | `care` strategies `cool_body`, `put_away`, `side_safe`, `ride_wave`, `inhalant_air`, `sip_water` with copy per substance (`drug` variant key) |
| 002 S3: cut the "250 mL per dose" number (MDMA + water without salt → hyponatremia) | INV-030 lint: no dose or volume in any copy (the live `harm_alcohol` text would fail it) |
| 002 rule 6: never a second substance to "come down" | INV-030 lint + L26 |
| 002 `no_mix`, `recovery`, S6 (G + álcool) | `combination.downers` warning (side position, not alone, nothing more) → P1 |
| 002 voice: ≤ 25 words at the peak, "Estou aqui. Isso sobe e desce. O próximo minuto basta." | Rotating presence lines: «Tô aqui com você. Sem pressa.», «Isso tem pico.. e depois baixa. Tô aqui.», «Só o próximo minuto. Só a próxima respiração.» (closes audit 010 F5) |
| Live `torto.m13`: music without lyrics; live `m9`: food | `care.soft_music`, `care.eat_something` |

## What changed

### 1. The Akinator for what was used (L26)

The value-of-information engine already asks only questions whose answer would change the next help. That is the
Akinator. New: questions carry a **condition** (`when`) and follow a natural order through a new derived fact
`question.<id>.asked`:

```
first help ─► «Como bateu no corpo?» ─► «Foi o quê, mais ou menos?» (pó · bala/MD | só álcool · G · calmante/remédio/opioide | ácido/cogumelo · ket · erva · lança/loló)
            ─► «Rolou álcool junto?» ─► «Tomou algo pra transar?» (azulzinho · poppers · os dois) ─► «O que mais incomoda no corpo?»
```

One question between two helps (L21), never before the first help, never while its condition is false (INV-031).
New signals `substance`, `alcohol`, `sexEnhancer` are explicit-only (text can never set them, lint), expire in 4 h and
reach a Crisis Passport only with the `EXPOSURE_CONTEXT` scope. `discomfort` (nose, throat, heat, nausea, jaw) is what
the person says bothers them, by question or by the new **«Cuidar do corpo»** menu.

### 2. Combinations (risk dimension `mixing`, skill `combination`)

| Mixing | Level | Band | Warning card |
|---|---|---|---|
| Alcohol + G, a sedative pill/opioid, or ket | 3 | P1 (BR-P1-07) | `CARD_CARE_MIX_DOWNERS`: nothing more today, not alone, side position, 192 if not waking or slow breathing |
| Poppers + erection pill | 3 | P1 | `CARD_CARE_MIX_POPPERS_PILL`: dangerous drop in blood pressure, no more poppers, sit/lie, 192 |
| Alcohol + a stimulant (pó, MD, unknown) | 2 | P2 (BR-P2-03) | coke → cocaethylene (`…COKE_ALCOHOL`); MD → heat/dehydration (`…MD_ALCOHOL`); unknown → `…STIM_ALCOHOL` |
| Stimulant + erection pill or poppers | 2 | P2 | `CARD_CARE_MIX_STIM_SEX`: heart strain; priapism > 4 h → emergency |

A combination is **never P0 by itself** (no hard rule reads what was used; proven by Tier D). Red flags still are.
Warnings live in their own skill so they come the moment the combination is known and never wait behind the
alternation (found while testing: in its first version the G + alcohol warning waited one card). Every warning has
«Tirar dúvida: 0800 722 6001» (Disque-Intoxicação).

### 3. Care in an endless loop

New skill `care` (22 cards with helper-addressed copy): cool the body, soro fisiológico in the nose, gargle, nausea,
jaw, side position, put the rest away, ride the wave, lança/loló, poppers, azulzinho, water in sips, fresh air,
something to eat, brushing teeth, a cool shower, music without lyrics.

- **Alternation.** Derived fact `help.last`: after a technique comes a care tip, after a care tip a technique (P1-035,
  P1-045, P2-035, P3-050, P3-060). Helpers also get «Fica perto da pessoa» every ~10 min (P1-032).
- **Rotation.** `grounding` and `care` show the least-shown option first, so every technique gets its turn before one
  repeats (combination and "what you just told me" tips keep their place: `keepFirst`).
- **Safety as data.** Nothing by mouth (water, food, gargle, toothbrush) unless the person responds **and** breathes
  normally (`can_swallow`); a shower only when `awake` (responsive, normal breathing, nothing sedating said, no mixing ≥ 2).
- **Anxiety once.** `Q_ANXIETY maxAsks 1`; the answer now lasts an hour (it is not asked again). P3 keeps techniques too.
- **Never stalls.** 90-minute sessions for four personas: never three bare fallbacks in a row, ≥ 8 different helps.

### 4. Pace (L25)

Derived fact `pace` from the visible time the person takes to **answer a question** (accepted answers only; exercises
don't count): `slow` when the last 2 answers each took ≥ 20 s, within 10 min. Slow means **no question between two
helps** (unless the only help left is the bare fallback) and simpler techniques first (`deferWhen`). It never becomes
anxiety, never moves a band (Tier D proves it), never diagnoses (L15, L16).

### 5. The breathing orb (L27)

Paced breathing is no longer a card. `grounding.breath_pacer` and `CHIP_TOOL_BREATH` are **retired**
(`conventions.retiredIds`, never reused). The engine outputs `breath` (in 4 · hold 1 · out 6, from studies/002
`breath_46`) and the UI draws one centered orb behind every non-P0 card, with «Inspira.. / Segura.. / Solta devagar..».
It keeps its rhythm across card changes, ignores the pointer, and disappears in P0 and whenever breathing or
responsiveness is not known to be normal (INV-032, lint + Tier D + tests). Reduced motion: a still orb with the words.

## Findings

| # | Finding | Status |
|---|---|---|
| F1 | "Soro fisiológico neutraliza o ácido das drogas": saline (NaCl 0.9 %) is isotonic, **not** alkaline; it rinses and soothes, it does not neutralize anything. The copy says «lava o que ficou e alivia». INV-030 now fails any "neutraliza"/"antídoto" claim. | Fixed in copy; for clinical review |
| F2 | A question whose answers set two signals («Só álcool» → substance + alcohol) stayed askable after its subject was known: «Foi o quê?» came back forever. The subject of a question is now what its «Não sei» answer resets. | Fixed (`voi.ts`) |
| F3 | Rejected or stale taps on a question counted as slow answers, turning off questions for no reason. | Fixed (`process-event.ts`) |
| F4 | A helper whose friend breathes abnormally was offered water in sips. | Fixed (`can_swallow`, Tier D) |
| F5 | The combination warning waited one card behind the alternation. | Fixed (own skill `combination`) |
| F6 | With anxiety asked once, its 15-min TTL silently dropped the band to P3 and thinned the loop to «Tô aqui com você». | Fixed (1 h TTL; grounding also in P3) |
| F7 | A slow responder whose "responsive" answer aged out got four bare fallbacks in a row. | Fixed (slow budget yields when only the fallback is left) |
| F8 | `P1` allowed only 3 answers, too few for «Como bateu no corpo?». `engagement.P1.maxAnswers` is now 4 (the live page uses 4–5). | Changed; for clinical review |
| F9 | Cold water with stimulant intoxication (audit 010 F3) is still gated only by breathing + responsiveness. | Open, clinical |
| F10 | Naloxone (002 `naloxone_if`) is not in the engine: Brazil has no take-home naloxone norm; P0 copy covers the call. | Open, clinical/product |

## How to see it

- `npx tsx scripts/converse.ts all 30` prints four whole sessions in pt-BR, card by card, with the "why".
- `dist/simulator.html` and `/app/lab/simulador.html`: tap through; the orb breathes behind the card.
- Lab missions (`/app/lab/roteiros.html`): «Bala, álcool e azulzinho», «Amigo(a) com G e álcool», «Poppers com
  azulzinho», «Dizendo o que incomoda pelo menu», «Respondendo devagar».

## Verification

See the table appended at the end of this file after the final run.

| Check | Result |
|---|---|
| `npm run registry:check` · `npm run typecheck` | 0 errors (50 warnings: draft clinical copy, proposed rules) · clean |
| `npm test` | 202/202 in 20 files (new: `tests/invariants/pista.test.ts`, 8 tests over four 90-minute sessions + every golden scenario; 5 new golden scenarios) |
| `npm run test:exhaustive` | Tier A 3,151,872 states · Tier B 387,072 · **Tier D 891,648 (new: what was used × combinations × the care loop × pace × everything refused)** · Tier C 2,304 · coverage **83/83** (72 from single states + 11 through pinned scenarios). Dead rule found and retired: P3-012 (mixing ≥ 2 already forces P2) |
| `npm run build:check` | shell, simulator and lab up to date (bundle 161 KB) |
| `npm run e2e` | 37/37 in Chromium (new: the orb breathes behind the first help, survives a card change, is absent in P0; no breathing card) · review sheet 101 items (95 required) · 19 missions |
| `npm run e2e:legacy` | 9/9 |

Screenshots (390 × 844, dark): `shots/orb-1-cold-water.png`, `shots/orb-2-como-bateu.png`, `shots/orb-3-aviso-mistura.png`.
