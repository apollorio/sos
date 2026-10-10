# SOS Apollo · Espaço Seguro — Content Audit
Read-only audit of `nodes_flat.txt` (191 nodes across 7 flows) cross-referenced against `workflows 001.md` (evidence brainstorm) and `workflows 002.md` (C-SSRS/UX architecture spec). All node counts verified programmatically (parser confirms 191 nodes: torto 31, panico 28, realidade 25, trava 27, falar 35, samu 26, cssrs 19).

Home labels (confirmed from flow headers): **Bateu Forte** (torto), **Pânico** (panico), **Onde eu tô?** (realidade), **Paranoia** (trava), **Solidão** (falar), **Resgate** (samu). `cssrs` ("Triagem de segurança") is not a home tile — it's entered only via `falar.cssrs_entry`.

---

## A) Full node table (191 nodes)

Columns: `nodeId | type | category | technique | words | tone_flag`. word_count = narrative text + embedded task/action copy (excludes choice-button labels). tone_flag default is OK; only genuinely notable rows are flagged (see §D/§E for detail on each flagged row).

### FLOW torto — "Bateu Forte" (31 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | initial state check | 16 | OK |
| a2 | choice | TRIAGEM | symptom check | 8 | OK |
| a2_unclear | info | ACOLHIMENTO | validation — not knowing is OK | 34 | OK |
| a3_stim | task | FISIOLOGICO | dive reflex / cold water | 51 | OK |
| a3_psych | info | PSICOEDUCACAO | psychedelics distort perception, not reality | 26 | OK |
| redirect_panico | redirect | REDIRECT | → panico | 22 | OK |
| redirect_trava | redirect | REDIRECT | → trava | 19 | OK |
| m1 | info | ACOLHIMENTO | validation — opening the app is a step | 19 | OK |
| m2 | task | AMBIENTE | body position + phone face-down | 68 | OK |
| m3 | task | FISIOLOGICO | cold water (repeat) | 37 | OK |
| m4 | task | AMBIENTE | lower volume + quiet corner | 44 | OK |
| m5 | choice | TRIAGEM | progress check-in | 10 | OK |
| m6_better | info | MOTIVACIONAL | normalize improvement | 14 | OK |
| m6_same | info | MOTIVACIONAL | normalize plateau | 24 | OK |
| m6_worse | choice | TRIAGEM | escalation branch → SAMU | 14 | GRAMMAR |
| action_samu | action | EMERGENCIA | SAMU 192 / Bombeiros 193 | 6 | OK |
| m7 | info | RESPIRACAO | 4-6 diaphragmatic breathing ×10 | 45 | OK |
| m8 | task | GROUNDING | name 5 things + touch | 50 | OK |
| m9 | task | REDUCAO_DANOS | distance from substance + hydration ("1 copo/dose") | 53 | RISKY_CLAIM |
| m10 | info | MOTIVACIONAL | normalize — intense but not permanent | 22 | OK |
| m11 | choice | CONEXAO_SOCIAL | ask about contacting someone | 9 | OK |
| m11_yes | info | CONEXAO_SOCIAL | script to call/text | 21 | OK |
| m11_no | action | EMERGENCIA | CVV referral | 11 | OK |
| m12 | info | MOTIVACIONAL | normalize — effect fading | 27 | OK |
| m13 | task | AMBIENTE | calming instrumental music | 35 | OK |
| m14 | info | MOTIVACIONAL | closing validation | 23 | OK |
| m15 | info | MOTIVACIONAL | closing + CVV | 26 | OK |
| fast_stim | task | FISIOLOGICO | cold water + reduce stimuli + secure substances (bundle) | 72 | OK |
| harm_alcohol | task | REDUCAO_DANOS | water/dose, eat, don't drive, 10s pause | 109 | RISKY_CLAIM |
| harm_injection | task | REDUCAO_DANOS | sterile syringe, test kit, no mixing depressants, breathing | 126 | VAGUE |
| fast_psych | task | TERAPEUTICA | change sound/light, sugar, acceptance (ACT-like) | 72 | OK |

### FLOW panico — "Pânico" (28 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | initial state check | 12 | OK |
| a2 | choice | TRIAGEM | body symptom check | 9 | OK |
| a2_unclear | info | ACOLHIMENTO | validation | 20 | OK |
| a3_moderate | task | FISIOLOGICO | dive reflex + psychoed intro | 44 | OK |
| a3_severe | task | FISIOLOGICO | dive reflex + reassurance | 39 | OK |
| redirect_torto | redirect | REDIRECT | → torto | 15 | OK |
| m1 | info | PSICOEDUCACAO | "you're not in real danger" false-alarm framing | 32 | RISKY_CLAIM |
| m3 | task | FISIOLOGICO | humming / vagal toning | 38 | OK |
| m4 | task | FISIOLOGICO | cold water on hands | 32 | OK |
| m5 | choice | TRIAGEM | check-in | 9 | OK |
| m6_better | info | MOTIVACIONAL | normalize | 18 | OK |
| m6_same | info | MOTIVACIONAL | normalize | 17 | OK |
| m7 | task | GROUNDING | 5-4-3-2-1 + alternate-nostril breathing | 84 | OK |
| m8 | task | FISIOLOGICO | supported posture | 29 | OK |
| m9 | info | MOTIVACIONAL | normalize — panic has an end | 22 | OK |
| m10 | info | PSICOEDUCACAO | "not weakness, physiology" | 30 | OK |
| m11 | choice | CONEXAO_SOCIAL | ask to call someone | 9 | OK |
| m11_yes | info | CONEXAO_SOCIAL | script | 25 | OK |
| m12 | info | MOTIVACIONAL | normalize — breathing is the tool | 20 | OK |
| m13 | action | EMERGENCIA | CVV referral | 6 | OK |
| m14 | info | MOTIVACIONAL | closing validation | 20 | OK |
| m15 | info | MOTIVACIONAL | closing + CVV | 24 | OK |
| fast_panic | task | RESPIRACAO | cold hold + 4-6 breathing + physiological sigh + humming (bundle) | 139 | OK |
| breath_46 | task | RESPIRACAO | 4-6-10 diaphragmatic breathing | 55 | OK |
| mindfulness_5 | task | TERAPEUTICA | mindful breath observation | 33 | OK |
| m2 | task | RESPIRACAO | physiological sigh ("suspiro duplo") ×3 | 37 | OK |
| draw_distract | task | TERAPEUTICA | drawing/writing distraction | 26 | OK |
| box_breath_high | task | RESPIRACAO | box breathing 4×4 | 26 | OK |

