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
  /* the menu volume slider (calm-nav.js) sets SOS.userVolume; the fade targets it */
  const targetVolume = () => (typeof SOS.userVolume === 'number' ? SOS.userVolume : TARGET_VOLUME);

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
  const iconZen = document.getElementById('icon-zen');
  const btnZen = document.getElementById('btn-zen');
  const btnAudio = document.getElementById('btn-audio');
  const audioStatus = document.getElementById('audio-status');
  const toastEl = document.getElementById('warm-toast');

  let isZen = false;
  let audioPlaying = false;
  let audioUnlocked = false;
  let audioPending = null;
  let audioInitialized = false;
  let audioRequestId = 0;
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
  /* Relatório / Modo Médico: what this page observed goes to the tiles journal (tiles-journal.js). Never throws. */
  const journal = (k, p) => { try { if (window.SOSJournal) window.SOSJournal.add(k, p); } catch (_) {} };
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
  let breatheTxtTween = null;
  let breathePhraseShownAt = 0;
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
    const simplified = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const guidance = simplified
      ? { inhale: 'inspire suavemente', hold: 'pause suavemente · sem forçar', exhale: 'expire devagar' }
      : { inhale: 'inspire · a esfera se expande', hold: 'pause suavemente · sem forçar', exhale: 'expire · a esfera se contrai' };
    if (breatheSub && orbActive) breatheSub.textContent = guidance[phaseId] + ' · toque para pausar';
  }

  function showBreatheTextForPhase(phaseId) {
    if (!breatheTxt) return;
    const raw = nextBreathePhraseForPhase(phaseId);
    breatheTxt.innerHTML = renderBreathePhraseHtml(parseBreathePhrase(raw));
    breatheTxt.style.opacity = '1';
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
      journal('risk', { lvl: level });
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
  function ensureOrbBoot() { setupOrb(); }

  function boot() {
    loadPersistedState();
    syncBreathCssVars();
    buildBreathePhrasePools();
    if (window.SOS_DATA && window.SOS_DATA.torto) {
      data = window.SOS_DATA;
      enhanceOptionsFromData();
    }
    bindStaticOptions();
    setupZen();
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

  function setAudioState(state) {
    audioPlaying = state === 'playing';
    if (btnAudio) {
      btnAudio.dataset.state = state;
      btnAudio.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
      btnAudio.setAttribute('aria-pressed', audioPlaying ? 'true' : 'false');
      btnAudio.setAttribute('aria-label', state === 'loading' ? 'Cancelar carregamento do som' : audioPlaying ? 'Pausar som ambiente' : 'Tocar som ambiente');
      btnAudio.classList.toggle('is-playing', audioPlaying);
    }
    if (audioStatus) {
      audioStatus.dataset.state = state;
      audioStatus.textContent = ({ playing: 'Som ambiente tocando', paused: 'Som pausado', loading: 'Carregando som…', ended: 'Som finalizado', error: 'Som indisponível. Toque em tocar para tentar novamente.' })[state];
    }
  }

  /* Ambient fallback: the piano file lives on the asset host (assets.apollo.rio.br/audio/clocks.flac). When it cannot
     play (missing on the host, offline, opened from the disk), a soft pad is synthesized on the device instead:
     Web Audio, no file, no network. Its swell follows the 12 s breath cycle. Same button, same volume slider.
     The context is unlocked inside the entry/button gesture so the later switch is allowed on every browser. */
  const AMBIENT_GAIN = 0.2;
  let fileFailed = false;
  const pad = (() => {
    let ctx = null, out = null, voices = null;
    const AC = window.AudioContext || window.webkitAudioContext;
    function unlock() {
      if (!AC) return false;
      try {
        if (!ctx) {
          ctx = new AC();
          out = ctx.createGain();
          out.gain.value = 0;
          out.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
      } catch (_) { ctx = null; return false; }
    }
    function startVoices() {
      if (voices) return;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 820; lp.Q.value = 0.4;
      lp.connect(out);
      voices = [];
      /* open A chord, slightly detuned; each voice swells on its own slow cycle around the 12 s breath */
      [[110, 'triangle', 0.34], [164.81, 'sine', 0.2], [220, 'sine', 0.2], [277.18, 'sine', 0.1], [329.63, 'sine', 0.08]].forEach(([f, type, level], i) => {
        const osc = ctx.createOscillator(), amp = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
        osc.type = type; osc.frequency.value = f; osc.detune.value = (i - 2) * 4;
        amp.gain.value = level;
        lfo.frequency.value = 1 / (BREATH_CYCLE_SEC + i * 1.6);
        depth.gain.value = level * 0.55;
        lfo.connect(depth); depth.connect(amp.gain);
        osc.connect(amp); amp.connect(lp);
        osc.start(); lfo.start();
        voices.push(osc, lfo);
      });
    }
    function ramp(to, sec) {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(to, t + sec);
    }
    return {
      unlock,
      on: () => !!(ctx && voices && out.gain.value > 0.0005 && ctx.state === 'running'),
      play(vol) {
        if (!unlock()) return Promise.resolve(false);
        return ctx.resume().then(() => { startVoices(); ramp(vol * AMBIENT_GAIN, REDUCE_MOTION ? 0.3 : 4); return ctx.state === 'running'; }).catch(() => false);
      },
      pause() {
        if (!ctx || !voices) return;
        ramp(0, 0.5);
        setTimeout(() => { if (ctx && out.gain.value < 0.0005) ctx.suspend().catch(() => {}); }, 650);
      },
      volume(v) { if (ctx && voices && ctx.state === 'running') ramp(v * AMBIENT_GAIN, 0.15); }
    };
  })();
  let padPlaying = false;

  function playPad() {
    return pad.play(targetVolume()).then(ok => {
      padPlaying = ok;
      setAudioState(ok ? 'playing' : 'error');
      if (audioStatus && ok) audioStatus.textContent = 'Som ambiente tocando (gerado no aparelho)';
      return ok;
    });
  }
  SOS.onVolume = v => pad.volume(v);

  function pauseAmbientAudio() {
    if (!audioEl) return;
    audioRequestId++;
    audioPending = null;
    killAudioVolumeTweens();
    audioEl.pause();
    if (padPlaying) { pad.pause(); padPlaying = false; }
    setAudioState('paused');
  }

  function setupAudio() {
    if (!audioEl || audioInitialized) return;
    audioInitialized = true;
    audioEl.muted = false;
    audioEl.addEventListener('playing', () => {
      if (!padPlaying && !audioEl.paused && !audioEl.ended) setAudioState('playing');
    });
    audioEl.addEventListener('pause', () => { if (!padPlaying) setAudioState(audioEl.error ? 'error' : audioEl.ended ? 'ended' : 'paused'); });
    audioEl.addEventListener('ended', () => { if (!padPlaying) setAudioState('ended'); });
    audioEl.addEventListener('waiting', () => { if (!padPlaying && !audioEl.paused) setAudioState('loading'); });
    /* the file failed (play() rejects too): the next start goes straight to the synthesized pad */
    audioEl.addEventListener('error', () => { fileFailed = true; });
    if (btnAudio) btnAudio.addEventListener('click', e => { e.stopPropagation(); SOS.toggleAudio(); });
    setAudioState('paused');
  }

  function startAmbientAudio(fromGesture) {
    if (!audioEl) return Promise.resolve(false);
    if (audioPending) return audioPending;
    if (padPlaying || (!audioEl.paused && !audioEl.ended)) return Promise.resolve(true);
    // Must run synchronously in the entry/button click, before awaiting anything.
    pad.unlock();
    if (fileFailed) return playPad();
    const requestId = ++audioRequestId;
    audioUnlocked = true;
    killAudioVolumeTweens();
    audioEl.muted = false;
    audioEl.volume = targetVolume();
    if (audioEl.error) audioEl.load();
    setAudioState('loading');
    let play;
    try { play = audioEl.play(); } catch (error) { play = Promise.reject(error); }
    audioPending = Promise.resolve(play).then(() => {
      if (requestId !== audioRequestId) return false;
      if (!audioEl.paused && !audioEl.ended && audioEl.readyState >= 3) setAudioState('playing');
      return !audioEl.paused;
    }).catch(() => {
      if (requestId !== audioRequestId) return false;
      fileFailed = true;
      return padPlaying ? true : playPad().then(ok => {
        if (!ok && fromGesture) showToast('Não consegui iniciar o som. Você pode continuar respirando aqui.', 2600);
        return ok;
      });
    }).finally(() => { if (requestId === audioRequestId) audioPending = null; });
    return audioPending;
  }

  function setAudioIconState() {
    setAudioState(padPlaying || (audioEl && !audioEl.paused && !audioEl.ended && audioEl.readyState >= 3) ? 'playing' : 'paused');
  }
  SOS.enterApp = () => { acquireWake(); return startAmbientAudio(true); };
  SOS.toggleAudio = () => {
    if (!audioEl) return;
    if (audioPending || padPlaying || !audioEl.paused) pauseAmbientAudio();
    else startAmbientAudio(true);
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
    const phases = ['inhale', 'hold', 'exhale'];
    let phase = -1, timer = 0, due = 0, remaining = BREATH_ORB_DELAY_SEC * 1000, paused = false;
    const schedule = () => {
      due = performance.now() + remaining;
      timer = setTimeout(() => {
        phase = (phase + 1) % phases.length;
        const id = phases[phase];
        setOrbBreathPhase(id);
        showBreatheTextForPhase(id);
        remaining = BREATH_PATTERN[id] * 1000;
        schedule();
      }, remaining);
    };
    schedule();
    return {
      paused: () => paused,
      pause() {
        if (paused) return;
        paused = true; remaining = Math.max(0, due - performance.now()); clearTimeout(timer);
        if (orbStage) orbStage.classList.add('is-paused');
      },
      resume() {
        if (!paused) return;
        paused = false;
        if (orbStage) orbStage.classList.remove('is-paused');
        if (phase >= 0) setOrbBreathPhase(phases[phase]);
        schedule();
      }
    };
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
    if (orbStage) orbStage.classList.add('is-ready');
    breatheTl = buildBreatheTimeline();
    const frame = orbIsoFrame();
    if (frame) frame.addEventListener('load', () => setIsoFlowPaused(!orbActive || document.hidden || document.body.classList.contains('is-sheet-open')));

    orb.addEventListener('click', e => {
      e.stopPropagation();
      orbActive = !orbActive;
      if (orbActive) {
        orb.classList.remove('paused');
        if (breatheTl) breatheTl.resume();
        setIsoFlowPaused(false);
        setOrbBreathPhase(orb.dataset.breath || 'inhale');
        orb.setAttribute('aria-pressed', 'false');
        orb.setAttribute('aria-label', 'Pausar a esfera de respiração');
      } else {
        orb.classList.add('paused');
        if (breatheTl) breatheTl.pause();
        setIsoFlowPaused(true);
        breatheSub.textContent = 'em pausa · toque para retomar';
        orb.setAttribute('aria-pressed', 'true');
        orb.setAttribute('aria-label', 'Retomar a esfera de respiração');
      }
    });


  }

  function setupZen() {
    if (!btnZen) return;
    btnZen.addEventListener('click', () => SOS.toggleZen());
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
      optionsZone.inert = true;
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
      optionsZone.inert = false;
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
    if (window.SOS.closeMenu) window.SOS.closeMenu();
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
      if (overlay.getAttribute('aria-hidden') === 'true') return;
      const first = nodeArea.querySelector('button, a[href]') || infoBox;
      if (first === infoBox) infoBox.setAttribute('tabindex', '-1');
      try { first.focus({ preventScroll: true }); } catch (_) {}
    }, REDUCE_MOTION ? 0 : 420);
  }

  SOS.closeFlow = () => closeFlow();
  function closeFlow() {
    if (flowLocked && riskIndex(sessionRisk) >= riskIndex('EMERGENT')) {
      showToast('recolher  fico por perto.', 2400);
    }
    if (breathGuideTimer) { clearInterval(breathGuideTimer); breathGuideTimer = null; }
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
    const saved = restoreFlowProgress();
    currentFlowKey = flowKey;
    currentFlow = data[flowKey];
    journal('flow', { f: flowKey });
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
    return `<div class="exact-phrase" style="--quote:${color};border-color:${color}">${formatText(text)}</div>`;
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
        <div class="breath-guide">
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
          <video controls aria-label="Vídeo de apoio" playsinline preload="none" src="${escHtml(t.mediaSrc)}"></video>
          <div class="voice-controls">
            <button type="button" class="btn-soft primary voice-fullscreen" data-href="${escHtml(t.href || '')}">
              <i class="ri-fullscreen-line"></i> tela cheia
            </button>
          </div>
        </div>` : '';
      return `
        <button type="button" class="task-card task-card--media ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="media" style="border-color: color-mix(in srgb, ${cardAccent} 42%, transparent); background: color-mix(in srgb, ${cardAccent} 10%, transparent)" aria-pressed="${done}">
          <span class="task-check task-check--play">${TASK_PLAY_ICON}${TASK_CHECK_ICON}</span>
          <span class="task-content">
            <span class="t-label" style="color:${cardAccent}">${escHtml(t.label)}</span>
            <span class="t-desc">${escHtml(t.desc || '')}</span>
          </span>
      </button>${playerBlock}`;
    }

    return `
      <button type="button" class="task-card ${done ? 'completed' : ''}" data-tid="${escHtml(t.id)}" data-variant="default" aria-pressed="${done}">
        <span class="task-check"><i class="ri-check-line"></i></span>
        <span class="task-content">
          <span class="t-label">${escHtml(t.label)}</span>
          <span class="t-desc">${escHtml(t.desc || '')}</span>
        </span>
      </button>`;
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
    if (audioEl && (audioPending || padPlaying || !audioEl.paused)) pauseAmbientAudio();
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
          journal('tap', { ch: 'sms', to: 'contato' });
          window.location.href = `sms:${digits}?body=${encodeURIComponent(body)}`;
          markTask(cardEl, nodeId, taskId);
          return;
        }
      } catch (_) { /* fallback */ }
    }
    const wa = buildWhatsAppHref(templateKey);
    journal('tap', { ch: wa ? 'whatsapp' : 'sms', to: 'contato' });
    if (wa) window.location.href = wa;
    else window.location.href = `sms:?body=${encodeURIComponent(body)}`;
    markTask(cardEl, nodeId, taskId);
  }

  function startInlineVideo(videoEl, onPlaying, onError) {
    if (!videoEl) return;
    pauseAmbientForMedia();
    videoEl.muted = false;
    videoEl.volume = MEDIA_TARGET_VOLUME;
    videoEl.play().then(() => { if (onPlaying) onPlaying(); }).catch(() => {
      if (onError) onError();
      showToast('Não consegui tocar o vídeo aqui.', 2200);
    });
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

    let cycle = 0;
    let phaseIdx = 0;
    let phaseEndsAt = performance.now() + phases[0].sec * 1000;

    phaseEl.textContent = phases[0].label;
    counterEl.textContent = phases[0].sec;
    cycleEl.textContent = `ciclo ${cycle} / ${totalCycles}`;

    function tick() {
      const now = performance.now();
      const phase = phases[phaseIdx];
      const msLeft = Math.max(0, phaseEndsAt - now);
      const secLeft = Math.max(1, Math.ceil(msLeft / 1000));
      if (counterEl.textContent !== String(secLeft)) counterEl.textContent = secLeft;
      if (phaseEl.textContent !== phase.label) phaseEl.textContent = phase.label;

      if (now < phaseEndsAt) {
        breathGuideTimer = setTimeout(tick, Math.min(1000, phaseEndsAt - now));
        return;
      }

      phaseIdx += 1;
      if (phaseIdx >= phases.length) {
        phaseIdx = 0;
        cycle += 1;
        cycleEl.textContent = `ciclo ${cycle} / ${totalCycles}`;
        if (cycle >= totalCycles) {
          breathGuideTimer = null;
          markTask(cardEl, nodeId, taskId);
          return;
        }
      }

      const next = phases[phaseIdx];
      phaseEndsAt = now + next.sec * 1000;
      phaseEl.textContent = next.label;
      counterEl.textContent = next.sec;
      breathGuideTimer = setTimeout(tick, 1000);
    }

    breathGuideTimer = setTimeout(tick, 1000);
  }

  function runCrtPause(cardEl, nodeId, taskId) {
    const btn = cardEl.querySelector('.crt-start');
    const cd = cardEl.querySelector('.crt-countdown');
    if (!btn || !cd) return;
    btn.disabled = true;
    cd.hidden = false;
    let n = 10;
    cd.textContent = n;
    if (breathGuideTimer) clearInterval(breathGuideTimer);
    const iv = breathGuideTimer = setInterval(() => {
      n -= 1;
      cd.textContent = n;
      if (n <= 0) {
        clearInterval(iv);
        breathGuideTimer = null;
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

    if (breathGuideTimer) { clearInterval(breathGuideTimer); breathGuideTimer = null; }
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
      const parts = splitQuestion(node.text);
      bodyHtml = (parts.lead ? `<div class="node-text">${formatText(parts.lead)}</div>` : '')
        + (parts.question ? `<p class="node-question">${formatText(parts.question)}</p>` : '')
        + `<div class="choice-list">`;
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
    if (node.type === 'task') bindTaskHandlers(nodeId);
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
        journal('choice', { f: currentFlowKey, t: btn.textContent });
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

  /* Presentation only: the last paragraph of a choice node, when it is a question, is shown as the question
     (support text above it stays quiet). The copy itself is untouched. */
  function splitQuestion(text) {
    const t = String(text || '').trim();
    const paras = t.split(/\n\s*\n/);
    const last = paras[paras.length - 1].trim();
    if (!/\?\s*$/.test(last)) return { lead: t, question: '' };
    return { lead: paras.slice(0, -1).join('\n\n').trim(), question: last };
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
    const doneTask = findTask(nodeId, taskId);
    journal('task', { f: currentFlowKey, t: doneTask ? doneTask.label : '' });
    cardEl.classList.add('completed');
    if (cardEl.tagName === 'BUTTON') cardEl.setAttribute('aria-pressed', 'true');
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
    journal('flow', { f: newFlowKey });
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

  let toastTimer = 0;
  function showToast(msg, holdMs = 1650) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    if (typeof gsap === 'undefined' || REDUCE_MOTION) {
      toastEl.textContent = msg; toastEl.style.opacity = '1';
      toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, holdMs);
      return;
    }
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

  // Bind the single audio element before the entry dialog can receive a gesture.
  setupAudio();
  let appBooted = false;
  const bootOnce = () => { if (!appBooted) { appBooted = true; boot(); } };
  if (document.documentElement.classList.contains('preloading')) window.addEventListener('preloader:revealed', bootOnce, { once: true });
  else bootOnce();
  document.addEventListener('visibilitychange', () => {
    const quiet = document.hidden || !orbActive || document.body.classList.contains('is-sheet-open');
    if (breatheTl) { if (quiet) breatheTl.pause(); else breatheTl.resume(); }
    setIsoFlowPaused(quiet);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.visibility === 'visible') closeFlow();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || overlay.getAttribute('aria-hidden') === 'true') return;
    const controls = Array.from(infoBox.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]')).filter(el => el.getClientRects().length && !el.closest('[hidden], [inert]'));
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { e.preventDefault(); infoBox.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || !infoBox.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !infoBox.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });

})();
