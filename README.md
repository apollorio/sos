# SOS Apollo

**Harm Control · Apollo::rio**

> When it hits too hard, one useful thing at a time.

**SOS Apollo** is an offline-first harm-control companion being developed for the Apollo::rio ecosystem.

It is designed for moments when someone feels overwhelmed, altered, anxious, disconnected, overstimulated, unusually sleepy, confused — or when a friend is trying to help someone nearby.

The goal is not to interrogate, diagnose or identify exactly what a person used.

The goal is simpler:

**understand enough of what is happening to choose the smallest useful next action.**

🌐 **sos.apollo.rio.br**

---

## Why this exists

Most emergency or harm-reduction interfaces behave like forms:

```text
question
↓
question
↓
question
↓
result
```

SOS Apollo works differently.

```text
event
↓
understand current state
↓
check hard safety rules
↓
choose one useful action
↓
observe what changes
↓
repeat
```

The app does not force someone through a predetermined flow.

Every tap can change the route.

A friend arriving changes the route.

Moving somewhere quieter changes the route.

Saying **“I can't do that”** changes the route.

Feeling better changes the route.

Feeling worse changes the route.

The system continuously recalculates what matters **now**.

---

## Core idea

SOS Apollo should feel intelligent without pretending to know more than it does.

There is:

* no generative AI in the critical runtime;
* no cloud LLM interpreting a crisis;
* no login;
* no identity requirement;
* no profile needed before receiving help;
* no long chatbot conversation keeping someone trapped inside the app.

The intelligence comes from:

**structured events + temporary state + memory + deterministic safety rules + contextual decisions.**

---

## Self or helping someone

The first distinction is not *who you are*.

It is simply:

```text
Who needs support?

[ Me ]
[ Someone with me ]
```

Internally:

```ts
actor = "self" | "helper"
```

That changes perspective.

If someone is helping another person who has become unresponsive, the app should not ask:

> “How are you feeling?”

It immediately switches to the appropriate safety response.

No name is necessary.

No account is necessary.

No personal identity is necessary.

---

## The “Akinator” principle

SOS Apollo does not need to put drug names on the screen or ask people to classify what they took before helping them.

Instead, it can learn gradually from simple questions such as:

```text
How does your body feel?

[ accelerated ]
[ heavy ]
[ normal ]
[ hard to tell ]
```

Then, only if useful:

```text
And your head?

[ I'm here ]
[ kind of far away ]
[ everything feels intense ]
[ confused ]
```

Or:

```text
Is staying awake difficult?

[ no ]
[ a little ]
[ a lot ]
```

The engine builds an **operational picture**, not a diagnosis.

For example:

```text
activation       → accelerated
alertness        → present
perception       → intense
environment      → loud
company          → alone
friend           → coming
trend            → stable
```

From that, it can decide that reducing stimulation is more useful than asking another question.

This is the project’s version of an **Akinator**:

> Ask only when the answer could change what happens next.

---

## It does not try to guess a drug

The runtime may recognize broad operational patterns such as:

```text
stim-like
downer-like
psychedelic-like
mixed-like
unknown
```

These are not diagnoses and should not be shown as conclusions to the user.

They exist only to help decide things such as:

* whether stimulation should be reduced;
* whether alertness and breathing deserve greater attention;
* whether grounding may help;
* whether someone should stay close;
* whether the current picture is too uncertain to follow a simple strategy.

The system should never produce fake certainty such as:

```text
“74% chance this was substance X”
```

That is not its job.

---

## Combined / mixed states

Different effects can coexist.

The system therefore treats:

```text
unknown
```

and:

```text
mixed / conflicting signs
```

as different concepts.

For example:

```text
body accelerated
+
difficulty staying awake
```

does not mean the app knows what was taken.

It means:

```text
mixed-like pattern
→ uncertainty rises
→ choose a more conservative path
```

**Unknown is not safe.
Unknown is unknown.**

---

## One face · many things in the background

The interface shows **one primary action**.

Example:

```text
Let's make the world a little quieter.

If there's a calmer place nearby,
go there slowly.

[ I'm there ]
[ I can't ]
```

Meanwhile, the runtime can quietly maintain:

```text
friend-arrival commitment
check-in deadline
current environment
current company
risk trend
strategy history
```

The user sees one thing.

The engine remembers everything else.

---

## “I can't” is an event

One of the project laws:

> **“I can't” invalidates the strategy, never the person.**

If the app suggests moving somewhere quieter and the answer is:

```text
[ I can't ]
```

it does not repeat the instruction.

Instead:

```text
relocate
→ invalidated
→ recalculate
→ use another eligible strategy
```

That may mean:

* reduce stimulation in place;
* stay close to a trusted person;
* contact someone;
* ground where you are;
* escalate if a hard safety condition exists.

---

## Returning to earth

Grounding is not one giant exercise.

It is made of very small interactions.

For example:

```text
Look around.

Find one thing that isn't moving.

[ found it ]
```

Then:

```text
Good.

Feel something firm:
the floor, a chair, a wall.

[ got it ]
```

Then:

```text
How does everything feel now?

[ a little better ]
[ the same ]
[ worse ]
```

Each answer is simultaneously:

**support + information.**

If the person is improving, the runtime reduces intervention.

If nothing changes, it can switch technique.

If things worsen, safety is reassessed immediately.

---

## Calm does not mean slow emergency handling

SOS Apollo should never create panic unnecessarily.

But calm language must never delay emergency action.

Hard safety rules sit above every normal strategy.

Conceptually:

```text
EVENT
  ↓
STATE
  ↓
HARD SAFETY RULES
  ↓
P0?
 ├── YES → emergency action
 └── NO  → normal adaptive runtime
```

A P0 condition does not enter a planner.

It executes.

```text
P0 does not optimize.
P0 acts.
```

For Brazil, emergency access includes a native:

```text
tel:192
```

for **SAMU 192**.

The emergency affordance exists outside the JavaScript decision loop so that access does not depend on the runtime continuing to work.

---

## Self and helper modes

The same state may produce different cards depending on who is holding the phone.

### Self

```text
Are you still able to stay present?

[ yes ]
[ kind of ]
[ difficult ]
```

### Helper

```text
Does the person respond when you speak to them?

[ normally ]
[ a little ]
[ almost not at all ]
[ no ]
```

Helper mode should feel like:

**“help me observe and stay with this person”**

—not—

**“become a paramedic.”**

---

## Friends matter

Real-world support has priority over engagement.

Example:

```text
Is someone with you?

[ yes ]
[ I'm alone ]
[ someone is coming ]
```

If someone is coming:

```text
Are they close?

[ almost here ]
[ a few minutes ]
[ it'll take a while ]
[ I don't know ]
```

The runtime creates a commitment.

Conversation can continue.

The app does not forget.

Later:

```text
Did they arrive?

[ yes ]
[ not yet ]
[ they're not coming anymore ]
```

If they arrived:

```text
alone = false
commitment = completed
```

The entire strategy can change.

---

## Anti-hyperfocus

The objective is **not maximum engagement**.

Sometimes the safest product behavior is:

> stop using the product.

The higher the criticality, the smaller the interface becomes.

SOS Apollo prefers:

```text
one real-world action
```

over:

```text
six educational paragraphs
```

Possible background policies include:

* suppress educational content;
* shorten cards;
* reduce available actions;
* prioritize a trusted person;
* wait for a real-world event;
* stop asking questions that no longer change the decision.

The real world beats the app.

---

## Silence is information — not a symptom

No response does **not** automatically mean medical deterioration.

The runtime distinguishes between:

```text
SILENCE
```

The app remained visible and an expected response did not arrive.

```text
APP UNAVAILABLE
```

The tab was hidden, suspended, closed or the device stopped executing the page.

```text
CONNECTIVITY LOST
```

The app is running but the network disappeared.

These must never be treated as the same thing.

> Silence can increase uncertainty.
> It cannot invent a symptom.

---