### FLOW realidade — "Onde eu tô?" (25 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | initial state check | 17 | OK |
| a2 | info | PSICOEDUCACAO | names "despersonalização/desrealização" | 26 | CLINICAL |
| a2_substance | redirect | REDIRECT | → torto | 14 | OK |
| a3_anchor | info | ACOLHIMENTO | validation | 22 | OK |
| redirect_panico | redirect | REDIRECT | → panico | 16 | OK |
| m1 | info | ACOLHIMENTO | validation — "you are real" | 18 | OK |
| m2 | task | GROUNDING | touch anchor (fabric, wall) | 65 | OK |
| m3 | task | GROUNDING | name 3 objects | 36 | OK |
| m4 | task | GROUNDING | cold water as anchor | 27 | OK |
| m5 | choice | TRIAGEM | check-in | 8 | OK |
| m6 | info | MOTIVACIONAL | normalize | 12 | OK |
| m6_hard | info | MOTIVACIONAL | normalize (slower path) | 17 | OK |
| m7 | task | GROUNDING | 5 senses | 67 | OK |
| m8 | info | PSICOEDUCACAO | "dissociation is uncomfortable but harmless" | 22 | OK |
| m9 | task | GROUNDING | light movement | 55 | OK |
| m10 | info | MOTIVACIONAL | present-moment validation | 24 | OK |
| m11 | choice | CONEXAO_SOCIAL | ask to call someone | 11 | OK |
| m11_yes | info | CONEXAO_SOCIAL | script | 20 | OK |
| m11_no | action | EMERGENCIA | CVV referral | 9 | OK |
| m12 | info | AMBIENTE | avoid screens/noise/caffeine | 28 | PREACHY |
| m13 | task | AMBIENTE | sensory comfort (blanket) | 32 | OK |
| m14 | info | MOTIVACIONAL | closing validation | 14 | OK |
| m15 | info | MOTIVACIONAL | closing + CVV | 20 | OK |
| fast_realidade | task | GROUNDING | touch + name 3 + cold water (bundle) | 82 | OK |
| mindfulness_real | task | TERAPEUTICA | mindful breath observation | 18 | OK |

### FLOW trava — "Paranoia" (27 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | initial state check | 10 | OK |
| a2 | choice | TRIAGEM | symptom check | 6 | OK |
| a2_confirm | info | PSICOEDUCACAO | freeze response explained | 24 | OK |
| a3_paranoia | info | PSICOEDUCACAO | "no one's watching you" | 25 | OK |
| a3_freeze | info | PSICOEDUCACAO | freeze = survival response | 21 | OK |
| redirect_panico | redirect | REDIRECT | → panico | 19 | OK |
| redirect_realidade | redirect | REDIRECT | → realidade | 16 | OK |
| m1 | info | ACOLHIMENTO | validation — "you're safe here" | 22 | OK |
| m2 | task | FISIOLOGICO | wall-supported posture + hug knees | 54 | OK |
| m3 | task | AMBIENTE | reduce visual stimulus (gaze down, hood) | 54 | OK |
| m4 | info | RESPIRACAO | 4-6 breathing | 43 | OK |
| m5 | choice | TRIAGEM | check-in | 7 | OK |
| m6 | info | MOTIVACIONAL | normalize | 11 | OK |
| m6_high | info | MOTIVACIONAL | normalize | 17 | OK |
| m7 | task | GROUNDING | press/touch arms | 33 | OK |
| m8 | choice | CONEXAO_SOCIAL | ask about contact | 13 | OK |
| m8_yes | action | CONEXAO_SOCIAL | SMS template | 9 | OK |
| m8_no | action | EMERGENCIA | CVV referral | 8 | OK |
| m9 | task | GROUNDING | count 10 objects | 31 | OK |
| m10 | info | PSICOEDUCACAO | paranoia/freeze are temporary | 26 | OK |
| m11 | info | MOTIVACIONAL | validation | 16 | VAGUE (dup) |
| m12 | task | TERAPEUTICA | bilateral movement (feet alternating) | 35 | OK |
| m13 | info | AMBIENTE | suggest changing environment | 27 | OK |
| m14 | info | MOTIVACIONAL | validation — **verbatim duplicate of m11** | 16 | VAGUE |
| m15 | info | MOTIVACIONAL | closing + CVV | 14 | OK |
| fast_trava | task | AMBIENTE | posture + visual block + SMS (bundle) | 76 | OK |
| crt_before_sms | task | TERAPEUTICA | CRT pause before sending message | 22 | OK |

