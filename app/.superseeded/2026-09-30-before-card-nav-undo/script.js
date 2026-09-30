/*
  SOS Apollo v2.0  Luxury Mobile Harm Control
  001-design "Abraço" layer (2026-09-23): calm accents, halo via one CSS var,
  one-voice-at-a-time sheet, breath-paced node transitions, resume choice,
  focus mode (fullscreen + wake lock), reduced-motion gate. Flow logic,
  risk model and all clinical copy are untouched.
  JSON-driven flows · works on file:// and HTTP
  All text pt-BR.
*/

(() => {
  const SOS = window.SOS = {};
  const TARGET_VOLUME = 0.85;
  const FADE_DURATION = 12;

  /** Clinical 4-2-6 · 12s orb loop */
  const BREATH_PATTERN = Object.freeze({
    inhale: 4,
    hold: 2,
    exhale: 6
  });
  const BREATH_CYCLE_SEC = BREATH_PATTERN.inhale + BREATH_PATTERN.hold + BREATH_PATTERN.exhale;
  const BREATH_ORB_DELAY_SEC = 2.8;
  const BREATHE_TEXT_FADE_SEC = 1;

  /** Zero velocity at 0 and 1  soft landing at min/max scale (no wall kick). */
  function easeBreathCushion(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  const BREATH_PATTERNS = {
    '4-6': [
      { id: 'inhale', label: 'inspira', sec: 4 },
      { id: 'hold', label: 'segure', sec: 2 },
      { id: 'exhale', label: 'expira', sec: 6 }
    ],
    '4-2-6': [
      { id: 'inhale', label: 'inspira', sec: 4 },
      { id: 'hold', label: 'segure', sec: 2 },
      { id: 'exhale', label: 'expira', sec: 6 }
    ],
    'box-4': [
      { id: 'inhale', label: 'inspira', sec: 4 },
      { id: 'hold', label: 'segura', sec: 4 },
      { id: 'exhale', label: 'expira', sec: 4 },
      { id: 'hold2', label: 'segure', sec: 4 }
    ]
  };

  /* ── 001-design: calm layer ── */
  const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /** Neon accents from the data map to the muted "abraço" hues at render time (data untouched). */
  const CALM_ACCENT = {
    '#ff00ff': 'var(--c-magenta)', '#f0f': 'var(--c-magenta)',
    '#00ffff': 'var(--c-cyan)', '#0ff': 'var(--c-cyan)',
    '#a855f7': 'var(--c-purple)', '#3b82f6': 'var(--c-blue)',
    '#34d399': 'var(--c-success)', '#ef4444': 'var(--c-red)'
  };
  function calmAccent(c) {
    if (!c) return '';
    return CALM_ACCENT[String(c).trim().toLowerCase()] || c;
  }
  /** One motion vocabulary (mirrors --m-* / --e-calm in style.css). */
  const MOTION = { out: 0.32, in: 0.62, sheetIn: 0.82, sheetOut: 0.62, ease: 'expo.out', easeIn: 'power2.in' };
  let nodeTransitioning = false;
  let lastFocusBeforeSheet = null;
  let wakeLock = null;
  let wakeWanted = false;
  let dndTipShown = false;

  let data = null;
  const orb = document.getElementById('orb');
  const orbStage = document.getElementById('orb-stage');
  const orbAura = document.getElementById('orb-aura');
  const orbRim = document.getElementById('orb-rim');
  const breatheTxt = document.getElementById('breathe-txt');
  const breatheSub = document.getElementById('breathe-sub');
  const header = document.getElementById('ui-header');
  const optionsZone = document.getElementById('ui-options');
  const overlay = document.getElementById('overlay');
  const infoBox = document.getElementById('info-box');
  const nodeArea = document.getElementById('node-area');
  const progressFill = document.getElementById('progress-fill');
  const flowIndicator = document.getElementById('flow-indicator');
  const audioEl = document.getElementById('relaxAudio');
  const iconAudioPlay = document.getElementById('icon-audio-play');
  const iconAudioPause = document.getElementById('icon-audio-pause');
  const iconZen = document.getElementById('icon-zen');
  const btnZen = document.getElementById('btn-zen');
  const btnAudio = document.getElementById('btn-audio') || document.getElementById('legacy-btn-audio');
  const cardNav = document.getElementById('cardNav');
  const burger = document.getElementById('burger');
  const navContent = document.getElementById('navContent');
  const fontDown = document.getElementById('font-down');
  const fontReset = document.getElementById('font-reset');
  const fontUp = document.getElementById('font-up');
  const toastEl = document.getElementById('warm-toast');

  let isZen = false;
  let audioPlaying = false;
  let audioUnlocked = false;
  let volumeFadeTween = null;
  let pauseFadeTween = null;
  let audioIconState = false;
  let audioIconTween = null;
  let currentFlowKey = null;
  let currentFlow = null;
  let taskDone = {};
  let breatheTl = null;
  let orbActive = true;
  let currentNodeId = null;
  let flowLocked = false;
  let sequentialStep = {};
  let breathGuideTimer = null;

  const RISK_ORDER = ['IDLE', 'LOW', 'MODERATE', 'HIGH', 'EMERGENT'];
  const STORAGE_RISK = 'sos_risk';
  const STORAGE_PROGRESS = 'sos_flow_progress';
  const CHOICE_DEBOUNCE_MS = 800;
  let sessionRisk = 'IDLE';
  let lastChoiceAt = 0;

  const FLOW_LABELS = {
    torto: 'Bateu forte',
    panico: 'Pânico',
    realidade: 'Onde eu tô?',
    trava: 'Paranoia',
    falar: 'Solidão',
    samu: 'Resgate',
    cssrs: 'Triagem'
  };

  const SUB_LABELS = {
    torto: 'Usei algo',
    panico: 'Ansiedade',
    realidade: 'Irrealidade',
    trava: 'Muito medo',
    falar: 'Desespero',
    samu: 'Urgência'
  };

  const FLOW_SVG_ICONS = {
    panico: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M 18.799 8.963 L 21.05 12.502 C 21.198 12.735 21.168 13.083 20.825 13.23 L 18.865 14.07 L 18.865 16.999 C 18.865 18.103 17.97 18.999 16.865 18.999 L 14.866 18.999 L 14.865 21.999 L 5.865 21.999 L 5.866 18.305 C 5.866 17.124 5.429 16.007 4.621 15 C 3.523 13.63 2.865 11.891 2.865 9.999 C 2.865 5.643 6.345 2.102 10.676 2.001 L 6.332 8.276 L 10.269 8.276 L 10.269 13.339 L 15.332 6.026 L 11.394 6.026 L 11.394 2.016 C 15.221 2.266 18.313 5.205 18.799 8.963 Z"></path></svg>',
    samu: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M 10.064 9.142 L 12.314 9.142 L 12.314 10.642 L 10.064 10.642 L 10.064 12.892 L 8.564 12.892 L 8.564 10.642 L 6.314 10.642 L 6.314 9.142 L 8.564 9.142 L 8.564 6.892 L 10.064 6.892 Z M 8.965 17 C 8.722 18.696 7.263 20 5.5 20 C 3.737 20 2.278 18.696 2.036 17 L 1 17 L 1 5 C 1 4.448 1.448 4 2 4 L 16 4 C 16.552 4 17 4.448 17 5 L 17 7 L 20 7 L 23 11.056 L 23 17 L 20.965 17 C 20.722 18.696 19.263 20 17.5 20 C 15.737 20 14.278 18.696 14.036 17 Z M 15 6 L 3 6 L 3 14.05 C 3.635 13.402 4.521 13 5.5 13 C 6.896 13 8.102 13.817 8.663 15 L 14.337 15 C 14.505 14.647 14.73 14.326 15 14.05 Z M 17 12 L 21 12 L 21 11.715 L 18.992 9 L 17 9 Z M 17.5 18 C 18.153 18 18.709 17.582 18.915 17 C 18.97 16.843 19 16.675 19 16.5 C 19 15.671 18.329 15 17.5 15 C 16.672 15 16 15.671 16 16.5 C 16 16.675 16.03 16.843 16.086 17 C 16.291 17.582 16.847 18 17.5 18 Z M 7 16.5 C 7 15.671 6.329 15 5.5 15 C 4.672 15 4 15.671 4 16.5 C 4 16.675 4.03 16.843 4.086 17 C 4.291 17.582 4.847 18 5.5 18 C 6.153 18 6.709 17.582 6.915 17 C 6.97 16.843 7 16.675 7 16.5 Z"></path></svg>',
    falar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C17.5228 2 22 6.47715 22 12C22 13.6169 21.6162 15.1442 20.9348 16.4958C20.8633 16.2175 20.7307 15.9523 20.5374 15.7206L20.4142 15.5858L19 14.1716L17.5858 15.5858L17.469 15.713C16.8069 16.4988 16.8458 17.6743 17.5858 18.4142C18.014 18.8424 18.588 19.0358 19.148 18.9946C17.3323 20.8487 14.8006 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 15C10.6199 15 9.37036 15.5592 8.46564 16.4633L8.30009 16.6368L9.24506 17.4961C10.035 17.1825 10.982 17 12 17C12.9049 17 13.7537 17.1442 14.4859 17.3965L14.7549 17.4961L15.6999 16.6368C14.7853 15.6312 13.4664 15 12 15ZM8.5 10C7.67157 10 7 10.6716 7 11.5C7 12.3284 7.67157 13 8.5 13C9.32843 13 10 12.3284 10 11.5C10 10.6716 9.32843 10 8.5 10ZM15.5 10C14.6716 10 14 10.6716 14 11.5C14 12.3284 14.6716 13 15.5 13C16.3284 13 17 12.3284 17 11.5C17 10.6716 16.3284 10 15.5 10Z"></path></svg>'
  };

  const FAST_LANE = {
    torto: 'fast_stim',
    panico: 'fast_panic',
    realidade: 'fast_realidade',
    trava: 'fast_trava',
    falar: 'fast_ground'
  };
  const MEDIA_TARGET_VOLUME = 0.85;
  const MEDIA_PLAY_DELAY_SEC = 0.8;
  const MEDIA_VOL_FADE_SEC = 1.5;

  function plogAudio(message, data, hypothesisId) {
    // No-op: local debug telemetry fetch removed (audit C3).
  }

  function audioSnapshot() {
    if (!audioEl) return {};
    return {
      paused: audioEl.paused,
      volume: Math.round(audioEl.volume * 1000) / 1000,
      muted: audioEl.muted,
      audioShape: btnAudio ? btnAudio.classList.contains('is-playing') ? 'pause' : 'play' : null,
      ariaPressed: btnAudio ? btnAudio.getAttribute('aria-pressed') : null
    };
  }

  const TASK_PLAY_ICON = '<svg class="play-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>';
  const TASK_CHECK_ICON = '<svg class="check-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.999 15.171 19.192 5.978 20.606 7.392 9.999 17.999 3.636 11.636 5.05 10.222z"/></svg>';

  const BREATHE_PHRASES = [
    '<quick>Comigo,</quick><br>o ar pode entrar',
    '<quick>No seu tempo,</quick><br>inspire suave',
    'O ar entra,<br>pelo nariz',
    'O peito pode<br>abrir devagar',
    '<quick>Com calma,</quick><br>até onde der',
    '<quick>Agora,</quick><br>um instante de pausa',
    'Fique no seu<br>silêncio',
    '<quick>Tudo bem,</quick><br>agora solte',
    'Pela boca,<br>sem forçar',
    'O peso pode<br>ir embora',
    '<quick>Tá tudo bem</quick><br>ir devagar',
    '<quick>Lembra,</quick><br>estou aqui com você',
    'Ninguém tá<br>te apressando',
    '<quick>Se quiser,</quick><br>mais uma vez?',
    'Inspire fundo,<br>com carinho',
    'O ar fresco<br>te preenchendo',
    '<quick>Só mais</quick><br>um tiquinho',
    '<quick>Pausa.</quick><br>sinta o corpo',
    'Solte o que<br>tá pesando',
    '<quick>Agora,</quick><br>relaxe os ombros',
    '<quick>Isso,</quick><br>exatamente assim',
    'A calma pode<br>chegar devagar',
    '<quick>Olha só,</quick><br>você tá indo bem',
    'Segure leve,<br>é seguro',
    '<quick>Agora,</quick><br>deixe fluir',
    'A tensão pode<br>se liberar',
    'Esse momento<br>é só seu',
    'Inspire de novo,<br>se couber',
    'O peito pode<br>se encher de ar',
    '<quick>Isso,</quick><br>segure de leve',
    'Solte como um<br>suspiro',
    'O pé no chão<br>te apoiando',
    'Algo em você<br>vai se aquietando',
    '<quick>Confia,</quick><br>tá tudo bem',
    'O ar limpo<br>pra dentro',
    '<quick>Respire,</quick><br>no seu ritmo',
    '<quick>Calma,</quick><br>você não tá sozinho',
    'A onda passa,<br>estou aqui',
    '<quick>Agora,</quick><br>libere o que der',
    'A mente pode<br>esvaziar um pouco',
    'Sua base<br>continua firme',
    'O resto pode<br>esperar um pouco',
    'A vida volta<br>pra dentro',
    'Fique aqui no agora<br>comigo',
    'Essa pausa<br>pode ser suave',
    '<quick>Devagar,</quick><br>solte e alivie',
    'O mais difícil<br>já passou',
    'Nossa última,<br>com carinho',
    'Segure bem,<br>sinta a paz',
    'Pode soltar e<br>relaxar',
    '<quick>Muito bem,</quick><br>inspire de novo',
    'Bem devagar,<br>sem pressa',
    'O ar entra<br>pelo nariz',
    'O peito vai<br>se enchendo',
    '<quick>Sinta,</quick><br>até onde der',
    '<quick>Pronto,</quick><br>segure aí',
    '<quick>Fique assim,</quick><br>só um instante',
    '<quick>Quando der,</quick><br>agora solte',
    '<quick>Suave,</quick><br>pela boca',
    'Bem leve,<br>como o vento',
    'Sem pressa<br>de acabar',
    '<quick>Isso,</quick><br>deixe o ar sair',
    'Estou aqui com você,<br>sempre',
    '<quick>Se quiser,</quick><br>tudo de novo',
    'Inspire fundo,<br>cresça',
    'O ar<br>entrando',
    '<quick>Mais um pouco,</quick><br>enche mais',
    'Pausa rápida,<br>foca aqui',
    '<quick>E pronto,</quick><br>solte tudo',
    'Relaxe os ombros<br>agora',
    '<quick>Perfeito,</quick><br>é bem assim',
    'Inspire calma,<br>sinta',
    '<quick>Isso aí,</quick><br>continue assim',
    'Segure leve,<br>estou vendo',
    '<quick>Agora,</quick><br>deixe fluir',
    '<quick>Devagar,</quick><br>solte o peso',
    'O agora é seguro<br>pra você',
    'Mais uma inspiração,<br>se couber',
    'O pulmão<br>se enchendo',
    '<quick>Isso,</quick><br>uma segurada',
    'Solte devagarzinho,<br>paz',
    'Pé no chão,<br>tá firme',
    'Algo mais calmo<br>agora',
    '<quick>Ei,</quick><br>tá tudo bem',
    'O ar limpinho<br>entrando',
    'No seu ritmo,<br>livre',
    '<quick>Lembra,</quick><br>você não tá sozinho',
    '<quick>A onda passa,</quick><br>já passa',
    '<quick>Respire,</quick><br>e libere',
    'A mente pode<br>esvaziar',
    'Sua base<br>aqui',
    '<quick>Quando der,</quick><br>só respire',
    'O ar<br>pra dentro',
    '<quick>Comigo,</quick><br>fique aqui',
    'A pausa,<br>leve',
    '<quick>Pronto,</quick><br>solte de vez',
    'O pior já passou,<br>juro',
    '<quick>Atenção,</quick><br>última vez',
    'Segure bem,<br>você pode',
    '<quick>Acabou,</quick><br>pode soltar'
  ];

  let breathePhraseDeck = [];
  let lastBreathePhraseRaw = null;
  let breathePhrasePools = { inhale: [], hold: [], exhale: [] };
  let breathePoolIndex = { inhale: 0, hold: 0, exhale: 0 };
  let breathGuideRaf = null;
  let breatheTxtTween = null;
  let breathePhraseShownAt = 0;
  let orbGlowHooked = false;
  let orbGlowLogAt = 0;

  /** Halo breathes with the orb: 0 at exhale-rest, 1 at full inhale.
      style.css turns --orb-halo into a soft candle/lavender bloom. */
  let lastHalo = -1;
  function applyOrbChromaGlow(scale) {
    if (!orbStage) return;
    const { min, max } = getOrbScales();
    const t = Math.max(0, Math.min(1, (scale - min) / (max - min)));
    const q = Math.round(t * 100) / 100;
    if (q === lastHalo) return;
    lastHalo = q;
    orbStage.style.setProperty('--orb-halo', String(q));
  }

  function syncOrbVisuals() {
    const scale = readOrbScale();
    if (scale != null) applyOrbChromaGlow(scale);
  }

  function hookOrbGlowTicker() {
    if (orbGlowHooked || typeof gsap === 'undefined') return;
    orbGlowHooked = true;
    gsap.ticker.add(syncOrbVisuals);
  }

  function classifyBreathePhrase(raw) {
    const text = String(raw || '').toLowerCase();
    if (/(segure|segura|pausa|silêncio|silencio|firme|seguro|espera|fica no|fique no|só mais|so mais|sente o corpo)/.test(text)) return 'hold';
    if (/(solte|solta|expira|boca|fluir|relaxe|relaxa|libera|peso|deixa|deixe|suspiro|acabou|sem forçar|sem forcar|ir embora)/.test(text)) return 'exhale';
    return 'inhale';
  }

  function buildBreathePhrasePools() {
    const pools = { inhale: [], hold: [], exhale: [] };
    BREATHE_PHRASES.forEach(raw => {
      pools[classifyBreathePhrase(raw)].push(raw);
    });
    ['inhale', 'hold', 'exhale'].forEach(key => {
      if (!pools[key].length) pools[key] = BREATHE_PHRASES.slice();
    });
    breathePhrasePools = pools;
    breathePoolIndex = { inhale: 0, hold: 0, exhale: 0 };
  }

  function nextBreathePhraseForPhase(phaseId) {
    const pool = breathePhrasePools[phaseId] || breathePhrasePools.inhale;
    const idx = breathePoolIndex[phaseId] || 0;
    const raw = pool[idx % pool.length];
    breathePoolIndex[phaseId] = (idx + 1) % pool.length;
    lastBreathePhraseRaw = raw;
    return raw;
  }

  function resolveBreathPattern(patternKey) {
    return (BREATH_PATTERNS[patternKey] || BREATH_PATTERNS['4-6']).map(p => ({ ...p }));
  }

  function syncBreathCssVars() {
    const root = document.documentElement;
    const inhalePct = (BREATH_PATTERN.inhale / BREATH_CYCLE_SEC) * 100;
    const holdEndPct = ((BREATH_PATTERN.inhale + BREATH_PATTERN.hold) / BREATH_CYCLE_SEC) * 100;
    root.style.setProperty('--orb-breathe-dur', `${BREATH_CYCLE_SEC}s`);
    root.style.setProperty('--orb-breathe-delay', `${BREATH_ORB_DELAY_SEC}s`);
    root.style.setProperty('--breath-inhale-pct', `${inhalePct}%`);
    root.style.setProperty('--breath-hold-end-pct', `${holdEndPct}%`);
  }

  function getOrbScales() {
    const root = getComputedStyle(document.documentElement);
    const min = parseFloat(root.getPropertyValue('--orb-scale-min')) || 0.68;
    const max = parseFloat(root.getPropertyValue('--orb-scale-max')) || 1.06;
    return { min, max };
  }

  function setOrbBreathPhase(phaseId) {
    if (!orb) return;
    orb.dataset.breath = phaseId;
  }

  function fadeOutBreatheText() {
    if (!breatheTxt || typeof gsap === 'undefined') return;
    if (breatheTxtTween) breatheTxtTween.kill();
    breatheTxtTween = gsap.to(breatheTxt, {
      opacity: 0,
      duration: BREATHE_TEXT_FADE_SEC,
      ease: 'power2.inOut'
    });
  }

  function showBreatheTextForPhase(phaseId) {
    const raw = nextBreathePhraseForPhase(phaseId);
    const parsed = parseBreathePhrase(raw);
    if (!breatheTxt || typeof gsap === 'undefined') return;
    if (breatheTxtTween) breatheTxtTween.kill();
    breatheTxt.innerHTML = renderBreathePhraseHtml(parsed);
    gsap.set(breatheTxt, { opacity: 0 });
    breatheTxtTween = gsap.to(breatheTxt, {
      opacity: 0.78,
      duration: BREATHE_TEXT_FADE_SEC,
      ease: 'power2.out',
      onComplete: () => { breathePhraseShownAt = performance.now(); }
    });
  }

  function readOrbScale() {
    const scaleEl = orbStage || orb;
    if (!scaleEl || typeof gsap === 'undefined') return null;
    const g = gsap.getProperty(scaleEl, 'scale');
    if (typeof g === 'number' && g > 0) return Math.round(g * 1000) / 1000;
    const m = getComputedStyle(scaleEl).transform;
    if (!m || m === 'none') return null;
    const parts = m.match(/matrix\(([^)]+)\)/);
    if (!parts) return null;
    const v = parts[1].split(',').map(s => parseFloat(s.trim()));
    if (v.length >= 1) return Math.round(v[0] * 1000) / 1000;
    return null;
  }

  /** Parse <quick> + <br> breath phrase syntax */
  function parseBreathePhrase(raw) {
    if (!raw || typeof raw !== 'string') {
      return { quick: null, lines: [''], plain: '' };
    }
    let quick = null;
    let rest = raw;
    const quickMatch = raw.match(/<quick>([\s\S]*?)<\/quick>/i);
    if (quickMatch) {
      quick = quickMatch[1].trim();
      rest = raw.slice(0, quickMatch.index) + raw.slice(quickMatch.index + quickMatch[0].length);
    }
    rest = rest.replace(/<br\s*\/?>/gi, '\n').replace(/^\s+|\s+$/g, '');
    const lines = rest.split('\n').map(l => l.trim()).filter(Boolean);
    const plain = [quick, ...lines].filter(Boolean).join(' ');
    return { quick, lines, plain };
  }

  function escBreatheHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderBreathePhraseHtml(parsed) {
    const parts = [];
    if (parsed.quick) {
      parts.push(`<span class="breathe-quick">${escBreatheHtml(parsed.quick)}</span>`);
    }
    if (parsed.lines.length) {
      parts.push(`<span class="breathe-main">${parsed.lines.map(escBreatheHtml).join('<br>')}</span>`);
    }
    return parts.join('<br>');
  }

  function shuffleBreatheDeck() {
    breathePhraseDeck = BREATHE_PHRASES.slice();
    for (let i = breathePhraseDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [breathePhraseDeck[i], breathePhraseDeck[j]] = [breathePhraseDeck[j], breathePhraseDeck[i]];
    }
    if (
      breathePhraseDeck.length > 1 &&
      lastBreathePhraseRaw &&
      breathePhraseDeck[0] === lastBreathePhraseRaw
    ) {
      [breathePhraseDeck[0], breathePhraseDeck[1]] = [breathePhraseDeck[1], breathePhraseDeck[0]];
    }
  }

  function nextBreathePhraseRaw() {
    if (!breathePhraseDeck.length) shuffleBreatheDeck();
    const raw = breathePhraseDeck.shift();
    lastBreathePhraseRaw = raw;
    return raw;
  }

  function riskIndex(level) {
    const i = RISK_ORDER.indexOf(level);
    return i >= 0 ? i : 0;
  }

  function registerRisk(level) {
    if (!level || !RISK_ORDER.includes(level)) return;
    if (riskIndex(level) > riskIndex(sessionRisk)) {
      sessionRisk = level;
      try { sessionStorage.setItem(STORAGE_RISK, sessionRisk); } catch (_) {}
      updateCrisisBarVisibility();
    }
  }

  function loadPersistedState() {
    try {
      const r = sessionStorage.getItem(STORAGE_RISK);
      if (r && RISK_ORDER.includes(r)) sessionRisk = r;
    } catch (_) {}
  }

  // Same retention as the engine (registry storage.retentionHours = 12): the saved node + risk level is
  // health context and must not sit on the device indefinitely. Old entries without savedAt are dropped too.
  const PROGRESS_TTL_MS = 12 * 60 * 60 * 1000;

  function saveFlowProgress() {
    if (!currentFlowKey || !currentNodeId) return;
    try {
      localStorage.setItem(STORAGE_PROGRESS, JSON.stringify({
        flowKey: currentFlowKey,
        nodeId: currentNodeId,
        taskDone: Object.fromEntries(
          Object.entries(taskDone).map(([k, v]) => [k, [...v]])
        ),
        risk: sessionRisk,
        savedAt: Date.now()
      }));
    } catch (_) {}
  }

  function restoreFlowProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_PROGRESS);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.savedAt !== 'number' || Date.now() - saved.savedAt > PROGRESS_TTL_MS) {
        localStorage.removeItem(STORAGE_PROGRESS);
        return null;
      }
      return saved;
    } catch (_) {
      return null;
    }
  }

  function encodeSmsBody(str) {
    return encodeURIComponent(str || '').replace(/%20/g, '%20');
  }

  function buildWhatsAppHref(templateKey) {
    const templates = data && data.resources && data.resources.whatsapp;
    const text = (templates && templates[templateKey]) || '';
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  function encodeSmsHref(body) {
    return `sms:?body=${encodeSmsBody(body)}`;
  }

  /* ── BOOT: critical UI always runs ── */
  function ensureOrbBoot(attempt) {
    const n = attempt || 0;
    if (typeof gsap === 'undefined') {
      /* The iframe has its own gentle CSS breathing loop. Bind the pause
         control immediately so the offline shell is still fully usable. */
      if (n === 0) setupOrb();
      if (n < 60) return setTimeout(() => ensureOrbBoot(n + 1), 100);
      return;
    }
    setupOrb();
  }

  function boot() {
    loadPersistedState();
    syncBreathCssVars();
    buildBreathePhrasePools();
    if (window.SOS_DATA && window.SOS_DATA.torto) {
      data = window.SOS_DATA;
      enhanceOptionsFromData();
    }
    bindStaticOptions();
    setupAudio();
    setupZen();
    setupCardNav();
    setupFontSizeControls();
    setupOverlayClose();
    showWelcomeToast();
    loadData();
    ensureOrbBoot(0);
  }

  async function loadData() {
    if (data) return;
    const sources = [
      () => fetch('../data.json').then(r => { if (!r.ok) throw r; return r.json(); }),
      () => fetch('./data.json').then(r => { if (!r.ok) throw r; return r.json(); }),
      () => Promise.resolve(window.SOS_DATA)
    ];

    for (const src of sources) {
      try {
        const result = await src();
        if (result && typeof result === 'object' && result.torto) {
          data = result;
          enhanceOptionsFromData();
          return;
        }
      } catch (_) { /* try next */ }
    }
    showToast('fluxos offline  recarrega se precisar', 2400);
  }

  function bindStaticOptions() {
    optionsZone.querySelectorAll('[data-flow]').forEach(box => {
      box.addEventListener('click', () => startFlow(box.dataset.flow));
      box.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        startFlow(box.dataset.flow);
      });
    });
  }

  function setOptionIcon(iconWrap, key, accent) {
    if (!iconWrap) return;
    const svg = FLOW_SVG_ICONS[key];
    if (svg) {
      iconWrap.innerHTML = svg;
      const svgEl = iconWrap.querySelector('svg');
      /* tile hue comes from style.css ([data-flow] → --tile-hue) */
      return;
    }
    const cls = (data[key] && data[key].meta && data[key].meta.icon) || '';
    iconWrap.innerHTML = `<i class="${cls}" aria-hidden="true"></i>`;
  }

  function enhanceOptionsFromData() {
    if (!data) return;
    const order = ['torto', 'panico', 'realidade', 'trava', 'falar', 'samu'];
    order.forEach(key => {
      const f = data[key];
      if (!f || !f.meta) return;
      const box = optionsZone.querySelector(`[data-flow="${key}"]`);
      if (!box) return;
      const iconWrap = box.querySelector('.opt-icon');
      const titleEl = box.querySelector('.opt-title');
      const subEl = box.querySelector('.opt-sub');
      setOptionIcon(iconWrap, key, f.meta.accent || '');
      if (titleEl) titleEl.textContent = FLOW_LABELS[key] || f.meta.label;
      if (subEl) subEl.textContent = SUB_LABELS[key] || '';
    });
  }

  function ambientMedia() {
    return audioEl;
  }

  function killAudioVolumeTweens() {
    if (volumeFadeTween) {
      volumeFadeTween.kill();
      volumeFadeTween = null;
    }
    if (pauseFadeTween) {
      pauseFadeTween.kill();
      pauseFadeTween = null;
    }
    if (typeof gsap !== 'undefined' && audioEl) {
      gsap.killTweensOf(audioEl, 'volume');
    }
  }

  function pauseAmbientAudio() {
    if (!audioEl) return;
    audioPlaying = false;
    setAudioIconState(false);
    killAudioVolumeTweens();
    plogAudio('pauseAmbient-start', { runId: 'post-fix', ...audioSnapshot() }, 'E');
    if (typeof gsap === 'undefined') {
      audioEl.volume = 0;
      audioEl.pause();
      return;
    }
    pauseFadeTween = gsap.to(audioEl, {
      volume: 0,
      duration: 2.2,
      ease: 'power1.inOut',
      onComplete: () => {
        audioEl.pause();
        pauseFadeTween = null;
        plogAudio('pauseAmbient-done', { runId: 'post-fix', ...audioSnapshot() }, 'E');
      }
    });
  }

  /* ── AMBIENT AUDIO: clocks.flac only · gesture · slow fade 0→85% ── */
  function setupAudio() {
    if (!audioEl) return;

    audioEl.loop = true;
    audioEl.volume = 0;
    audioEl.muted = false;

    audioEl.addEventListener('volumechange', () => {
      if (!audioUnlocked && audioEl.volume > 0.001) audioEl.volume = 0;
    });
    audioEl.addEventListener('play', () => setAudioIconState(true));
    audioEl.addEventListener('pause', () => {
      if (!audioPlaying) setAudioIconState(false);
    });

    if (btnAudio) btnAudio.addEventListener('click', e => {
      e.stopPropagation();
      SOS.toggleAudio();
    });

    document.body.addEventListener('pointerdown', () => acquireWake(), { once: true, passive: true });
    const unlock = () => startAmbientAudio(true);
    document.body.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.body.addEventListener('touchstart', unlock, { once: true, passive: true });

    const orbZone = document.getElementById('orb-zone');
    if (orbZone) {
      orbZone.addEventListener('click', () => {
        if (!audioUnlocked) startAmbientAudio(true);
      });
    }

    setAudioIconState(false);
  }

  function startAmbientAudio(fromGesture) {
    if (!audioEl) return;
    const snap = audioSnapshot();
    const earlyReturn = audioUnlocked && audioPlaying && !audioEl.paused && audioEl.volume >= TARGET_VOLUME * 0.85;
    plogAudio('startAmbientAudio', { fromGesture, earlyReturn, runId: 'post-fix', ...snap }, 'A');
    if (earlyReturn) return;

    audioUnlocked = true;
    killAudioVolumeTweens();

    audioEl.muted = false;

    const beginFade = () => {
      audioPlaying = true;
      setAudioIconState(true);
      audioEl.volume = 0;
      plogAudio('beginFade', audioSnapshot(), 'C');
      if (typeof gsap !== 'undefined') {
        volumeFadeTween = gsap.to(audioEl, {
          volume: TARGET_VOLUME,
          duration: FADE_DURATION,
          ease: 'power1.inOut',
          onComplete: () => { volumeFadeTween = null; }
        });
      } else {
        const steps = 60;
        const stepVol = TARGET_VOLUME / steps;
        let n = 0;
        const iv = setInterval(() => {
          n++;
          audioEl.volume = Math.min(TARGET_VOLUME, stepVol * n);
          if (n >= steps) clearInterval(iv);
        }, (FADE_DURATION * 1000) / steps);
      }
    };

    if (audioEl.paused) {
      audioEl.play().then(() => {
        plogAudio('play-resolved', audioSnapshot(), 'C');
        beginFade();
      }).catch(err => {
        plogAudio('play-rejected', { err: String(err && err.message), ...audioSnapshot() }, 'C');
        if (fromGesture) showToast('não consegui tocar o som. tenta de novo.', 2000);
      });
    } else {
      plogAudio('already-playing', audioSnapshot(), 'C');
      beginFade();
    }
  }

  function setAudioIconState(playing) {
    if (!btnAudio) return;
    if (audioIconState === playing && !audioIconTween) {
      plogAudio('setAudioIconState-skipped', { playing, ...audioSnapshot() }, 'D');
      return;
    }

    plogAudio('setAudioIconState', { playing, ...audioSnapshot() }, 'D');

    audioIconState = playing;
    btnAudio.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btnAudio.setAttribute('aria-label', playing ? 'Pausar som ambiente' : 'Tocar som ambiente');

    if (audioIconTween) audioIconTween.kill();

    btnAudio.classList.toggle('is-playing', playing);
    /* The two bars are the compact menu mark from the design system. Their
       geometry changes into a quiet X while audio is on. The page toolbar
       uses the original play/pause glyph pair instead. */
    if (typeof gsap === 'undefined') return;
    const bars = btnAudio.querySelectorAll('.audio-bar');
    if (bars.length) {
      if (audioIconTween) audioIconTween.kill();
      audioIconTween = gsap.timeline({
        defaults: { duration: 0.35, ease: 'sine.inOut' },
        onComplete: () => { audioIconTween = null; }
      });
      audioIconTween.to(bars[0], { width: 20, y: playing ? 3.75 : 0, rotate: playing ? 45 : 0 }, 0)
        .to(bars[1], { width: playing ? 20 : 12, y: playing ? -3.75 : 0, rotate: playing ? -45 : 0 }, 0);
      return;
    }
    if (!iconAudioPlay || !iconAudioPause) return;
    if (audioIconTween) audioIconTween.kill();
    const outEl = playing ? iconAudioPlay : iconAudioPause;
    const inEl = playing ? iconAudioPause : iconAudioPlay;
    audioIconTween = gsap.timeline({
      defaults: { duration: 0.35, ease: 'sine.inOut' },
      onComplete: () => { audioIconTween = null; }
    });
    audioIconTween.to(outEl, { opacity: 0, scale: 0.88 }, 0)
      .fromTo(inEl, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1 }, 0.08);
  }

  SOS.toggleAudio = () => {
    if (!ambientMedia()) return;
    const resumeBranch = !audioUnlocked || !audioPlaying;
    plogAudio('toggleAudio', { resumeBranch, runId: 'post-fix', ...audioSnapshot() }, 'B');
    if (resumeBranch) {
      startAmbientAudio(true);
      return;
    }
    pauseAmbientAudio();
  };

  /* ── MAGIC BALL: 4-2-6 clock · phase phrases · GSAP orb scale ── */
  function showBreathePhrase(parsed, opts) {
    if (!breatheTxt || typeof gsap === 'undefined') return;
    const phaseSync = opts && opts.phaseSync;
    const html = renderBreathePhraseHtml(parsed);
    const fadeOut = phaseSync ? BREATHE_TEXT_FADE_SEC : 1.25;
    const fadeIn = phaseSync ? BREATHE_TEXT_FADE_SEC : 0.85;

    if (breatheTxtTween) breatheTxtTween.kill();

    breatheTxtTween = gsap.timeline({
      onComplete: () => { breathePhraseShownAt = performance.now(); }
    });

    breatheTxtTween
      .to(breatheTxt, { opacity: 0, duration: fadeOut, ease: 'power2.inOut' })
      .call(() => { breatheTxt.innerHTML = html; })
      .set(breatheTxt, { opacity: 0 })
      .to(breatheTxt, { opacity: 0.78, duration: fadeIn, ease: 'power2.out' });

    if (!phaseSync) {
      breatheTxtTween.call(() => {
        const quickEl = breatheTxt.querySelector('.breathe-quick');
        const mainEl = breatheTxt.querySelector('.breathe-main');
        if (quickEl) {
          gsap.fromTo(quickEl,
            { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }
          );
        }
        if (mainEl) {
          gsap.fromTo(mainEl,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 1.65, delay: quickEl ? 0.22 : 0, ease: 'power2.out' }
          );
        }
      });
    }
  }

  function buildBreatheTimeline() {
    const scales = getOrbScales();
    const min = REDUCE_MOTION ? 0.9 : scales.min;
    const max = REDUCE_MOTION ? 0.9 : scales.max;
    const inh = BREATH_PATTERN.inhale;
    const hold = BREATH_PATTERN.hold;
    const exh = BREATH_PATTERN.exhale;
    const fade = BREATHE_TEXT_FADE_SEC;
    const tInhaleEnd = inh;
    const tHoldEnd = inh + hold;
    const tCycleEnd = inh + hold + exh;

    const scaleTarget = orbStage || orb;
    gsap.killTweensOf(scaleTarget);
    gsap.set(scaleTarget, {
      scale: min,
      transformOrigin: '50% 50%',
      force3D: true
    });
    setOrbBreathPhase('exhale');
    applyOrbChromaGlow(min);

    const tl = gsap.timeline({
      repeat: -1,
      delay: BREATH_ORB_DELAY_SEC,
      paused: false
    });

    tl.call(() => showBreatheTextForPhase('inhale'), null, 0)
      .call(() => fadeOutBreatheText(), null, tHoldEnd - fade)
      .to(scaleTarget, {
        scale: max,
        duration: inh,
        ease: easeBreathCushion,
        onStart: () => setOrbBreathPhase('inhale')
      }, 0)
      .call(() => showBreatheTextForPhase('exhale'), null, tHoldEnd)
      .call(() => fadeOutBreatheText(), null, tCycleEnd - fade)
      .to(scaleTarget, {
        scale: max,
        duration: hold,
        ease: 'none',
        onStart: () => setOrbBreathPhase('hold')
      }, tInhaleEnd)
      .to(scaleTarget, {
        scale: min,
        duration: exh,
        ease: easeBreathCushion,
        onStart: () => setOrbBreathPhase('exhale')
      }, tHoldEnd);

    return tl;
  }

  function orbIsoFrame() {
    if (!orb) return null;
    return orb.tagName === 'IFRAME' ? orb : orb.querySelector('iframe');
  }

  function setIsoFlowPaused(paused) {
    const frame = orbIsoFrame();
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(paused ? 'iso-pause' : 'iso-play', '*');
    } catch (_) {}
  }

  let orbInitialized = false;

  function setupOrb() {
    if (!orb) return;
    if (orbInitialized) return;
    orbInitialized = true;

    syncBreathCssVars();
    buildBreathePhrasePools();
    if (typeof gsap !== 'undefined') {
      breatheTl = buildBreatheTimeline();
      if (breatheTl.paused()) breatheTl.play();
      hookOrbGlowTicker();
    }

    orb.addEventListener('click', e => {
      e.stopPropagation();
      orbActive = !orbActive;
      if (orbActive) {
        orb.classList.remove('paused');
        if (breatheTl) breatheTl.resume();
        setIsoFlowPaused(false);
        breatheSub.textContent = 'respiração ativa';
        orb.setAttribute('aria-pressed', 'false');
        orb.setAttribute('aria-label', 'Pausar a esfera de respiração');
        if (typeof gsap !== 'undefined') gsap.to(breatheSub, { opacity: 0.4, duration: 0.6 });
      } else {
        orb.classList.add('paused');
        if (breatheTl) breatheTl.pause();
        setIsoFlowPaused(true);
        breatheSub.textContent = 'em pausa · toque para retomar';
        orb.setAttribute('aria-pressed', 'true');
        orb.setAttribute('aria-label', 'Retomar a esfera de respiração');
        if (typeof gsap !== 'undefined') gsap.to(breatheSub, { opacity: 0.65, duration: 0.6 });
      }
    });

    setTimeout(() => {
      if (breatheSub && typeof gsap !== 'undefined') gsap.to(breatheSub, { opacity: 0.36, duration: 1.8 });
    }, 4800);
  }

  function setupZen() {
    if (!btnZen) return;
    btnZen.addEventListener('click', () => SOS.toggleZen());
  }

  /* ── CARD NAV: the burger owns navigation, never audio ── */
  function setupCardNav() {
    if (!cardNav || !burger || !navContent) return;
    const cards = Array.from(navContent.querySelectorAll('.nav-card'));
    const BAR = 56;
    let isOpen = false;

    function targetHeight() {
      if (window.matchMedia && window.matchMedia('(max-width:720px)').matches) {
        const previous = navContent.style.cssText;
        navContent.style.cssText = 'visibility:hidden;position:static;height:auto;display:flex;flex-direction:column';
        const height = Math.min(window.innerHeight - 72, BAR + navContent.scrollHeight + 8);
        navContent.style.cssText = previous;
        return Math.max(BAR, height);
      }
      return 260;
    }

    function sync(next) {
      isOpen = !!next;
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      burger.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
      navContent.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function set(next) {
      next = !!next;
      if (next === isOpen) return;
      sync(next);
      const g = typeof gsap !== 'undefined' ? gsap : null;
      if (g) {
        g.killTweensOf([cardNav].concat(cards));
        if (next) {
          cardNav.classList.add('card-nav--open');
          g.to(cardNav, { height: targetHeight(), duration: .52, ease: 'power3.out' });
          g.fromTo(cards, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .46, ease: 'power2.out', stagger: .07, delay: .08 });
        } else {
          g.to(cards, { y: 16, autoAlpha: 0, duration: .2, ease: 'power2.in', stagger: -.04 });
          g.to(cardNav, { height: BAR, duration: .42, ease: 'power3.inOut', delay: .06, onComplete: () => { if (!isOpen) cardNav.classList.remove('card-nav--open'); } });
        }
        return;
      }
      cardNav.classList.toggle('card-nav--open', next);
      cardNav.style.height = (next ? targetHeight() : BAR) + 'px';
      cards.forEach(card => { card.style.opacity = next ? '1' : '0'; card.style.transform = next ? 'none' : 'translateY(16px)'; });
    }

    burger.addEventListener('click', () => set(!isOpen));
    navContent.addEventListener('click', event => {
      const flowLink = event.target.closest('[data-menu-flow]');
      if (flowLink) {
        event.preventDefault();
        const flowKey = flowLink.getAttribute('data-menu-flow');
        set(false);
        if (flowKey) startFlow(flowKey);
        return;
      }
      if (event.target.closest('a')) set(false);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && isOpen) set(false); });
    document.addEventListener('pointerdown', event => { if (isOpen && !cardNav.contains(event.target)) set(false); });
    window.addEventListener('resize', () => { if (isOpen) cardNav.style.height = targetHeight() + 'px'; });
  }

  function setupFontSizeControls() {
    const root = document.documentElement;
    const buttons = { small: fontDown, normal: fontReset, large: fontUp };
    let current = 'normal';
    try {
      const saved = localStorage.getItem('sos_font_scale');
      if (saved && buttons[saved]) current = saved;
    } catch (_) {}

    function apply(scale) {
      current = scale;
      root.dataset.fontScale = scale;
      Object.entries(buttons).forEach(([key, button]) => { if (button) button.setAttribute('aria-pressed', key === scale ? 'true' : 'false'); });
      try { localStorage.setItem('sos_font_scale', scale); } catch (_) {}
    }
    if (fontDown) fontDown.addEventListener('click', () => apply('small'));
    if (fontReset) fontReset.addEventListener('click', () => apply('normal'));
    if (fontUp) fontUp.addEventListener('click', () => apply('large'));
    apply(current);
  }

  /* Screen Wake Lock — the screen shouldn't sleep mid-breath. Released when
     the tab hides, re-acquired when it returns. Never a permission prompt. */
  async function acquireWake() {
    wakeWanted = true;
    if (!('wakeLock' in navigator) || document.hidden || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (_) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && wakeWanted) acquireWake();
  });

  /* A web page cannot silence the phone's notifications. What it can do:
     go fullscreen (hides the status bar on Android), keep the screen on,
     and gently suggest the phone's own "Não perturbe" once per session.
     This app never asks for notification permission. */
  function enterFocusChrome() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }
    acquireWake();
    if (!dndTipShown) {
      dndTipShown = true;
      setTimeout(() => showToast('dica: o “Não perturbe” do celular silencia as notificações enquanto você está aqui', 2600), 900);
    }
  }
  function exitFocusChrome() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }
  }

  SOS.toggleZen = () => toggleZen();
  function toggleZen() {
    if (flowLocked) {
      showToast('fico por perto  ligue 188 se precisar de voz humana', 2000);
      return;
    }
    isZen = !isZen;
    if (isZen) {
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf([optionsZone, header]);
        gsap.to(optionsZone, { opacity: 0, y: 16, duration: 0.7, ease: 'power2.inOut', onComplete: () => { optionsZone.style.pointerEvents = 'none'; } });
        gsap.to(header, { opacity: 0.42, duration: 0.6 });
      } else {
        optionsZone.style.opacity = '0';
        optionsZone.style.pointerEvents = 'none';
        header.style.opacity = '.42';
      }
      btnZen.classList.add('zen');
      btnZen.setAttribute('aria-pressed', 'true');
      btnZen.setAttribute('aria-label', 'Sair do modo foco');
      iconZen.className = 'ri-eye-line';
      enterFocusChrome();
      if (overlay.style.visibility === 'visible') closeFlow();
    } else {
      optionsZone.style.pointerEvents = 'auto';
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf([optionsZone, header]);
        gsap.to(optionsZone, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' });
        gsap.to(header, { opacity: 1, duration: 0.55 });
      } else {
        optionsZone.style.opacity = '1';
        optionsZone.style.transform = 'none';
        header.style.opacity = '1';
      }
      btnZen.classList.remove('zen');
      btnZen.setAttribute('aria-pressed', 'false');
      btnZen.setAttribute('aria-label', 'Entrar no modo foco');
      iconZen.className = 'ri-eye-off-line';
      exitFocusChrome();
    }
  }

  function setupOverlayClose() {
    const closeBg = document.getElementById('close-bg');
    const sheetClose = document.getElementById('sheet-close');
    if (closeBg) closeBg.addEventListener('click', closeFlow);
    if (sheetClose) sheetClose.addEventListener('click', closeFlow);
  }

  function setHomeQuiet(quiet) {
    document.body.classList.toggle('is-sheet-open', quiet);
    if (breatheTxt) breatheTxt.setAttribute('aria-live', quiet ? 'off' : 'polite');
    /* the orb rests while the sheet speaks, and breathes again on the way back */
    if (breatheTl && orbActive) { if (quiet) breatheTl.pause(); else breatheTl.resume(); }
    if (orbActive) setIsoFlowPaused(quiet);
    [header, optionsZone, document.getElementById('orb-zone'), document.querySelector('.sos-strip')].forEach(el => {
      if (!el) return;
      if (quiet) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }

  function showOverlay() {
    lastFocusBeforeSheet = document.activeElement;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.style.visibility = 'visible';
    setHomeQuiet(true);
    infoBox.scrollTop = 0;
    if (typeof gsap !== 'undefined') gsap.set(nodeArea, { clearProps: 'opacity,transform' });
    if (typeof gsap === 'undefined' || REDUCE_MOTION) {
      overlay.style.opacity = '1';
      infoBox.style.transform = 'translateY(0)';
    } else {
      gsap.to(overlay, { opacity: 1, duration: 0.6, ease: 'sine.out' });
      gsap.fromTo(infoBox, { y: '100%' }, { y: 0, duration: MOTION.sheetIn, ease: MOTION.ease });
    }
    setTimeout(() => {
      const first = nodeArea.querySelector('button, a[href]') || infoBox;
      if (first === infoBox) infoBox.setAttribute('tabindex', '-1');
      try { first.focus({ preventScroll: true }); } catch (_) {}
    }, 420);
  }

  SOS.closeFlow = () => closeFlow();
  function closeFlow() {
    if (flowLocked && riskIndex(sessionRisk) >= riskIndex('EMERGENT')) {
      showToast('recolher  fico por perto.', 2400);
    }
    if (breathGuideTimer) { clearInterval(breathGuideTimer); breathGuideTimer = null; }
    if (breathGuideRaf) { cancelAnimationFrame(breathGuideRaf); breathGuideRaf = null; }
    saveFlowProgress();
    const finish = () => {
        overlay.style.visibility = 'hidden';
        overlay.setAttribute('aria-hidden', 'true');
        nodeArea.innerHTML = '';
        progressFill.style.width = '0%';
        currentFlowKey = null;
        currentNodeId = null;
        flowLocked = false;
        taskDone = {};
        sequentialStep = {};
        nodeTransitioning = false;
        setHomeQuiet(false);
        /* back to the room: focus returns where the person left it */
        try { if (lastFocusBeforeSheet && lastFocusBeforeSheet.focus) lastFocusBeforeSheet.focus({ preventScroll: true }); } catch (_) {}
    };
    if (typeof gsap === 'undefined' || REDUCE_MOTION) {
      infoBox.style.transform = 'translateY(104%)';
      overlay.style.opacity = '0';
      finish();
      return;
    }
    gsap.to(infoBox, { y: '104%', duration: MOTION.sheetOut, ease: 'power2.inOut' });
    gsap.to(overlay, { opacity: 0, duration: MOTION.sheetOut + 0.1, ease: 'sine.inOut', onComplete: finish });
  }

  SOS.startFlow = flowKey => startFlow(flowKey);
  function startFlow(flowKey) {
    if (!data) {
      if (window.SOS_DATA && window.SOS_DATA[flowKey]) data = window.SOS_DATA;
    }
    if (!data || !data[flowKey]) {
      showToast('fluxos carregando  tenta de novo', 1800);
      return;
    }
    if (isZen) toggleZen();
    startAmbientAudio(true);

    const saved = restoreFlowProgress();
    currentFlowKey = flowKey;
    currentFlow = data[flowKey];
    taskDone = {};
    sequentialStep = {};

    const startId = currentFlow.start || Object.keys(currentFlow.nodes)[0];
    if (saved && saved.flowKey === flowKey && saved.nodeId && saved.nodeId !== startId && currentFlow.nodes[saved.nodeId]) {
      renderResumeCard(saved, startId);
    } else {
      renderNode(startId);
    }
    showOverlay();
  }

  /** Resume choice (C9): calm, two options, nothing restored until chosen. */
  function renderResumeCard(saved, startId) {
    const meta = currentFlow.meta || {};
    currentNodeId = null;
    flowIndicator.textContent = FLOW_LABELS[currentFlowKey] || meta.label || 'Apoio';
    progressFill.style.width = '0%';
    nodeArea.innerHTML = renderCrisisBar() + renderFlowHeader({}, meta) + `<div class="resume-card">
      <div class="node-text">Você já esteve aqui antes.\nPode continuar de onde parou ou começar de novo, com calma.</div>
      <button type="button" class="btn-soft primary" data-resume="continue">continuar de onde parei</button>
      <button type="button" class="btn-soft" data-resume="restart">começar do início</button>
    </div>`;
    nodeArea.querySelector('[data-resume="continue"]').addEventListener('click', () => {
      if (saved.taskDone) {
        Object.entries(saved.taskDone).forEach(([nid, ids]) => { taskDone[nid] = new Set(ids); });
      }
      if (saved.risk) registerRisk(saved.risk);
      renderNode(saved.nodeId);
    });
    nodeArea.querySelector('[data-resume="restart"]').addEventListener('click', () => {
      taskDone = {};
      sequentialStep = {};
      try { localStorage.removeItem(STORAGE_PROGRESS); } catch (_) {}
      renderNode(startId);
    });
  }

  function renderFlowHeader(node, meta) {
    const icon = node.flowIcon || meta.icon || 'ri-heart-pulse-line';
    const title = node.flowTitle || meta.label || 'Apoio';
    const accent = calmAccent(node.flowAccent || meta.accent) || 'var(--c-blue)';
    return `<div class="flow-header">
      <i class="${icon}" style="color:${accent}"></i>
      <h2>${title}</h2>
    </div>`;
  }

  function renderExactPhrase(text, accent) {
    if (!text) return '';
    const color = calmAccent(accent) || 'var(--text-soft)';
    return `<div class="exact-phrase" style="border-color:${color}">${formatText(text)}</div>`;
  }

  function renderCrisisBar() {
    const cvv = data && data.resources && data.resources.cvv;
    const cvvTitle = cvv && cvv.short ? cvv.short : 'CVV 188';
    const cvvHint = cvv && cvv.hint ? cvv.hint : 'voz humana · 24h · gratuito';
    return `<div class="crisis-bar" role="navigation" aria-label="Ajuda imediata">
      <a href="tel:188" class="crisis-bar-btn crisis-bar-btn--cvv" title="Centro de Valorização da Vida  apoio emocional por telefone">
        <i class="ri-phone-line"></i>
        <span class="crisis-bar-label"><strong>${escHtml(cvvTitle)}</strong><em>${escHtml(cvvHint)}</em></span>
      </a>
      <a href="tel:192" class="crisis-bar-btn crisis-bar-btn--samu"><i class="ri-heart-pulse-fill"></i><span>SAMU 192</span></a>
    </div>`;
  }

  function mapsHref(address) {
    if (!address) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Rio de Janeiro, RJ')}`;
  }

  function rideHref(address, app) {
    const q = encodeURIComponent(address + ', Rio de Janeiro, RJ');
    if (app === '99') return `https://99app.com/`; 
    return `https://m.uber.com/looking?drop[0]=${q}`;
  }

  function renderCapsList() {
    const caps = data && data.resources && data.resources.caps_rio;
    const intro = data && data.resources && data.resources.caps_intro;
    if (!caps || !caps.length) return '<p class="node-text">Consulte CAPS pelo SUS na sua região.</p>';

    let html = '';
    if (intro) {
      html += `<div class="caps-intro">${formatText(intro)}</div>`;
    }

    const sorted = caps.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    html += '<div class="caps-list">';
    sorted.forEach(c => {
      const addr = c.address || '';
      const maps = c.maps || mapsHref(addr);
      html += `<div class="caps-card${c.featured ? ' caps-card--featured' : ''}">
        ${c.featured ? '<div class="caps-badge">principal · Rio</div>' : ''}
        <div class="caps-name">${escHtml(c.name)}</div>
        <div class="caps-meta">${escHtml(c.area || '')} · ${escHtml(c.hours || '24h')} · SUS gratuito</div>
        <div class="caps-addr">${escHtml(addr)}</div>
        <div class="caps-links">
          ${c.tel ? `<a href="tel:${escHtml(String(c.tel).replace(/\D/g, ''))}" class="caps-tel"><i class="ri-phone-line"></i> ${escHtml(c.tel)}</a>` : ''}
          <a href="${escHtml(maps)}" class="caps-link-btn" target="_blank" rel="noopener noreferrer"><i class="ri-map-pin-line"></i> mapa</a>
          <a href="${escHtml(rideHref(addr, 'uber'))}" class="caps-link-btn caps-link-btn--ride" target="_blank" rel="noopener noreferrer">uber</a>
          <a href="${escHtml(rideHref(addr, '99'))}" class="caps-link-btn caps-link-btn--ride" target="_blank" rel="noopener noreferrer">99</a>
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  function updateCrisisBarVisibility() {
    const bar = nodeArea && nodeArea.querySelector('.crisis-bar');
    if (bar && riskIndex(sessionRisk) >= riskIndex('HIGH')) {
      bar.classList.add('crisis-bar--high');
    }
  }

  function renderEvidenceHint(hint) {
    if (!hint) return '';
    return `<details class="evidence-hint"><summary>por que isso ajuda?</summary><p>${escHtml(hint)}</p></details>`;
  }

  function renderBreathGuideBlock(t, nodeId) {
    const pattern = t.breathPattern || '4-6';
    const cycles = t.breathCycles || 10;
    const done = isTaskDone(nodeId, t.id);
    return `<div class="task-card task-card--breath ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="breath_guide" data-pattern="${escHtml(pattern)}" data-cycles="${cycles}">
      <div class="task-check"><i class="ri-check-line"></i></div>
      <div class="task-content">
        <div class="t-label">${escHtml(t.label)}</div>
        <div class="t-desc">${formatText(t.desc || '')}</div>
        <div class="breath-guide" hidden>
          <div class="breath-phase">preparar</div>
          <div class="breath-counter"></div>
          <div class="breath-cycle">ciclo 0 / ${cycles}</div>
          <button type="button" class="btn-soft primary breath-start">iniciar guia</button>
        </div>
      </div>
    </div>`;
  }

  function renderCrtPauseBlock(t, nodeId) {
    const done = isTaskDone(nodeId, t.id);
    return `<div class="task-card task-card--crt ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="crt_pause">
      <div class="task-check"><i class="ri-check-line"></i></div>
      <div class="task-content">
        <div class="t-label">${escHtml(t.label)}</div>
        <div class="t-desc">${escHtml(t.desc || '')}</div>
        <button type="button" class="btn-soft crt-start" style="margin-top:10px">pausa 10s</button>
        <div class="crt-countdown" hidden>10</div>
      </div>
    </div>`;
  }

  function getVisibleTasks(node, nodeId) {
    const tasks = node.tasks || [];
    if (!node.sequentialTasks) return tasks;
    const step = sequentialStep[nodeId] || 0;
    const pending = tasks.filter(t => !isTaskDone(nodeId, t.id));
    if (!pending.length) return [];
    return [pending[0]];
  }

  function renderTask(t, nodeId, accent) {
    const done = isTaskDone(nodeId, t.id);
    const variant = t.variant || 'default';

    if (variant === 'breath_guide') return renderBreathGuideBlock(t, nodeId);
    if (variant === 'crt_pause') return renderCrtPauseBlock(t, nodeId);

    if (variant === 'contact_pick') {
      const waTpl = t.whatsappTemplate || 'crisis_generic';
      return `<button type="button" class="task-card task-card--action ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="contact_pick" data-wa-template="${escHtml(waTpl)}">
        <div class="task-check task-check--action"><i class="ri-contacts-line"></i></div>
        <div class="task-content">
          <div class="t-label">${escHtml(t.label)}</div>
          <div class="t-desc">${escHtml(t.desc || '')}</div>
        </div>
      </button>`;
    }

    if (variant === 'call' || variant === 'sms') {
      const icon = t.icon || (variant === 'sms' ? 'ri-message-3-fill' : 'ri-phone-line');
      let href = t.href || '';
      if (variant === 'sms' && t.smsBody) href = encodeSmsHref(t.smsBody);
      return `<a href="${escHtml(href)}" class="task-card task-card--action ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="${variant}">
        <div class="task-check task-check--action"><i class="${icon}"></i></div>
        <div class="task-content">
          <div class="t-label">${escHtml(t.label)}</div>
          <div class="t-desc">${escHtml(t.desc || '')}</div>
        </div>
      </a>`;
    }

    if (variant === 'media') {
      const cardAccent = calmAccent(accent) || 'var(--c-blue)';
      const playerBlock = t.mediaSrc ? `
        <div class="inline-voice-player" id="player-${escHtml(t.id)}" hidden>
          <video playsinline webkit-playsinline muted preload="auto" src="${escHtml(t.mediaSrc)}"></video>
          <div class="voice-controls">
            <button type="button" class="btn-soft primary voice-fullscreen" data-href="${escHtml(t.href || '')}">
              <i class="ri-fullscreen-line"></i> tela cheia
            </button>
          </div>
        </div>` : '';
      return `
        <div class="task-card task-card--media ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="media" style="border-color: color-mix(in srgb, ${cardAccent} 42%, transparent); background: color-mix(in srgb, ${cardAccent} 10%, transparent)">
          <div class="task-check task-check--play">${TASK_PLAY_ICON}${TASK_CHECK_ICON}</div>
          <div class="task-content">
            <div class="t-label" style="color:${cardAccent}">${escHtml(t.label)}</div>
            <div class="t-desc">${escHtml(t.desc || '')}</div>
          </div>
        </div>${playerBlock}`;
    }

    return `
      <div class="task-card ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="default">
        <div class="task-check"><i class="ri-check-line"></i></div>
        <div class="task-content">
          <div class="t-label">${escHtml(t.label)}</div>
          <div class="t-desc">${escHtml(t.desc || '')}</div>
        </div>
      </div>`;
  }

  function renderFastLane(nodeId, node) {
    const target = FAST_LANE[currentFlowKey];
    if (nodeId !== 'a1' || node.type !== 'choice' || !target) return '';
    return `<button type="button" class="btn-soft fast-lane" data-goto="${target}">preciso de algo agora</button>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wrapNodeContent(node, meta, nodeId, bodyHtml) {
    let html = '';
    // 192/188 one tap away in EVERY flow: the home strip is hidden while a sheet is open (style.css
    // body.is-sheet-open .sos-strip), so a conditional bar left torto/realidade/trava with no dialable 192 (audit 003).
    html += renderCrisisBar();
    html += renderFlowHeader(node, meta);
    if (node.exactPhrase) html += renderExactPhrase(node.exactPhrase, node.flowAccent || meta.accent);
    html += bodyHtml;
    if (node.evidenceHint) html += renderEvidenceHint(node.evidenceHint);
    html += renderFastLane(nodeId, node);
    return html;
  }

  function findTask(nodeId, taskId) {
    const node = currentFlow.nodes[nodeId];
    if (!node || !node.tasks) return null;
    return node.tasks.find(t => t.id === taskId) || null;
  }

  function pauseAmbientForMedia() {
    if (!audioEl || !audioPlaying) return;
    plogAudio('pauseAmbientForMedia', { runId: 'post-fix', ...audioSnapshot() }, 'A');
    audioPlaying = false;
    killAudioVolumeTweens();
    audioEl.pause();
    audioEl.volume = 0;
    setAudioIconState(false);
  }

  async function pickFriendContact(cardEl, nodeId, taskId, templateKey) {
    const body = (data && data.resources && data.resources.whatsapp && data.resources.whatsapp[templateKey])
      || 'Ei, tô passando por um momento difícil e preciso de companhia. Pode ficar comigo?';
    if (navigator.contacts && typeof navigator.contacts.select === 'function') {
      try {
        const picked = await navigator.contacts.select(['tel'], { multiple: false });
        const tel = picked && picked[0] && picked[0].tel && picked[0].tel[0];
        if (tel) {
          const digits = String(tel).replace(/[^\d+]/g, '');
          window.location.href = `sms:${digits}?body=${encodeURIComponent(body)}`;
          markTask(cardEl, nodeId, taskId);
          return;
        }
      } catch (_) { /* fallback */ }
    }
    const wa = buildWhatsAppHref(templateKey);
    if (wa) window.location.href = wa;
    else window.location.href = `sms:?body=${encodeURIComponent(body)}`;
    markTask(cardEl, nodeId, taskId);
  }

  function startInlineVideo(videoEl, onPlaying, onError) {
    if (!videoEl) return;
    pauseAmbientForMedia();
    videoEl.muted = true;
    videoEl.volume = 0;

    setTimeout(() => {
      const playPromise = videoEl.play();
      if (!playPromise) {
        if (onError) onError();
        return;
      }
      playPromise.then(() => {
        videoEl.muted = false;
        videoEl.volume = 0;
        if (typeof gsap !== 'undefined') {
          gsap.to(videoEl, {
            volume: MEDIA_TARGET_VOLUME,
            duration: MEDIA_VOL_FADE_SEC,
            ease: 'power1.inOut'
          });
        } else {
          videoEl.volume = MEDIA_TARGET_VOLUME;
        }
        if (onPlaying) onPlaying();
      }).catch(() => {
        videoEl.muted = true;
        if (onError) onError();
        else showToast('não consegui tocar o vídeo aqui.', 2200);
      });
    }, MEDIA_PLAY_DELAY_SEC * 1000);
  }

  function activateMediaTask(cardEl, nodeId, taskId) {
    if (cardEl.dataset.mediaLoading === '1') return;
    const task = findTask(nodeId, taskId);
    const player = document.getElementById(`player-${taskId}`);
    if (!player) return;

    cardEl.dataset.mediaLoading = '1';
    player.hidden = false;

    const video = player.querySelector('video');
    const onFail = () => {
      delete cardEl.dataset.mediaLoading;
    };

    startInlineVideo(video, () => {
      delete cardEl.dataset.mediaLoading;
      if (!cardEl.classList.contains('completed')) markTask(cardEl, nodeId, taskId);
    }, onFail);

    if (task && task.href) {
      const fsBtn = player && player.querySelector('.voice-fullscreen');
      if (fsBtn && !fsBtn.dataset.bound) {
        fsBtn.dataset.bound = '1';
        fsBtn.addEventListener('click', e => {
          e.stopPropagation();
          window.open(task.href, '_blank', 'noopener');
          if (!cardEl.classList.contains('completed')) markTask(cardEl, nodeId, taskId);
        });
      }
    }
  }

  function runBreathGuide(cardEl, nodeId, taskId) {
    const pattern = cardEl.dataset.pattern || '4-6';
    const totalCycles = parseInt(cardEl.dataset.cycles, 10) || 10;
    const phases = resolveBreathPattern(pattern);
    const guide = cardEl.querySelector('.breath-guide');
    const phaseEl = guide.querySelector('.breath-phase');
    const counterEl = guide.querySelector('.breath-counter');
    const cycleEl = guide.querySelector('.breath-cycle');
    guide.hidden = false;

    if (breathGuideTimer) { clearInterval(breathGuideTimer); breathGuideTimer = null; }
    if (breathGuideRaf) cancelAnimationFrame(breathGuideRaf);

    let cycle = 0;
    let phaseIdx = 0;
    let phaseEndsAt = performance.now() + phases[0].sec * 1000;

    phaseEl.textContent = phases[0].label;
    counterEl.textContent = phases[0].sec;
    cycleEl.textContent = `ciclo ${cycle} / ${totalCycles}`;

    function tick(now) {
      const phase = phases[phaseIdx];
      const msLeft = Math.max(0, phaseEndsAt - now);
      const secLeft = Math.max(1, Math.ceil(msLeft / 1000));
      counterEl.textContent = secLeft;
      phaseEl.textContent = phase.label;

      if (now < phaseEndsAt) {
        breathGuideRaf = requestAnimationFrame(tick);
        return;
      }

      phaseIdx += 1;
      if (phaseIdx >= phases.length) {
        phaseIdx = 0;
        cycle += 1;
        cycleEl.textContent = `ciclo ${cycle} / ${totalCycles}`;
        if (cycle >= totalCycles) {
          breathGuideRaf = null;
          markTask(cardEl, nodeId, taskId);
          return;
        }
      }

      const next = phases[phaseIdx];
      phaseEndsAt = now + next.sec * 1000;
      breathGuideRaf = requestAnimationFrame(tick);
    }

    breathGuideRaf = requestAnimationFrame(tick);
  }

  function runCrtPause(cardEl, nodeId, taskId) {
    const btn = cardEl.querySelector('.crt-start');
    const cd = cardEl.querySelector('.crt-countdown');
    if (!btn || !cd) return;
    btn.disabled = true;
    cd.hidden = false;
    let n = 10;
    cd.textContent = n;
    const iv = setInterval(() => {
      n -= 1;
      cd.textContent = n;
      if (n <= 0) {
        clearInterval(iv);
        markTask(cardEl, nodeId, taskId);
      }
    }, 1000);
  }

  function bindTaskHandlers(nodeId) {
    const node = currentFlow.nodes[nodeId];
    nodeArea.querySelectorAll('.task-card[data-variant="default"]:not(.completed)').forEach(card => {
      card.addEventListener('click', () => markTask(card, nodeId, card.dataset.tid));
    });
    nodeArea.querySelectorAll('.task-card[data-variant="media"]:not(.completed)').forEach(card => {
      card.addEventListener('click', () => activateMediaTask(card, nodeId, card.dataset.tid));
    });
    nodeArea.querySelectorAll('.task-card[data-variant="contact_pick"]:not(.completed)').forEach(card => {
      card.addEventListener('click', e => {
        e.preventDefault();
        pickFriendContact(card, nodeId, card.dataset.tid, card.dataset.waTemplate || 'crisis_generic');
      });
    });
    nodeArea.querySelectorAll('.task-card--action:not(.completed)').forEach(card => {
      if (card.dataset.variant === 'contact_pick') return;
      card.addEventListener('click', () => markTask(card, nodeId, card.dataset.tid));
    });
    nodeArea.querySelectorAll('.task-card--breath:not(.completed)').forEach(card => {
      const startBtn = card.querySelector('.breath-start');
      if (startBtn) {
        startBtn.addEventListener('click', e => {
          e.stopPropagation();
          runBreathGuide(card, nodeId, card.dataset.tid);
        });
      }
      card.addEventListener('click', e => {
        if (e.target.closest('.breath-start')) return;
        const guide = card.querySelector('.breath-guide');
        if (guide) guide.hidden = false;
      });
    });
    nodeArea.querySelectorAll('.task-card--crt:not(.completed)').forEach(card => {
      const btn = card.querySelector('.crt-start');
      if (btn) btn.addEventListener('click', e => {
        e.stopPropagation();
        runCrtPause(card, nodeId, card.dataset.tid);
      });
    });
    nodeArea.querySelectorAll('.inline-voice-player .voice-fullscreen').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const href = btn.dataset.href;
        if (href) window.open(href, '_blank', 'noopener');
        const tid = btn.closest('.inline-voice-player')?.id?.replace('player-', '');
        const card = tid && nodeArea.querySelector(`.task-card[data-tid="${tid}"]`);
        if (card && !card.classList.contains('completed')) markTask(card, nodeId, tid);
      });
    });
    if (node && node.sequentialTasks) {
      const hint = nodeArea.querySelector('.sequential-hint');
      if (!hint) {
        const el = document.createElement('p');
        el.className = 'sequential-hint';
        el.textContent = 'Faça uma de cada vez. Marco quando terminar.';
        nodeArea.querySelector('.task-list')?.prepend(el);
      }
    }
    updateTaskProgress(nodeId);
  }

  function renderNode(nodeId) {
    const sheetOpen = overlay.style.visibility === 'visible';
    const knownNode = currentFlow && currentFlow.nodes && currentFlow.nodes[nodeId];
    if (!sheetOpen || !knownNode || REDUCE_MOTION || typeof gsap === 'undefined' || !nodeArea.firstChild) {
      paintNode(nodeId);
      return;
    }
    if (nodeTransitioning) return;           /* a second tap mid-breath is ignored */
    nodeTransitioning = true;
    gsap.to(nodeArea, {
      opacity: 0, y: -6, duration: MOTION.out, ease: 'sine.in',
      onComplete: () => {
        paintNode(nodeId);
        if (typeof infoBox.scrollTo === 'function') infoBox.scrollTo({ top: 0 }); else infoBox.scrollTop = 0;
        gsap.fromTo(nodeArea, { opacity: 0, y: 10 }, {
          opacity: 1, y: 0, duration: MOTION.in, ease: MOTION.ease,
          onComplete: () => { nodeTransitioning = false; }
        });
      }
    });
  }

  function paintNode(nodeId) {
    if (nodeId === 'done') {
      closeFlow();
      return;
    }
    if (!currentFlow || !currentFlow.nodes[nodeId]) {
      if (nodeId && nodeId.startsWith('redirect_')) {
        const target = nodeId.replace('redirect_', '');
        if (data[target]) { SOS.switchFlow(target); return; }
      }
      closeFlow();
      return;
    }

    const node = currentFlow.nodes[nodeId];
    const meta = currentFlow.meta || {};
    currentNodeId = nodeId;
    if (node.riskOnEnter) registerRisk(node.riskOnEnter);
    flowLocked = !!node.locked || riskIndex(sessionRisk) >= riskIndex('EMERGENT');

    nodeArea.innerHTML = '';
    progressFill.style.width = calcProgress(nodeId) + '%';
    flowIndicator.textContent = FLOW_LABELS[currentFlowKey] || meta.label || 'Apoio';

    let bodyHtml = '';

    if (node.type === 'info') {
      bodyHtml = `<div class="node-text">${formatText(node.text)}</div>`;
      if (node.isDone) {
        bodyHtml += `<button type="button" class="btn-soft next-action" data-action="hold">recolher  fico por perto</button>`;
        bodyHtml += `<a href="tel:188" class="action-btn" style="margin-top:10px"><i class="ri-phone-line"></i><span>CVV 188  se ainda estiver pesado</span></a>`;
      } else if (node.autoTo) {
        bodyHtml += `<button type="button" class="btn-soft" style="margin-top:12px" data-goto="${node.autoTo}">continuar devagar</button>`;
      }
    } else if (node.type === 'choice') {
      bodyHtml = `<div class="node-text">${formatText(node.text)}</div><div class="choice-list">`;
      (node.choices || []).forEach(ch => {
        const riskAttr = ch.riskLevel ? ` data-risk="${escHtml(ch.riskLevel)}"` : '';
        bodyHtml += `<button type="button" class="choice-btn" data-goto="${ch.to}"${riskAttr}>${escHtml(ch.label)}</button>`;
      });
      bodyHtml += `</div>`;
    } else if (node.type === 'task') {
      bodyHtml = `<div class="node-text">${formatText(node.text)}</div>`;
      if (node.sequentialTasks) {
        bodyHtml += `<p class="sequential-hint">Faça <strong>uma de cada vez</strong>. Marco quando terminar.</p>`;
      }
      bodyHtml += `<div class="task-list">`;
      getVisibleTasks(node, nodeId).forEach(t => {
        bodyHtml += renderTask(t, nodeId, meta.accent);
      });
      bodyHtml += `</div>`;
      if (node.doneText) {
        bodyHtml += `<div class="next-action" id="done-wrap" style="display:none"><button type="button" class="btn-soft" data-goto="${node.allDoneTo || 'm_next'}">continuar devagar · ${escHtml(node.doneText)}</button></div>`;
      }
    } else if (node.type === 'action') {
      bodyHtml = `<div class="node-text">${formatText(node.text)}</div>`;
      if (node.alertBox) {
        bodyHtml += `<div class="alert-box">${formatText(node.alertBox)}</div>`;
      }
      bodyHtml += `<div class="action-list">`;
      (node.actions || []).forEach(a => {
        let href = a.href || '';
        if (a.variant === 'whatsapp' && a.whatsappTemplate) {
          href = buildWhatsAppHref(a.whatsappTemplate);
        }
        if (a.variant === 'caps_list') {
          bodyHtml += `<button type="button" class="action-btn caps-toggle" data-caps="1"><i class="${a.icon || 'ri-hospital-line'}"></i><span>${escHtml(a.label)}</span></button>`;
        } else {
          bodyHtml += `<a href="${escHtml(href)}" class="action-btn ${a.cls || ''}"><i class="${a.icon || 'ri-phone-line'}"></i><span>${escHtml(a.label)}</span></a>`;
        }
      });
      bodyHtml += `</div><div id="caps-panel" hidden>${renderCapsList()}</div>`;
      if (node.autoTo) bodyHtml += `<button type="button" class="btn-soft" style="margin-top:18px" data-goto="${node.autoTo}">continuar devagar</button>`;
      if (node.isDone) {
        bodyHtml += `<button type="button" class="btn-soft next-action" data-action="hold" style="margin-top:12px">recolher  fico por perto</button>`;
      }
    } else if (node.type === 'redirect') {
      bodyHtml = `<div class="node-text">${formatText(node.text)}</div>`;
      if (node.suggestion) {
        bodyHtml += `<div class="redirect-box"><div>${formatText(node.suggestion)}</div>`;
        if (node.redirectFlow) {
          bodyHtml += `<button type="button" class="btn-soft primary" style="margin-top:12px" data-switch="${node.redirectFlow}">ir para ${FLOW_LABELS[node.redirectFlow] || 'o suporte'}</button>`;
        }
        bodyHtml += `<button type="button" class="btn-soft" style="margin-top:7px" data-goto="${node.stayTo || 'm1'}">ficar aqui</button></div>`;
      }
    }

    nodeArea.innerHTML = wrapNodeContent(node, meta, nodeId, bodyHtml);
    updateCrisisBarVisibility();
    if (node.type === 'task') setTimeout(() => bindTaskHandlers(nodeId), 12);
    bindNodeActions();
    saveFlowProgress();
    infoBox.scrollTop = 0;
  }

  function bindNodeActions() {
    nodeArea.querySelectorAll('[data-goto]:not(.choice-btn)').forEach(btn => {
      btn.addEventListener('click', () => {
        const risk = btn.dataset.risk;
        if (risk) registerRisk(risk);
        SOS.goTo(btn.dataset.goto);
      });
    });
    nodeArea.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (nodeTransitioning) return;
        btn.classList.add('is-chosen');       /* "I heard you" before moving on */
        const now = Date.now();
        if (riskIndex(sessionRisk) >= riskIndex('MODERATE') && now - lastChoiceAt < CHOICE_DEBOUNCE_MS) return;
        lastChoiceAt = now;
        const risk = btn.dataset.risk;
        if (risk) registerRisk(risk);
        SOS.goTo(btn.dataset.goto);
      });
    });
    nodeArea.querySelectorAll('[data-switch]').forEach(btn => {
      btn.addEventListener('click', () => SOS.switchFlow(btn.dataset.switch));
    });
    nodeArea.querySelectorAll('[data-action="hold"]').forEach(btn => {
      btn.addEventListener('click', () => SOS.holdAndStay());
    });
    nodeArea.querySelectorAll('[data-action="end"]').forEach(btn => {
      btn.addEventListener('click', () => SOS.holdAndStay());
    });
    nodeArea.querySelectorAll('.caps-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById('caps-panel');
        if (panel) panel.hidden = !panel.hidden;
      });
    });
  }

  function formatText(txt) {
    if (!txt) return '';
    return txt
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="inline-link">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function calcProgress(nodeId) {
    if (!currentFlow || !currentFlow.nodes) return 12;
    const keys = Object.keys(currentFlow.nodes);
    const idx = Math.max(0, keys.indexOf(nodeId));
    return Math.max(8, Math.min(96, Math.round(((idx + 1) / Math.max(3, keys.length)) * 100)));
  }

  function isTaskDone(nodeId, taskId) {
    return !!(taskDone[nodeId] && taskDone[nodeId].has(taskId));
  }

  function markTask(cardEl, nodeId, taskId) {
    if (!taskDone[nodeId]) taskDone[nodeId] = new Set();
    if (taskDone[nodeId].has(taskId)) return;
    taskDone[nodeId].add(taskId);
    cardEl.classList.add('completed');
    if (navigator.vibrate) navigator.vibrate(4);
    if (typeof gsap !== 'undefined' && !REDUCE_MOTION) gsap.fromTo(cardEl, { scale: 0.985 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.6)' });
    showToast('continuo aqui com você.', 1400);

    const node = currentFlow.nodes[nodeId];
    if (node && node.sequentialTasks) {
      const pending = (node.tasks || []).filter(t => !isTaskDone(nodeId, t.id));
      if (pending.length) {
        setTimeout(() => renderNode(nodeId), 280);
        return;
      }
    }
    updateTaskProgress(nodeId);
    saveFlowProgress();
  }

  function updateTaskProgress(nodeId) {
    const node = currentFlow.nodes[nodeId];
    if (!node || !node.tasks) return;
    const wrap = document.getElementById('done-wrap');
    if ((taskDone[nodeId] || new Set()).size >= node.tasks.length && wrap) {
      wrap.style.display = 'block';
      if (typeof gsap !== 'undefined') gsap.fromTo(wrap, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.25, ease: MOTION.ease });
    }
  }

  SOS.goTo = nodeId => renderNode(nodeId);

  SOS.switchFlow = newFlowKey => {
    if (!data[newFlowKey]) return;
    currentFlowKey = newFlowKey;
    currentFlow = data[newFlowKey];
    taskDone = {};
    sequentialStep = {};
    renderNode(currentFlow.start || Object.keys(currentFlow.nodes)[0]);
    saveFlowProgress();
  };

  SOS.holdAndStay = () => {
    showToast('fico por perto. respire mais uma vez, se couber.', 2200);
    setTimeout(() => closeFlow(), 900);
  };

  SOS.endFlowWithCare = SOS.holdAndStay;

  const TOAST_FADE_IN = 1.15;
  const TOAST_FADE_OUT = 1.5;
  const TOAST_HOLD_MULT = 2;

  function showWelcomeToast() {
    setTimeout(() => showToast('Estamos contigo aqui.. Sem pressa, tá?', 2200), 1200);
  }

  function showToast(msg, holdMs = 1650) {
    if (!toastEl || typeof gsap === 'undefined') return;
    toastEl.textContent = msg;
    gsap.killTweensOf(toastEl);
    gsap.set(toastEl, { opacity: 0 });
    gsap.timeline()
      .to(toastEl, { opacity: 0.96, duration: TOAST_FADE_IN, ease: 'power2.out' })
      .to(toastEl, { opacity: 0.96, duration: (holdMs * TOAST_HOLD_MULT) / 1000 })
      .to(toastEl, { opacity: 0, duration: TOAST_FADE_OUT, ease: 'power2.in' });
  }

  SOS.showToast = showToast;
  SOS.parseBreathePhrase = parseBreathePhrase;
  SOS.renderBreathePhraseHtml = renderBreathePhraseHtml;
  SOS.BREATHE_PHRASES = BREATHE_PHRASES;
  SOS.BREATH_PATTERN = BREATH_PATTERN;
  SOS.BREATH_CYCLE_SEC = BREATH_CYCLE_SEC;

  function whenAppReady(fn) {
    const run = () => { try { fn(); } catch (_) {} };
    if (document.documentElement.classList.contains('preloading')) {
      window.addEventListener('preloader:revealed', () => run(), { once: true });
      setTimeout(() => {
        if (document.documentElement.classList.contains('preloading')) {
          document.documentElement.classList.remove('preloading');
          run();
        }
      }, 90000);
    } else {
      run();
    }
  }

  whenAppReady(boot);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.visibility === 'visible') closeFlow();
  });

  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch <= 280) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

})();