## Event-driven runtime

The app works with events instead of scripted flows.

Examples:

```text
SESSION_STARTED
SIGNALS_REPORTED
STRATEGY_OUTCOME
COMMITMENT_CREATED
COMMITMENT_RESOLVED
APP_HIDDEN
APP_VISIBLE
CONNECTIVITY
TIMER_EXPIRED
HANDOFF_OPENED
HELP_ON_SCENE
CORRECTION
```

An event updates temporary state.

Then the engine decides again.

---

## State is temporary

A signal carries context such as:

```ts
{
  value,
  source,
  observedAt,
  expiresAt
}
```

But explicit reality always wins over old state.

Example:

```text
alone = true
```

Then:

```text
TRUSTED_PERSON_ARRIVED
```

Immediately means:

```text
alone = false
```

The runtime does not wait for a timer.

Principle:

> **Explicit event beats TTL. TTL beats stale data.**

Critical facts may be latched so that time alone can never silently de-escalate a P0 state.

---

## Safety bands

Internally, the runtime uses operational priority bands.

```text
P0 — possible immediate emergency
P1 — safety / company must be stabilized
P2 — significant distress, still interactive
P3 — stable / light support
```

These are **system priorities**, not medical diagnoses.

The person never needs to see:

```text
“You are P2.”
```

That information exists only to constrain what the engine may do.

---

## Hard rules

Hard rules are deterministic and ordered.

```text
HR-001
HR-002
HR-003
...
```

If more than one rule matches at the same time:

```text
first matching rule wins
```

There is no merged emergency screen.

One P0 has one commander.

That keeps the interface predictable precisely when it needs to be smallest.

---

## Policy tables, not fake AI scores

SOS Apollo intentionally avoids pseudo-scientific formulas such as:

```text
benefit = 0.73
urgency = 0.84
utility = 0.7124
```

Instead:

```text
P2

IF loud AND distress high
→ reduce_stimulation

ELSE IF alone AND support needed
→ contact_trusted_person

ELSE IF grounding eligible
→ grounding
```

Ordered policy tables are:

* readable;
* auditable;
* testable;
* deterministic;
* clinically reviewable.

---

## Value of information

Questions themselves compete for attention.

Before asking something, the engine can simulate:

```text
If answer A → what happens?
If answer B → what happens?
If answer C → what happens?
```

Questions are classified conceptually as:

### Critical

An answer could reveal P0.

Ask now.

### Decisive

Different answers change the next useful action.

Ask only if the current band allows another question.

### Irrelevant

Every answer results in the same next action.

Do not ask.

This is how the interface can feel remarkably intelligent without generative AI.

---

## Architecture

```text
REAL WORLD
   │
   ├── tap
   ├── check-in
   ├── timer
   ├── visibility
   ├── connectivity
   └── local critical trigger
          │
          ▼
       INGEST
          │
          ▼
       REDUCER
          │
          ▼
   SEMANTIC INVALIDATION
          │
          ▼
        STATE
          │
          ▼
     HARD RULES
       │      │
      P0    NON-P0
       │      │
       │    RISK/BAND
       │      │
       │     VOI
       │      │
       │   POLICY TABLE
       │      │
       │     SKILL
       │      │
       └──────┴─────────┐
                        ▼
                   ONE CARD
                        │
                 N BACKGROUND
                    EFFECTS
                        │
                        ▼
                    REAL WORLD
                        │
                        └────── LOOP
```

---

## Core behavioral skills

The target behavioral model is intentionally small.

```text
assess_responsiveness
emergency_escalation
reduce_stimulation
contact_trusted_person
confirm_arrival
grounding
```

Fallback/runtime behavior may exist separately to guarantee that the engine always has a valid output, but the behavioral vocabulary should remain small and understandable.

Complexity belongs in **state and policy**, not in hundreds of flows.

---

## No LLM in the critical path

The v1 runtime is deliberately deterministic.

```text
NO:
cloud NLP
generative response composer
model-generated health decisions
LLM state patches
```