### FLOW falar — "Solidão" (35 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | initial state check | 11 | OK |
| a2 | choice | TRIAGEM | safety check-in | 11 | OK |
| a2_crisis | action | EMERGENCIA | CVV referral | 19 | OK |
| m_crisis_hold | task | GROUNDING | feet-on-floor + cold water | 59 | OK |
| m_crisis_breath | info | RESPIRACAO | 4-6 breathing + CVV mention | 47 | OK |
| a3_safe | action | EMERGENCIA | CVV referral | 22 | OK |
| a3_unsure | redirect | REDIRECT | → samu | 21 | OK |
| redirect_torto | redirect | REDIRECT | → torto | 15 | OK |
| m1 | info | ACOLHIMENTO | validation — "the pain is real" | 22 | OK |
| m2 | info | PSICOEDUCACAO | "the brain lies about permanence" | 27 | OK |
| m3 | task | FISIOLOGICO | warmth/temperature self-soothe | 36 | OK |
| m4 | task | CONEXAO_SOCIAL | choose: watch content or contact a friend | 52 | OK |
| m5 | choice | TRIAGEM | check-in | 9 | OK |
| m6_better | info | MOTIVACIONAL | normalize | 15 | OK |
| m6_same | info | MOTIVACIONAL | normalize | 21 | OK |
| m6_hard | action | EMERGENCIA | CVV + CAPS referral | 32 | OK |
| m7 | info | RESPIRACAO | 4-6 breathing | 43 | OK |
| m8 | task | FISIOLOGICO | hydration / warm drink | 35 | OK |
| m9 | info | ACOLHIMENTO | validation — "you deserve support" | 19 | OK |
| m10 | info | TERAPEUTICA | transition into journaling | 8 | OK |
| m11 | choice | CONEXAO_SOCIAL | ask to contact someone | 9 | OK |
| m11_yes | info | CONEXAO_SOCIAL | script | 33 | OK |
| m11_no | action | EMERGENCIA | CVV + CAPS | 22 | OK |
| m12 | info | MOTIVACIONAL | normalize — loneliness isn't permanent | 26 | OK |
| m13 | task | TERAPEUTICA | behavioral activation — small plan | 39 | OK |
| m14 | info | MOTIVACIONAL | closing validation | 21 | OK |
| m15 | info | MOTIVACIONAL | closing + CVV | 27 | OK |
| fast_ground | task | GROUNDING | grounding + video + **CVV listed as a checklist task** | 90 | VAGUE |
| cssrs_entry | redirect | REDIRECT | → cssrs triage | 14 | OK |
| walk_ground | task | TERAPEUTICA | behavioral activation — walk 15-20 min | 51 | OK |
| journaling_deep | task | TERAPEUTICA | journaling (3-step) | 64 | OK |
| cognitive_reframe | info | TERAPEUTICA | CBT reframe ("what evidence do you have") | 22 | OK |
| crt_pause_node | task | TERAPEUTICA | CRT pause before big decision | 30 | OK |
| wa_from_yes | action | CONEXAO_SOCIAL | WhatsApp template — **href contains literal "PLACEHOLDER"** | 7 | VAGUE |
| sleep_routine | info | FISIOLOGICO | sleep hygiene tips | 23 | OK |

### FLOW samu — "Resgate" (26 nodes, caregiver-facing)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| a1 | choice | TRIAGEM | situation type | 7 | OK |
| action_192 | action | EMERGENCIA | SAMU/Bombeiros call | 25 | OK |
| a2_mental | action | EMERGENCIA | CVV referral | 13 | OK |
| a2_unsure | info | EMERGENCIA | "when in doubt, call" | 29 | GRAMMAR |
| m1 | info | ACOLHIMENTO | validation — "you called, that matters" | 30 | OK |
| m2 | task | AMBIENTE | stay with person + clear space | 49 | OK |
| m2_emotional | info | ACOLHIMENTO | validation | 18 | OK |
| m3 | choice | TRIAGEM | situation subtype | 6 | OK |
| m3_overdose | info | EMERGENCIA | recovery position first aid | 34 | OK |
| m3_fall | info | EMERGENCIA | fall/injury first aid — don't move | 29 | OK |
| m3_breathing | info | EMERGENCIA | CPR guidance | 29 | OK |
| m3_emotional | info | ACOLHIMENTO | comfort script for accompanying | 23 | OK |
| m4 | task | EMERGENCIA | gather info for responders | 45 | OK |
| m5 | info | ACOLHIMENTO | validation — caregiver presence matters | 16 | OK |
| m6 | info | RESPIRACAO | 4-6 breathing (for the caregiver) | 49 | OK |
| m7 | info | EMERGENCIA | "SAMU can stay on the line" | 21 | OK |
| m8 | task | EMERGENCIA | prepare to receive help | 27 | OK |
| m9 | info | ACOLHIMENTO | self-care reminder (for after) | 28 | OK |
| m10 | action | EMERGENCIA | CVV + CAPS for the caregiver — **appears unreachable, see §E** | 7 | OK |
| m11 | info | MOTIVACIONAL | "you chose to be here — that's love" | 11 | OK |
| m12 | info | PSICOEDUCACAO | CAPS as ongoing support | 26 | OK |
| m13 | task | RESPIRACAO | breathe 3× for self | 31 | OK |
| m14 | info | MOTIVACIONAL | closing validation | 9 | OK |
| m15 | info | MOTIVACIONAL | closing (only emoji 💙 in corpus) | 12 | OK |
| instant_rescue | action | EMERGENCIA | SAMU/Bombeiros call (fast path) | 26 | OK |
| caps_link | action | EMERGENCIA | CAPS III referral | 8 | OK |

### FLOW cssrs — "Triagem de segurança" (19 nodes)
| nodeId | type | category | technique | words | flag |
|---|---|---|---|---|---|
| c1 | choice | RISCO_SUICIDIO | C-SSRS Q1 — desejo de morrer | 21 | OK |
| c1_yes | task | RESPIRACAO | 4-6 breathing ×3 | 36 | OK |
| c2 | choice | RISCO_SUICIDIO | C-SSRS Q2 — ideação ativa | 8 | OK |
| c2_yes | info | ACOLHIMENTO | validation before continuing | 16 | OK |
| c3 | choice | RISCO_SUICIDIO | C-SSRS Q3 — método | 5 | OK |
| c3_yes | task | FISIOLOGICO | cold water | 33 | OK |
| c4 | choice | RISCO_SUICIDIO | C-SSRS Q4 — intenção | 8 | OK |
| c4_yes | task | RESPIRACAO | box breathing 4×4 | 35 | OK |
| c5 | choice | RISCO_SUICIDIO | C-SSRS Q5 — plano | 9 | OK |
| c6 | choice | RISCO_SUICIDIO | C-SSRS Q6 — comportamento/3 meses ("se machucar") | 12 | RISKY_CLAIM |
| c6_past | action | EMERGENCIA | CVV referral | 9 | OK |
| emergent_panel | action | EMERGENCIA | CVV + SAMU, locked/crisis | 16 | OK |
| lethal_means | task | RISCO_SUICIDIO | means restriction (3 categories) | 76 | CLINICAL |
| caps_nearby | action | EMERGENCIA | CAPS III referral | 8 | OK |
| coping_entry | choice | TRIAGEM | post-screening menu | 7 | OK |
| triggers_map | choice | TERAPEUTICA | trigger identification menu | 7 | OK |
| hope_box | task | TERAPEUTICA | hope box / reasons-for-living (3-step) | 68 | OK |
| redirect_falar | redirect | REDIRECT | → falar | 8 | OK |
| redirect_torto | redirect | REDIRECT | → torto | 8 | OK |