Visible copy comes from reviewed card catalogs.

For example:

```ts
CARD_MOVE_QUIET = {
  title: "Let's make the world a little quieter.",
  actions: [
    "I'm there",
    "I can't"
  ]
}
```

This provides:

* predictable behavior;
* offline operation;
* reproducibility;
* auditability;
* testability;
* easier clinical review.

---

## Free text

Free text is not an open chatbot in v1.

When available, it exists only as an escape hatch for a very small set of critical local triggers.

For example, locally recognized phrases related to:

* inability to breathe;
* unresponsiveness;
* severe chest symptoms;
* seizure;
* immediate physical danger.

Matching occurs on-device.

Unmatched text does not receive a fabricated AI response.

---

## Offline-first

Critical logic should continue working inside a club, venue, basement, festival or crowded area with bad connectivity.

The v1 architecture is designed around:

* PWA;
* static emergency shell;
* local policy engine;
* local cards;
* local state;
* local event log;
* no server dependency for core decisions.

Network availability may improve handoffs such as WhatsApp.

It must never gate emergency access.

---

## Privacy first

Harm-control data is extremely sensitive.

The design therefore follows a minimal-data principle:

```text
no account
no name
no phone number stored
no precise location required
no health analytics
no advertising profile
no substance analytics
```

Operational state should stay local whenever possible and have short retention.

A user should be able to wipe the session immediately.

The system needs to remember:

> “someone is coming”

It does not need to know:

> “João da Silva, +55…”

---

## Local decision log

Every decision should be explainable.

Not:

```text
“The AI decided.”
```

But:

```json
{
  "decision": "reduce_stimulation",
  "band": "P2",
  "because": [
    "noise=loud",
    "distress=high"
  ],
  "policy": "P2-020"
}
```

That makes the engine reviewable by developers, safety reviewers and clinicians.

---

## Engineering principles

The project follows a small set of laws:

1. **Event is fact.**
2. **State is temporary.**
3. **Escalate fast; de-escalate slowly.**
4. **Hard rules beat everything.**
5. **P0 does not optimize.**
6. **Silence raises uncertainty; it does not invent symptoms.**
7. **One foreground action, N background effects.**
8. **Ask only what can change what happens next.**
9. **“I can't” invalidates the strategy, never the person.**
10. **Actor defines perspective, never identity.**
11. **Emergency access must survive runtime failure.**
12. **The real world beats the app.**

---

## Safety and clinical review

SOS Apollo is a **harm-control / harm-reduction support project**, not a diagnostic system and not a replacement for professional emergency care.

The software architecture can be tested exhaustively.

Clinical correctness cannot be proven by TypeScript.

Before production use, safety-critical rules, intervention eligibility and visible health-related copy require qualified human review.

In Brazil, emergency medical support is available through:

**SAMU — 192**

Toxicology guidance may also be available through:

**Disque-Intoxicação — 0800 722 6001**

These resources serve different purposes; toxicology guidance does not replace emergency medical care when urgent signs are present.

---

## Status

**Experimental / under active development.**

Current work includes:

* refining the Akinator-style effect-profile model;
* modeling mixed/uncertain states;
* reducing direct substance-category questions;
* validating grounding eligibility;
* refining friend-arrival commitments;
* expanding deterministic simulation coverage;
* clinical review of P0/P1 rules and card copy;
* testing low-end Android and iOS PWA behavior.

Do not treat the current development build as a medical device or finished emergency product.

---

## Project

SOS Apollo is part of **Apollo::rio**, an independent platform around electronic music, nightlife, events, people and culture in Rio de Janeiro.

The harm-control project exists because nightlife technology should not only help people find where to go.

It can also help them **come back safely when the night becomes too much.**

---

## Repository

```text
github.com/apollorio/sos
```

Production target:

```text
https://sos.apollo.rio.br
```

---

## Development philosophy

Keep the brain small.

Keep the state rich.

Keep the interface calm.

Keep safety deterministic.

And whenever possible:

> **get the person back to the world around them — not deeper into the app.**