---

## B) Per-flow statistics

### torto (31 nodes)
TRIAGEM 4 (12.9%) · MOTIVACIONAL 6 (19.4%) · REDUCAO_DANOS 3 (9.7%) · FISIOLOGICO 3 (9.7%) · AMBIENTE 3 (9.7%) · CONEXAO_SOCIAL 2 (6.5%) · EMERGENCIA 2 (6.5%) · ACOLHIMENTO 2 (6.5%) · REDIRECT 2 (6.5%) · RESPIRACAO 1 (3.2%) · GROUNDING 1 (3.2%) · PSICOEDUCACAO 1 (3.2%) · TERAPEUTICA 1 (3.2%)

**Main-path sequence** (a1→a2→fast_stim→m1…m15, first-choice branch): TRIAGEM, TRIAGEM, FISIOLOGICO, ACOLHIMENTO, AMBIENTE, FISIOLOGICO, AMBIENTE, TRIAGEM, MOTIVACIONAL, **RESPIRACAO (beat #10)**, GROUNDING, REDUCAO_DANOS, MOTIVACIONAL, CONEXAO_SOCIAL, CONEXAO_SOCIAL, MOTIVACIONAL, AMBIENTE, MOTIVACIONAL, MOTIVACIONAL.
- Breathing doesn't appear until the **10th beat** — two separate cold-water/dive-reflex prompts (fast_stim, m3) precede it.
- Cold water / dive reflex is used **3×** within this one flow (a3_stim or fast_stim, m3, and again inside harm_injection's hi4 is breathing not water — so 2× water + fast_stim entry = effectively repeated at m3 right after the fast-path already did it).
- Closing run is 4 MOTIVACIONAL beats in the last 6 nodes (m12, m14, m15 + m10 earlier) — validation-heavy tail.

### panico (28 nodes)
MOTIVACIONAL 6 (21.4%) · FISIOLOGICO 5 (17.9%) · RESPIRACAO 4 (14.3%) · TRIAGEM 3 (10.7%) · PSICOEDUCACAO 2 (7.1%) · TERAPEUTICA 2 (7.1%) · CONEXAO_SOCIAL 2 (7.1%) · GROUNDING 1 (3.6%) · EMERGENCIA 1 (3.6%) · ACOLHIMENTO 1 (3.6%) · REDIRECT 1 (3.6%)

**Main-path sequence**: TRIAGEM, FISIOLOGICO, PSICOEDUCACAO(m1, RISKY_CLAIM), RESPIRACAO, RESPIRACAO, TERAPEUTICA, FISIOLOGICO, TERAPEUTICA, FISIOLOGICO, RESPIRACAO, TRIAGEM, MOTIVACIONAL, **GROUNDING (beat #13)**, FISIOLOGICO, MOTIVACIONAL, PSICOEDUCACAO, CONEXAO_SOCIAL, CONEXAO_SOCIAL, MOTIVACIONAL, EMERGENCIA, MOTIVACIONAL, MOTIVACIONAL.
- **9 consecutive physiological/breathing techniques in a row** (a3_moderate → m1 → breath_46 → m2 → mindfulness_5 → m3 → draw_distract → m4 → box_breath_high) before the 5-4-3-2-1 grounding exercise ever appears.
- 4 distinct breathing variants used in this single flow (4-6 breathing, physiological sigh, box breathing, alternate-nostril) plus cold water 3× and humming 1× — the most technique-dense and technique-repetitive flow in the app.

### realidade (25 nodes)
GROUNDING 6 (24%) · MOTIVACIONAL 5 (20%) · TRIAGEM 2 (8%) · PSICOEDUCACAO 2 (8%) · REDIRECT 2 (8%) · ACOLHIMENTO 2 (8%) · CONEXAO_SOCIAL 2 (8%) · AMBIENTE 2 (8%) · EMERGENCIA 1 (4%) · TERAPEUTICA 1 (4%)

**Main-path sequence**: TRIAGEM, PSICOEDUCACAO, ACOLHIMENTO, GROUNDING, GROUNDING, GROUNDING, TRIAGEM, MOTIVACIONAL, GROUNDING, PSICOEDUCACAO, GROUNDING, MOTIVACIONAL, CONEXAO_SOCIAL, CONEXAO_SOCIAL, AMBIENTE, AMBIENTE, MOTIVACIONAL, MOTIVACIONAL.
- **No breathing exercise anywhere on the main path** — the only breathing content (mindfulness_real) sits on the "ainda está muito forte" (harder) branch off m5, so a user who says they feel a *little* better never sees any breath-based regulation tool, only grounding.
- 5 of the first 6 main-path beats are GROUNDING — high repetition of one technique family without variety (touch → name objects → cold water → 5 senses → movement).

### trava (27 nodes)
MOTIVACIONAL 5 (18.5%) · PSICOEDUCACAO 4 (14.8%) · TRIAGEM 3 (11.1%) · AMBIENTE 3 (11.1%) · GROUNDING 2 (7.4%) · CONEXAO_SOCIAL 2 (7.4%) · REDIRECT 2 (7.4%) · TERAPEUTICA 2 (7.4%) · FISIOLOGICO 1 (3.7%) · RESPIRACAO 1 (3.7%) · ACOLHIMENTO 1 (3.7%) · EMERGENCIA 1 (3.7%)

**Main-path sequence**: TRIAGEM, TRIAGEM, PSICOEDUCACAO, ACOLHIMENTO, FISIOLOGICO, AMBIENTE, RESPIRACAO, TRIAGEM, MOTIVACIONAL, GROUNDING, CONEXAO_SOCIAL, TERAPEUTICA, CONEXAO_SOCIAL, GROUNDING, PSICOEDUCACAO, MOTIVACIONAL, TERAPEUTICA, AMBIENTE, MOTIVACIONAL(dup), MOTIVACIONAL.
- Only **1 breathing beat** in the whole flow (m4) — appropriately body/grounding-heavy for a freeze/paranoia protocol, but worth a deliberate design check.
- **m11 and m14 are word-for-word identical** ("Você está aqui. Respirou. Não saiu. O corpo começa a sair da trava.. no seu tempo.") — a real content bug, not a stylistic echo; wastes a beat that could reinforce a *different* idea (see §D).

### falar (35 nodes — longest flow)
TERAPEUTICA 6 (17.1%) · MOTIVACIONAL 5 (14.3%) · EMERGENCIA 4 (11.4%) · CONEXAO_SOCIAL 4 (11.4%) · TRIAGEM 3 (8.6%) · FISIOLOGICO 3 (8.6%) · REDIRECT 3 (8.6%) · GROUNDING 2 (5.7%) · RESPIRACAO 2 (5.7%) · ACOLHIMENTO 2 (5.7%) · PSICOEDUCACAO 1 (2.9%)

**Main-path sequence** (a1→a2→"seguro onde estou"→m1…→sleep_routine→m15): TRIAGEM, TRIAGEM, ACOLHIMENTO, PSICOEDUCACAO, FISIOLOGICO, CONEXAO_SOCIAL, TRIAGEM, MOTIVACIONAL, TERAPEUTICA(walk_ground), **RESPIRACAO (beat #10)**, FISIOLOGICO, ACOLHIMENTO, TERAPEUTICA, TERAPEUTICA, TERAPEUTICA, CONEXAO_SOCIAL, CONEXAO_SOCIAL, CONEXAO_SOCIAL, TERAPEUTICA, MOTIVACIONAL, TERAPEUTICA, MOTIVACIONAL, FISIOLOGICO, MOTIVACIONAL.
- Richest therapeutic content in the app: 6 distinct named techniques (behavioral-activation walk, journaling, CBT reframe, CRT pause, behavioral-activation small-plan) — this is the flow that most resembles structured therapy rather than pure crisis first-aid.
- Only 1 formal breathing beat on the main path (m7), arriving relatively late (beat #10 of 24).
- If a user answers "não tenho certeza se estou seguro" at a2, they're redirected to `samu` before reaching any of this content — a meaningful, appropriate safety branch.

### samu (26 nodes — caregiver-facing, distinct register)
EMERGENCIA 12 (46.2%) · ACOLHIMENTO 5 (19.2%) · MOTIVACIONAL 3 (11.5%) · TRIAGEM 2 (7.7%) · RESPIRACAO 2 (7.7%) · AMBIENTE 1 (3.8%) · PSICOEDUCACAO 1 (3.8%)

**Main-path sequence**: EMERGENCIA(instant_rescue), ACOLHIMENTO, AMBIENTE, TRIAGEM, EMERGENCIA(m3_overdose), EMERGENCIA, ACOLHIMENTO, RESPIRACAO, EMERGENCIA, EMERGENCIA, ACOLHIMENTO, EMERGENCIA(caps_link), MOTIVACIONAL, PSICOEDUCACAO, RESPIRACAO, MOTIVACIONAL, MOTIVACIONAL.
- Nearly half the flow is EMERGENCIA-category content (first-aid instructions, gathering info, staying on the line) — appropriate, since this flow supports someone caring for another person in physical danger, not self-regulation.
- Node `m10` (CVV+CAPS "recursos adicionais") is **never targeted by any other node's `autoTo`/choice** — `m9` auto-routes straight to `caps_link`, and `caps_link` auto-routes to `m11`. `m10` appears to be dead/unreachable content (see §E).
- Only breathing content is for the **caregiver's own** regulation (m6, m13), correctly scoped — good design choice.

### cssrs (19 nodes)
RISCO_SUICIDIO 7 (36.8%) · EMERGENCIA 3 (15.8%) · TERAPEUTICA 2 (10.5%) · RESPIRACAO 2 (10.5%) · REDIRECT 2 (10.5%) · TRIAGEM 1 (5.3%) · ACOLHIMENTO 1 (5.3%) · FISIOLOGICO 1 (5.3%)

**Positive-cascade path** (all "Sim" answers, the clinically critical route): RISCO_SUICIDIO(c1), RESPIRACAO, RISCO_SUICIDIO(c2), ACOLHIMENTO, RISCO_SUICIDIO(c3), FISIOLOGICO, RISCO_SUICIDIO(c4), RESPIRACAO, RISCO_SUICIDIO(c5) → **lethal_means directly**, EMERGENCIA(caps_nearby), TRIAGEM(coping_entry), TERAPEUTICA.
- Each C-SSRS question is followed by exactly one short regulation beat before the next question — good "one question at a time" pacing matching the spec's stated design intent.
- **Deviation from spec**: `workflows 002.md`'s table states Node 5 ("Plano e Intenção") transitions to Node 6 on **both** Sim and Não. The implementation instead sends "Sim" straight to `lethal_means` (skipping c6/Node 6 entirely) and only routes "Não" to `c6`. This is plausibly a deliberate safety-first simplification (skip further questions, restrict means immediately) but it is a real intent-vs-implementation gap worth confirming with whoever owns the clinical logic.

---

## C) Global balance (191 nodes)

| Category | Count | % |
|---|---|---|
| MOTIVACIONAL | 30 | 15.7% |
| EMERGENCIA | 24 | 12.6% |
| TERAPEUTICA | 14 | 7.3% |
| ACOLHIMENTO | 14 | 7.3% |
| TRIAGEM | 18 | 9.4% |
| FISIOLOGICO | 13 | 6.8% |
| REDIRECT | 12 | 6.3% |
| RESPIRACAO | 12 | 6.3% |
| GROUNDING | 12 | 6.3% |
| CONEXAO_SOCIAL | 12 | 6.3% |
| PSICOEDUCACAO | 11 | 5.8% |
| AMBIENTE | 9 | 4.7% |
| RISCO_SUICIDIO | 7 | 3.7% |
| REDUCAO_DANOS | 3 | 1.6% |

**Requested groupings:**
- **MOTIVACIONAL**: 30 nodes (15.7%) — the single largest category in the entire app, larger than any individual technique bucket.
- **TECNICAS** (FISIOLOGICO + RESPIRACAO + GROUNDING + AMBIENTE): 13+12+12+9 = **46 nodes (24.1%)** — the largest combined bucket, as expected for a crisis-first-aid tool.
- **TERAPEUTICA**: 14 nodes (7.3%) — concentrated almost entirely in `falar` (6) and `cssrs` (2); `torto`, `panico`, `realidade`, `trava` each have only 1-2.
- **PSICOEDUCACAO**: 11 nodes (5.8%) — thin relative to app size; mostly one-line "here's why this is happening" statements rather than deeper explanation.
- **EMERGENCIA**: 24 nodes (12.6%) — heavily concentrated in `samu` (12 of 24, i.e. half of all emergency-category content lives in one flow) and `cssrs` (3).
- **REDUCAO_DANOS**: only **3 nodes (1.6%)**, all inside `torto` (m9, harm_alcohol, harm_injection). Given this app's explicit harm-reduction framing (per `workflows 001.md`'s brainstorm on álcool/drogas), **6 of 7 flows contain zero substance-specific harm-reduction content** — panico, realidade, trava, falar, samu, cssrs never mention safer-use practices even though several of them are reachable after substance use (e.g. torto→redirect_panico, torto→redirect_trava).

**Technique repetition (verbatim or near-verbatim reuse):**
- **Cold water / dive reflex** appears as a task in **12 separate nodes**: torto.a3_stim, torto.m3, torto.fast_stim, panico.a3_moderate, panico.a3_severe, panico.m4, panico.fast_panic, realidade.m4, realidade.fast_realidade, falar.m_crisis_hold, falar.fast_ground, cssrs.c3_yes.
- The **exact same 4-6-10 breathing paragraph** ("Inspira lenta e profundamente pelo nariz (conta 4 segundos)…") is copy-pasted verbatim (or near-verbatim) into at least **9 nodes**: torto.m7, torto.harm_injection, panico.breath_46, panico.fast_panic, trava.m4, falar.m_crisis_breath, falar.m7, samu.m6, and a shortened variant in cssrs.c1_yes. This is good for dev reuse/consistency but is a single point of maintenance risk (any wording or safety-caveat fix must be propagated to 9 places by hand) and could feel repetitive to a user who bounces between flows via redirects.

**Missing evidence-based techniques** (per the brainstorm doc's own research and standard crisis-support practice), checked against what's actually implemented:
- ❌ **DBT TIPP** as a named, complete set — Temperature (✅ present as cold water) and Paced breathing (✅ present) exist piecemeal, but Intense exercise and Progressive Muscle Relaxation are not implemented as such.
- ⚠️ **PMR (progressive muscle relaxation)** — only a partial fragment exists (realidade.m9 "aperta e solte os punhos"); no full body-scan PMR sequence anywhere.
- ✅ **Box breathing** — present (panico.box_breath_high, cssrs.c4_yes) but only in 2 flows.
- ✅ **Physiological sigh** — present (panico.m2 "Suspiro Duplo", panico.fast_panic fp1) but unlabeled as such; could be named for future reuse.
- ⚠️ **Butterfly hug / bilateral stimulation** — trava.m12 (alternating feet) gestures at bilateral movement but the classic crossed-arm tapping variant is absent.
- ❌ **Safe-place / guided imagery** — not present anywhere in the corpus.
- ❌ **Urge surfing** (for cravings/relapse) — not present; torto's harm-reduction tasks address safety during use, not craving management.
- ❌ **HALT check** (hungry/angry/lonely/tired) — not present.
- ⚠️ **Safety plan (Stanley-Brown style)** — cssrs.lethal_means implements means-restriction only (one of the Stanley-Brown plan's several components); no warning-signs list, no personal coping-strategies list, no professional-contacts list beyond CVV/CAPS/SAMU.
- ⚠️ **Trigger mapping** — cssrs.triggers_map exists but is a thin single-choice menu that immediately redirects away (to falar or torto) rather than actually recording or reflecting on the trigger.
- ❌ **Delay/distract specifically for cravings** — draw_distract (panico) and journaling (falar) are general distraction/processing tools, not craving-specific.
- ❌ **Naloxone information** — absent even in torto.harm_injection, which is specifically about injection drug use; this is a notable gap for an app operating in a real-world harm-reduction context with opioid risk.
- ❌ **Heat/hyperthermia warning for MDMA/stimulants** — torto.fast_stim mentions a fan/cooler environment implicitly but never explicitly warns about overheating, and there's no explicit "if you feel very hot/can't cool down, that's an emergency" flag.
- ❌ **GHB ("G") specific risk info** — not mentioned anywhere, despite GHB's narrow safety margin being a well-known nightlife risk in Rio's harm-reduction context.
- ⚠️ **Poly-drug mixing** — only partially covered (torto.harm_injection hi3 warns against mixing depressants); no coverage of stimulant+MDMA, serotonin-syndrome-risk combos, or alcohol+benzodiazepine specifically outside that one node.
- ⚠️ **"Set and setting" reflection** — implicit in AMBIENTE tasks (dim lights, quiet corner) but never taught as a reusable concept for future use.
- ⚠️ **Sleep** — only in falar.sleep_routine; absent elsewhere.
- ⚠️ **Food/sugar** — only in torto.harm_alcohol (eat before drinking) and torto.fast_psych (sugar); absent elsewhere.

---

## D) Tone review

### 15 worst lines
1. **torto.m9 / torto.harm_alcohol (ha1)** — *"Se bebeu álcool: 1 copo (250 mL) por dose."* — RISKY_CLAIM. "Dose" is undefined (a shot of spirits ≠ a glass of wine ≠ a can of beer), so the ratio reads as precise medical guidance when it isn't. **Rewrite direction**: drop the specific number; say something like "beba água aos poucos entre as bebidas" and let a clinician decide whether a ratio belongs at all.
2. **panico.m1** — *"Você não está em perigo real."* — RISKY_CLAIM. Stated as an unconditional fact; could falsely reassure someone with an actual cardiac or medical emergency, especially since users can reach this screen after substance use. **Rewrite direction**: frame as "isso costuma ser…" (usually is) rather than an absolute, and gate it behind a lightweight red-flag check (see §E).
3. **realidade.a2** — *"O que você está descrevendo se chama despersonalização ou desrealização."* — CLINICAL. Leading with DSM-style diagnostic labels to someone mid-crisis can feel like being pathologized rather than supported. **Rewrite direction**: describe the experience in plain language first; introduce the clinical name later or not at all.
4. **cssrs.c6** — *"Nos últimos 3 meses, você fez ou preparou algo para se machucar?"* — RISKY_CLAIM (fidelity gap). The spec's Node 6 wording is "…para pôr fim à sua vida" (to end your life); the implementation instead asks about "se machucar" (hurting yourself in general), which conflates non-suicidal self-injury with suicide-attempt history — a real C-SSRS fidelity problem with risk-classification consequences. **Rewrite direction**: restore suicide-specific wording per the spec.
5. **cssrs.lethal_means (intro)** — *"Segurança física agora.. meios letais precisam de distância."* — CLINICAL. "Meios letais" is clinical/textbook jargon delivered directly to someone at high risk. **Rewrite direction**: soften to something like "vamos afastar, por enquanto, o que poderia te machucar."
6. **trava.m11 / trava.m14** — identical text repeated verbatim two beats apart ("Você está aqui. Respirou. Não saiu…"). VAGUE/redundant. **Rewrite direction**: give m14 distinct closing content; the duplication reads as a copy-paste bug, not a deliberate echo.
7. **torto.harm_injection (hi3)** — *"Estatística distante não ajuda quando é o seu corpo.."* — VAGUE. Unclear referent; the intended meaning (general statistics don't matter, only your body does) doesn't land clearly. **Rewrite direction**: "Números genéricos não importam agora — o que importa é o SEU corpo."
8. **samu.a2_unsure** — *"Eles não se importam."* — GRAMMAR/VAGUE. Almost certainly meant "eles não vão se importar com isso" (they won't mind), but as written it reads as "they don't care," which is confusing and tonally opposite of the intent. **Rewrite direction**: "Ninguém vai te julgar por ligar."
9. **falar.fast_ground (fg4)** — CVV listed as a checkbox `[task]` item alongside grounding tasks. VAGUE/design mismatch. Treating a crisis hotline referral as a "did you do this?" checklist item undercuts its gravity. **Rewrite direction**: pull the CVV reference out into its own `action` card, not a task with a checkmark.
10. **realidade.m12** — *"evita telas, ruído excessivo e cafeína."* — PREACHY. Three stacked imperatives in a row reads like a list of rules rather than a gentle suggestion, inconsistent with the app's otherwise warm register. **Rewrite direction**: "se puder, ir com calma com telas e cafeína nas próximas horas ajuda" (softer, optional framing).
11. **torto.m6_worse / falar.a2** — *"Obrigado por me contar."* — GRAMMAR (gendered). The assistant persona defaults to masculine grammatical gender ("Obrigado" not "Obrigada" or neutral). **Rewrite direction**: "Valeu por contar" or "Isso importa" avoids the gendered participle entirely.
12. **falar.wa_from_yes** — `href` contains the literal string `"https://wa.me/?text=PLACEHOLDER"`. Not a tone issue on its face, but if template resolution ever fails in production this literal word reaches the user mid-crisis. **Rewrite direction**: confirm the `whatsappTemplate: "crisis_generic"` resolution always overwrites this before render; add a fallback.
13. **samu.m3_overdose** — *"Não tenta acordar com violência."* — mildly awkward phrasing (implies deliberate violence rather than "don't shake them hard"). **Rewrite direction**: "não sacode a pessoa com força."
14. **torto.a3_stim** — *"o corpo está processando, não colapsando."* — borderline CLINICAL diction ("colapsando") for a crisis moment; works but is one of the more medical-sounding lines outside cssrs/samu.
15. **panico.m1 (second clause)** — *"coração acelerado não significa morte iminente."* — naming "morte iminente" (imminent death) explicitly, even to deny it, can itself be alarming (ironic rebound effect common in reassurance-based CBT scripts). **Rewrite direction**: state the reassurance without first invoking the feared outcome by name.

### 10 best lines (tone reference)
1. **torto.m1** — *"Você abriu este espaço.. isso já é um passo. Não precisa resolver nada agora. Só ficar aqui comigo, devagar."*
2. **panico.m10** — *"O pânico acontece quando o alarme do cérebro dispara sem perigo real. Não é fraqueza. É fisiologia."*
3. **trava.a3_freeze** — *"Congelar é uma resposta de sobrevivência.. tão válida quanto correr ou lutar. O corpo vai sair desse estado. Vamos ajudá-lo."*
4. **falar.m9** — *"Você merece apoio. Não porque você fez alguma coisa de especial.. mas porque você existe, e existir é suficiente."*
5. **torto.m14** — *"Você ficou aqui um tempo. Respirou. Fez o que deu. Isso não apaga a dor.. mas o corpo começa a sair do pico."*
6. **samu.m11** — *"Você não precisava estar aqui.. e escolheu estar. Isso é amor."*
7. **realidade.a3_anchor** — *"Tudo bem não conseguir explicar. O que eu sei é que você está aqui. O chão é real. Eu estou com você."*
8. **panico.m15** — *"Se ainda estiver mal, tudo bem não estar bem."*
9. **falar.m2** — *"Quando a gente está nessa intensidade, o cérebro mente. Ele diz que isso vai durar para sempre.. mas não vai."*
10. **torto.a2_unclear** — *"Não saber é tudo bem. Às vezes a gente só sente que precisa de apoio.. e isso já é o suficiente para estar aqui."*

---

## E) Safety / accuracy flags

1. **No red-flag symptom gate before reassurance.** Neither `torto` nor `panico` asks about chest pain, seizure, unconsciousness, breathing difficulty, or very high body temperature before delivering absolute reassurance lines ("você não está em perigo real," "seu corpo não está morrendo"). `samu` does have first-aid branching (m3_overdose/m3_fall/m3_breathing) but that's for a *third party*, not the user themself. This is the single highest-priority clinical gap: a stimulant user with real chest pain or a hyperthermic MDMA user could receive blanket "you're safe" messaging with no checkpoint. **Recommendation**: add a one-question red-flag check at the top of torto/panico/fast_stim ("dor no peito, convulsão, desmaio, muito calor no corpo, ou dificuldade para respirar?") that routes straight to `samu` on "yes."
2. **"1 copo (250 mL) por dose"** (torto.m9, torto.harm_alcohol) needs clinical/harm-reduction professional review — undefined "dose," no ceiling on total consumption, and doesn't address alcohol-poisoning red flags (vomiting while unconscious, unresponsive, slow/irregular breathing) that would warrant `samu` instead of more water.
3. **Dive-reflex / cold-water claims are stated as near-guarantees** ("baixa o coração de verdade," "imediatamente") across 12 nodes, with zero contraindication note. Cold-water facial immersion is a legitimate DBT TIPP technique, but some people (e.g. certain cardiac arrhythmia or vasovagal-syncope histories) are advised to use it cautiously. Recommend adding a brief, non-alarming caveat once (e.g. in a shared component) rather than in every node.
4. **CAPS is never called a hospital in the implementation data** — good. `samu.m10`/`m12`, `falar.m6_hard`, `cssrs.caps_nearby` all correctly describe CAPS III as 24h community-based acolhimento pelo SUS. However, `workflows 002.md`'s own source language ("leitos ativos," "alternativa segura e humanizada à hospitalização clássica") risks conflating CAPS with inpatient hospital beds if that phrasing ever migrates into user-facing copy — worth a standing style-guide note to keep it out.
5. **C-SSRS fidelity gap at c6** (see D.4) — "se machucar" vs. the spec's suicide-specific wording is a classification-accuracy risk, not just a tone issue.
6. **Spec-vs-implementation deviation at cssrs.c5** — spec's Node 5 sends both Sim/Não to Node 6; implementation sends "Sim" straight to `lethal_means`, skipping `c6`. Confirm this was an intentional clinical decision (immediate means-restriction takes priority over further questioning) and document it, since as written it silently diverges from the architecture doc.
7. **samu.m10 appears unreachable** — no other node's `autoTo` or choice target points to it (m9 auto-routes to `caps_link`, which auto-routes to `m11`, bypassing m10 entirely). If this is dead content, its CVV/CAPS reference for the caregiver's own aftercare never surfaces; recommend either wiring it into the path or removing it. Given the file is a flattened dump, a full reachability check across all 191 nodes (not just this one instance) is recommended before shipping.
8. **falar.wa_from_yes placeholder** — literal `"PLACEHOLDER"` text in the WhatsApp `href` needs confirmation that `whatsappTemplate` resolution always replaces it; a raw "PLACEHOLDER" surfacing in a crisis moment would be jarring and would break the WhatsApp deep link entirely.
9. **Resource data reliability** — the 7 CAPS III/CAPSad III addresses, phone numbers and emails hardcoded in `workflows 002.md` (and presumably mirrored in-app behind `#caps`/`caps_list`) should be on a periodic verification cadence; public health unit contact details and hours can and do change.
10. **panico.m1's absolute reassurance** is standard practice within panic-specific CBT protocols *when panic has already been differentially identified*, but this app's routing (torto→redirect_panico, trava→redirect_panico) means people who started in a substance-use or paranoia flow can land here too — worth double-checking that redirect copy doesn't inadvertently carry someone with a substance-related physiological emergency into "you're not in danger" messaging without the red-flag gate from #1.

---

## F) Microcopy consistency

- **tu/você**: No mixing found — "você" is used consistently across all 191 nodes. Good.
- **Gendered language**: 
  - *"Obrigado"* (masculine) appears in torto.m6_worse and falar.a2, gendering the assistant persona. Recommend replacing with ungendered phrasing app-wide (e.g., "Valeu por contar," "Isso importa").
  - *"sozinho"* (masculine adjective) appears in the flow title "Você não está sozinho" (falar.fast_ground) — should ideally read "não está só" to avoid gendering the user.
  - "Travei," "travado" are self-referential first-person/adjective forms tied to the *situation* (not the user's identity) and read as acceptable as-is.
- **".." (double-dot) style**: used pervasively as an ellipsis/pause marker in nearly every node, across all 7 flows — this is consistent (not inconsistent) but is non-standard punctuation (proper ellipsis is "…" or "..."). Recommend either standardizing to a real ellipsis character app-wide or keeping ".." deliberately as a documented style-guide choice — but pick one and document it, since screen readers may render ".." oddly.
- **Emoji use**: appears exactly **once** in the entire 191-node corpus — samu.m15's closing "💙". This is arbitrary rather than a deliberate design choice (every other closing screen across torto/panico/realidade/trava/falar ends with plain text). Recommend either extending warm emoji use to all flow-closing screens for consistency, or removing this lone instance.
- **Home-label mismatches in redirect suggestion copy** (the task specifically asked to check this): official home labels are **Bateu Forte, Pânico, Onde eu tô?, Paranoia, Solidão, Resgate**.
  - **torto.redirect_trava**: suggestion text reads *"Quer ir para o suporte de **Travei**?"* — should be "Paranoia" to match the home tile. Mismatch confirmed.
  - **trava.redirect_realidade**: suggestion text reads *"Quer ir para o suporte de **Onde estou**?"* — home label is "Onde eu tô?" — close but not exact; inconsistent phrasing.
  - **cssrs.redirect_falar**: suggestion text reads *"Continuar no fluxo **Tô sozinho**?"* — home label is "Solidão" — mismatch confirmed.
  - All other redirect suggestions checked (torto.redirect_panico, panico.redirect_torto, realidade.a2_substance, realidade.redirect_panico, trava.redirect_panico, falar.a3_unsure, falar.redirect_torto, cssrs.redirect_torto) correctly match their home labels.
- **flowTitle overrides** used on fast-path nodes (e.g., torto.fast_stim's "Acelerou demais," panico.fast_panic's "Crise de Pânico," trava.fast_trava's "Travei / Paranoia") introduce yet more alternate names for the same flows beyond the home label and the redirect-suggestion text — a third naming surface that could drift further out of sync over time. Recommend a single source-of-truth label per flow referenced everywhere (home tile, redirect suggestions, fast-path titles).
