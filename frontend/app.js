/* Study Dost AI — frontend
 * By Sami Ahraf Nirob.
 * Vanilla JS. Talks to FastAPI backend.
 * Features: gamification (XP, levels, streaks, badges), themes, mascot,
 *           confetti, TTS, voice input, math/code rendering, favorites.
 */
(function () {
  "use strict";

  // ====================================================================
  // Config & constants
  // ====================================================================
  const CFG = window.CC_CONFIG || { API_BASE: "http://localhost:8000", API_KEY: "" };
  const API_BASE = String(CFG.API_BASE || "").replace(/\/+$/, "");
  const API_KEY = CFG.API_KEY || "";

  const SUBJECTS = ["General", "Math", "Physics", "Chemistry", "Biology", "Computer Science"];
  const THEMES = [
    { id: "midnight", emoji: "🌙", label: "Midnight" },
    { id: "galaxy",   emoji: "🌌", label: "Galaxy" },
    { id: "sunset",   emoji: "🌅", label: "Sunset" },
    { id: "forest",   emoji: "🌲", label: "Forest" },
    { id: "daylight", emoji: "☀️", label: "Daylight" },
  ];

  const COUNTRIES = [
    {
      id: "Default", flag: "🌐", short: "Global", label: "Default",
      help: "Generic high-school explanations — no curriculum bias.",
      tag: "",
    },
    {
      id: "Bangladesh", flag: "🇧🇩", short: "Bangladesh", label: "Bangladesh",
      help: "NCTB curriculum (SSC / HSC). Practice problems use the Creative Question (CQ) format — 4 sub-parts (1 + 2 + 3 + 4 marks).",
      tag: "🇧🇩 BD · NCTB / HSC",
    },
    {
      id: "India", flag: "�🇳", short: "India", label: "India",
      help: "NCERT / CBSE curriculum (Class 9-12). Hard practice problems use the JEE-Main / NEET 4-option MCQ format.",
      tag: "�🇳 IN · NCERT / CBSE",
    },
  ];

  const SUGGESTIONS_BY_COUNTRY = {
    Default: [
      { q: "Why does ice float on water?", s: "Physics" },
      { q: "How do I solve x² - 5x + 6 = 0?", s: "Math" },
      { q: "What is photosynthesis?", s: "Biology" },
      { q: "Explain recursion with an example", s: "Computer Science" },
      { q: "Why is the sky blue?", s: "Physics" },
      { q: "How do batteries actually work?", s: "Chemistry" },
      { q: "What's the Pythagorean theorem?", s: "Math" },
      { q: "How does DNA replicate?", s: "Biology" },
      { q: "What is Newton's third law?", s: "Physics" },
      { q: "How does Big-O notation work?", s: "Computer Science" },
      { q: "What's the difference between mass and weight?", s: "Physics" },
      { q: "Explain the chain rule in calculus", s: "Math" },
      { q: "How does the immune system fight infections?", s: "Biology" },
      { q: "What is an ionic bond?", s: "Chemistry" },
      { q: "How do neural networks learn?", s: "Computer Science" },
    ],
    Bangladesh: [
      { q: "Newton's laws of motion (HSC Physics 1st paper)", s: "Physics" },
      { q: "Solve x² - 5x + 6 = 0 (SSC General Math)", s: "Math" },
      { q: "Photosynthesis explained (HSC Biology 1st paper)", s: "Biology" },
      { q: "Acid-base titration (HSC Chemistry 1st paper)", s: "Chemistry" },
      { q: "Higher Math: derivative of x³ + 2x from first principles", s: "Math" },
      { q: "Electric circuits — series vs parallel (SSC Physics)", s: "Physics" },
      { q: "Periodic table trends (HSC Chemistry)", s: "Chemistry" },
      { q: "DNA structure and replication (HSC Biology)", s: "Biology" },
      { q: "What is recursion? (HSC ICT)", s: "Computer Science" },
      { q: "Vectors: dot product vs cross product (HSC Physics)", s: "Physics" },
      { q: "Mole concept and stoichiometry (SSC Chemistry)", s: "Chemistry" },
      { q: "Probability basics (SSC General Math)", s: "Math" },
    ],
    India: [
      { q: "Newton's laws (NCERT Class 11 Physics, Ch.5)", s: "Physics" },
      { q: "Solve x² - 5x + 6 = 0 (NCERT Class 10)", s: "Math" },
      { q: "Photosynthesis in higher plants (NCERT Class 11 Bio, Ch.13)", s: "Biology" },
      { q: "Periodic trends (NCERT Class 11 Chemistry, Ch.3)", s: "Chemistry" },
      { q: "Definite integrals — properties (NCERT Class 12 Maths)", s: "Math" },
      { q: "Bohr's atomic model (JEE/NEET)", s: "Physics" },
      { q: "Lens formula and magnification (CBSE Class 10)", s: "Physics" },
      { q: "Difference between list and tuple in Python (CBSE Class 11 CS)", s: "Computer Science" },
      { q: "Mole concept and concentration (NCERT Class 11)", s: "Chemistry" },
      { q: "Mendel's laws of inheritance (NCERT Class 12 Bio)", s: "Biology" },
      { q: "Quadratic equations — nature of roots (NCERT Class 10)", s: "Math" },
      { q: "Time complexity of binary search (CBSE Class 12 CS)", s: "Computer Science" },
    ],
  };
  const SUGGESTIONS = SUGGESTIONS_BY_COUNTRY.Default; // legacy alias

  const ENCOURAGEMENTS = [
    "Great question! Keep going 💪",
    "You're doing amazing! 🌟",
    "Curiosity is a superpower 🚀",
    "Every expert was once a beginner ✨",
    "That's exactly the kind of question scientists ask 🔬",
    "Nice — your brain just leveled up 🧠⚡",
    "Keep that curiosity engine running 🏎️",
    "Mistakes are how we learn. Keep going! 🌱",
    "Big brain energy detected 🧠💡",
    "You're closer to mastering this than you think 🎯",
  ];

  const LOADING_MSGS = [
    "Sharpening pencils and firing up neurons…",
    "Asking the AI to explain it three different ways…",
    "Thinking really, really hard for you…",
    "Cooking up some clarity…",
    "Translating textbook into human…",
  ];

  const FUN_FACTS = [
    "Did you know? Octopuses have three hearts.",
    "Honey never spoils — archaeologists have eaten 3,000-year-old jars.",
    "Bananas are berries 🍌, but strawberries technically aren't.",
    "A lightning bolt is ~5× hotter than the Sun's surface.",
    "Your brain uses about 20% of your body's energy.",
    "Sound travels ~4× faster in water than in air.",
    "There are more trees on Earth than stars in the Milky Way.",
    "Bubble wrap was originally invented as wallpaper. Seriously.",
    "Sharks existed before trees did.",
    "A single cloud can weigh more than a million pounds.",
  ];

  const BADGES = [
    { id: "first_q",   emoji: "🌱", name: "First Question",  test: (s) => s.totalQuestions >= 1 },
    { id: "centurion", emoji: "💯", name: "Centurion",       test: (s) => s.xp >= 100 },
    { id: "scholar",   emoji: "🎓", name: "Scholar",         test: (s) => s.xp >= 500 },
    { id: "fire3",     emoji: "🔥", name: "On Fire (3-day)", test: (s) => s.streak >= 3 },
    { id: "fire7",     emoji: "⚡", name: "Lightning (7-day)", test: (s) => s.streak >= 7 },
    { id: "polymath",  emoji: "🧪", name: "Polymath",        test: (s) => Object.keys(s.subjectsUsed || {}).length >= 6 },
    { id: "practice5", emoji: "🎯", name: "Practice Pro",    test: (s) => s.practiceCount >= 5 },
    { id: "rethink3",  emoji: "🤔", name: "Re-thinker",      test: (s) => s.simplerCount >= 3 },
    { id: "curator",   emoji: "⭐", name: "Curator",         test: (s) => (s.favoritesCount || 0) >= 3 },
    { id: "legend",    emoji: "🌟", name: "Legendary (Lv.10)", test: (s) => s.level >= 10 },
  ];

  const RANKS = [
    "Curious Beginner", "Apprentice Thinker", "Concept Explorer",
    "Knowledge Seeker", "Brain Builder", "Insight Finder",
    "Mind Master", "STEM Wizard", "Genius in Training", "Galactic Scholar",
  ];

  // XP rewards
  const XP = {
    EXPLAIN: 10,
    SIMPLER: 5,
    PRACTICE: 15,
    REVEAL_ANSWER: 5,
    SELF_RIGHT: 10,
    FAVORITE: 5,
  };

  // localStorage keys
  const K = {
    HISTORY: "cc_history_v2",
    SUBJECT: "cc_subject_v1",
    COUNTRY: "cc_country_v1",
    THEME: "cc_theme_v1",
    STATS: "cc_stats_v1",
    BADGES: "cc_badges_v1",
    FAVORITES: "cc_favorites_v1",
  };

  // ====================================================================
  // Utilities
  // ====================================================================
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const nowHM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  // Returns the local-midnight UTC epoch in days for today, so streak math is
  // safe across timezones and free of date-string parsing.
  const todayKey = () => {
    const d = new Date();
    return Math.floor(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / (24 * 60 * 60 * 1000)
    );
  };
  const lsGet = (k, fallback) => {
    try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // ====================================================================
  // State
  // ====================================================================
  const state = {
    subject: lsGet(K.SUBJECT, "General"),
    country: lsGet(K.COUNTRY, "Default"),
    theme: lsGet(K.THEME, "midnight"),
    history: lsGet(K.HISTORY, []),
    favorites: lsGet(K.FAVORITES, []),
    stats: Object.assign({
      xp: 0, level: 1,
      totalQuestions: 0, practiceCount: 0, simplerCount: 0,
      subjectsUsed: {},
      streak: 0, lastActiveDay: null,
      favoritesCount: 0,
    }, lsGet(K.STATS, {})),
    badges: lsGet(K.BADGES, {}),
    currentId: null,
    view: "ask",
  };
  if (!Array.isArray(state.history)) state.history = [];
  if (!Array.isArray(state.favorites)) state.favorites = [];

  function persist() {
    lsSet(K.HISTORY, state.history.slice(-50));
    lsSet(K.FAVORITES, state.favorites.slice(-100));
    lsSet(K.STATS, state.stats);
    lsSet(K.BADGES, state.badges);
    lsSet(K.SUBJECT, state.subject);
    lsSet(K.COUNTRY, state.country);
    lsSet(K.THEME, state.theme);
  }

  function getCountryDef() {
    return COUNTRIES.find((c) => c.id === state.country) || COUNTRIES[0];
  }

  // ====================================================================
  // Sidebar (mobile drawer + backdrop)
  // ====================================================================
  function isMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }
  function openSidebar() {
    els.sidebar.classList.add("open");
    els.backdrop.classList.add("show");
    // Lock body scroll behind the drawer for nicer feel.
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.backdrop.classList.remove("show");
    document.body.style.overflow = "";
  }
  function closeSidebarOnMobile() {
    if (isMobile()) closeSidebar();
  }
  // If the viewport grows past the mobile breakpoint while the drawer is
  // open (rotate / resize), un-lock body scroll to avoid a stuck page.
  window.addEventListener("resize", () => {
    if (!isMobile()) {
      els.sidebar.classList.remove("open");
      els.backdrop.classList.remove("show");
      document.body.style.overflow = "";
    }
  });

  // ====================================================================
  // Levels
  // ====================================================================
  function levelFromXp(xp) {
    // Level n requires 50 * n*(n-1)/2 cumulative... simpler: floor(sqrt(xp/50)) + 1
    return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
  }
  function xpForLevel(lv) { return 50 * (lv - 1) * (lv - 1); }
  function xpForNext(lv) { return 50 * lv * lv; }

  // ====================================================================
  // Confetti
  // ====================================================================
  const Confetti = (() => {
    const canvas = $("confettiCanvas");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let raf = null;
    const COLORS = ["#e94560", "#ff6b81", "#00d4ff", "#fbbf24", "#4ade80", "#b14eff"];

    function resize() {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    function spawn(count = 80, originX = window.innerWidth / 2, originY = 80) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: originX, y: originY,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * -7 - 3,
          g: 0.18 + Math.random() * 0.05,
          size: 4 + Math.random() * 6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: pick(COLORS),
          life: 1,
        });
      }
      if (!raf) loop();
    }
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = window.innerWidth, h = window.innerHeight;
      particles = particles.filter((p) => p.life > 0 && p.y < h + 40);
      for (const p of particles) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.005;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        ctx.restore();
      }
      if (particles.length) raf = requestAnimationFrame(loop);
      else { raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
    return { spawn };
  })();

  // ====================================================================
  // Mascot
  // ====================================================================
  const Mascot = (() => {
    const root = $("mascot");
    const bubble = $("mascotBubble");
    let bubbleTimer = null;
    let stateTimer = null;
    function setState(s) {
      root.dataset.state = s;
      if (s === "celebrate") {
        clearTimeout(stateTimer);
        stateTimer = setTimeout(() => {
          if (root.dataset.state === "celebrate") root.dataset.state = "idle";
        }, 900);
      }
    }
    function say(text, ms = 3500) {
      bubble.textContent = text;
      bubble.classList.add("show");
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms);
    }
    return { setState, say };
  })();

  // ====================================================================
  // Toasts
  // ====================================================================
  const Toast = (() => {
    const stack = $("toastStack");
    function show({ icon = "🎉", title = "", msg = "" } = {}) {
      const el = document.createElement("div");
      el.className = "cc-toast";
      el.innerHTML = `
        <div class="cc-toast-icon">${icon}</div>
        <div>
          <div class="cc-toast-title">${escapeHtml(title)}</div>
          <div class="cc-toast-msg">${escapeHtml(msg)}</div>
        </div>`;
      stack.appendChild(el);
      setTimeout(() => el.remove(), 4800);
    }
    return { show };
  })();

  // ====================================================================
  // Text-to-speech
  // ====================================================================
  const TTS = (() => {
    let utter = null, currentBtn = null;
    function speak(text, btn) {
      stop();
      if (!("speechSynthesis" in window)) return;
      utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1;
      currentBtn = btn || null;
      if (currentBtn) currentBtn.classList.add("playing");
      utter.onend = () => { if (currentBtn) currentBtn.classList.remove("playing"); };
      utter.onerror = utter.onend;
      window.speechSynthesis.speak(utter);
    }
    function stop() {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (currentBtn) currentBtn.classList.remove("playing");
      currentBtn = null;
    }
    return { speak, stop };
  })();

  // ====================================================================
  // Voice input (Web Speech API)
  // ====================================================================
  const Voice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return { available: false, start() {} };
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    let onResult = null;
    let onError = null;
    rec.onresult = (e) => { if (onResult) onResult(e.results[0][0].transcript); };
    rec.onerror = (e) => { if (onError) onError(e.error || "error"); };
    rec.onend = () => { onResult = null; onError = null; };
    return {
      available: true,
      start(cb, errCb) {
        onResult = cb;
        onError = errCb || null;
        try { rec.start(); }
        catch (e) { if (onError) onError("start-failed"); }
      },
      stop() { try { rec.stop(); } catch {} },
    };
  })();

  // ====================================================================
  // Rich rendering: markdown + sanitize + KaTeX + highlight.js
  // ====================================================================
  function renderRich(el, text) {
    el.innerHTML = "";
    const raw = String(text || "");
    let html;
    if (window.marked && window.DOMPurify) {
      try {
        window.marked.setOptions({ breaks: true, gfm: true });
        html = window.DOMPurify.sanitize(window.marked.parse(raw));
      } catch { html = escapeHtml(raw).replace(/\n/g, "<br/>"); }
    } else {
      html = escapeHtml(raw).replace(/\n/g, "<br/>");
    }
    el.innerHTML = html;

    // Math
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        });
      } catch {}
    }

    // Code highlighting
    if (window.hljs) {
      $$("pre code", el).forEach((block) => {
        try { window.hljs.highlightElement(block); } catch {}
      });
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ====================================================================
  // DOM refs
  // ====================================================================
  const els = {
    subjects: $("subjects"),
    subjectTag: $("subjectTag"),
    askForm: $("askForm"),
    conceptInput: $("conceptInput"),
    explainBtn: $("explainBtn"),
    surpriseBtn: $("surpriseBtn"),
    micBtn: $("micBtn"),
    errorBox: $("errorBox"),
    loadingBox: $("loadingBox"),
    loadingMsg: $("loadingMsg"),
    resultBox: $("resultBox"),
    currentQuestion: $("currentQuestion"),
    cardStep: document.querySelector('#cardStep [data-key="step_by_step"]'),
    cardAnalogy: document.querySelector('#cardAnalogy [data-key="real_world_analogy"]'),
    cardVisual: document.querySelector('#cardVisual [data-key="visual_cue"]'),
    encourageBox: $("encourageBox"),
    simplerBtn: $("simplerBtn"),
    practiceBtn: $("practiceBtn"),
    favBtn: $("favBtn"),
    difficultySelect: $("difficultySelect"),
    simplerCard: $("simplerCard"),
    simplerBody: $("simplerBody"),
    practiceCard: $("practiceCard"),
    practiceDiff: $("practiceDiff"),
    practiceBody: $("practiceBody"),
    practiceAnswer: $("practiceAnswer"),
    practiceSolution: $("practiceSolution"),
    practiceAttempt: $("practiceAttempt"),
    practiceAnswerWrap: $("practiceAnswerWrap"),
    selfCheckBox: $("selfCheckBox"),
    yourAttempt: $("yourAttempt"),
    historySection: $("historySection"),
    historyList: $("historyList"),
    clearHistoryBtn: $("clearHistoryBtn"),
    menuToggle: $("menuToggle"),
    sidebar: $("sidebar"),
    chipsRow: $("chipsRow"),
    themes: $("themes"),
    backdrop: $("sidebarBackdrop"),
    countries: $("countries"),
    countryHelp: $("countryHelp"),
    countryHint: $("countryHint"),
    countryTag: $("countryTag"),
    badges: $("badges"),
    badgeCount: $("badgeCount"),
    levelNum: $("levelNum"),
    rankLabel: $("rankLabel"),
    xpCurrent: $("xpCurrent"),
    xpNext: $("xpNext"),
    xpFill: $("xpFill"),
    streakNum: $("streakNum"),
    conceptsNum: $("conceptsNum"),
    practiceNum: $("practiceNum"),
    viewTabs: $("viewTabs"),
    viewAsk: $("viewAsk"),
    viewFavorites: $("viewFavorites"),
    favoritesList: $("favoritesList"),
    favEmpty: $("favEmpty"),
    favTabCount: $("favTabCount"),
  };

  // ====================================================================
  // API
  // ====================================================================
  async function apiPost(path, body) {
    if (!API_BASE) throw new Error("API_BASE not configured. Edit config.js.");
    const headers = { "Content-Type": "application/json" };
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    let res;
    try {
      res = await fetch(API_BASE + path, { method: "POST", headers, body: JSON.stringify(body) });
    } catch {
      throw new Error("Could not reach the server. Is the backend running?");
    }
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = (data && (data.error || data.detail)) || `Request failed (${res.status}).`;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return data;
  }

  // ====================================================================
  // Gamification
  // ====================================================================
  function awardXp(amount, reason) {
    const before = state.stats.xp;
    state.stats.xp += amount;
    const oldLevel = levelFromXp(before);
    const newLevel = levelFromXp(state.stats.xp);
    state.stats.level = newLevel;
    if (newLevel > oldLevel) {
      Confetti.spawn(140, window.innerWidth / 2, window.innerHeight / 3);
      Mascot.setState("celebrate");
      const rank = RANKS[Math.min(newLevel - 1, RANKS.length - 1)];
      Toast.show({ icon: "🎉", title: `Level ${newLevel}!`, msg: `You're now a ${rank}` });
    }
    checkBadges();
    renderStats();
    renderBadges();
    persist();
    if (reason) {
      // tiny floating XP indicator could go here; bubble keeps it light
      Mascot.say(`+${amount} XP — ${reason}`, 1800);
    }
  }

  function bumpStreak() {
    const today = todayKey();
    const last = state.stats.lastActiveDay;
    // Guard against legacy string values from older versions of the app.
    const lastDay = typeof last === "number" ? last : null;
    if (lastDay === today) return;
    if (lastDay != null) {
      const diff = today - lastDay;
      if (diff === 1) state.stats.streak = (state.stats.streak || 0) + 1;
      else if (diff > 1) state.stats.streak = 1;
      // diff <= 0 (clock change / migration) -> leave streak alone
    } else {
      state.stats.streak = 1;
    }
    state.stats.lastActiveDay = today;
  }

  function trackSubject(s) {
    state.stats.subjectsUsed = state.stats.subjectsUsed || {};
    state.stats.subjectsUsed[s] = (state.stats.subjectsUsed[s] || 0) + 1;
  }

  function checkBadges() {
    state.stats.favoritesCount = state.favorites.length;
    for (const b of BADGES) {
      if (!state.badges[b.id] && b.test(state.stats)) {
        state.badges[b.id] = true;
        Toast.show({ icon: b.emoji, title: "Badge unlocked!", msg: b.name });
        Confetti.spawn(70, window.innerWidth - 80, 80);
      }
    }
  }

  // ====================================================================
  // Rendering
  // ====================================================================
  function renderSubjects() {
    els.subjects.innerHTML = "";
    SUBJECTS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cc-subject-btn" + (s === state.subject ? " active" : "");
      b.textContent = s;
      b.addEventListener("click", () => {
        state.subject = s;
        lsSet(K.SUBJECT, s);
        renderSubjects();
        els.subjectTag.textContent = "📚 " + s;
        closeSidebarOnMobile();
      });
      els.subjects.appendChild(b);
    });
    els.subjectTag.textContent = "📚 " + state.subject;
  }

  function renderCountries() {
    els.countries.innerHTML = "";
    COUNTRIES.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cc-country-btn" + (c.id === state.country ? " active" : "");
      b.title = c.help;
      b.innerHTML = `<span class="cc-flag">${c.flag}</span><span>${escapeHtml(c.short)}</span>`;
      b.addEventListener("click", () => {
        state.country = c.id;
        lsSet(K.COUNTRY, c.id);
        renderCountries();
        renderChips();
        renderCountryTag();
        Mascot.say(`${c.flag} ${c.label} mode${c.id === "Default" ? " off" : " on"}!`, 2200);
        closeSidebarOnMobile();
      });
      els.countries.appendChild(b);
    });
    const def = getCountryDef();
    els.countryHelp.textContent = def.help;
    els.countryHint.textContent = def.id === "Default" ? "curriculum" : def.short.toUpperCase();
  }

  function renderCountryTag() {
    const def = getCountryDef();
    if (def.id === "Default" || !def.tag) {
      els.countryTag.hidden = true;
      els.countryTag.textContent = "";
    } else {
      els.countryTag.hidden = false;
      els.countryTag.textContent = def.tag;
    }
  }

  function renderThemes() {
    els.themes.innerHTML = "";
    THEMES.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cc-theme-btn" + (t.id === state.theme ? " active" : "");
      b.title = t.label;
      b.textContent = t.emoji;
      b.addEventListener("click", () => {
        state.theme = t.id;
        document.documentElement.dataset.theme = t.id;
        lsSet(K.THEME, t.id);
        renderThemes();
        Mascot.say(`${t.emoji} ${t.label} mode!`, 1500);
        closeSidebarOnMobile();
      });
      els.themes.appendChild(b);
    });
  }

  function renderBadges() {
    els.badges.innerHTML = "";
    let unlocked = 0;
    BADGES.forEach((b) => {
      const isOn = !!state.badges[b.id];
      if (isOn) unlocked++;
      const el = document.createElement("div");
      el.className = "cc-badge" + (isOn ? " unlocked" : "");
      el.textContent = b.emoji;
      el.dataset.tip = isOn ? b.name : `🔒 ${b.name}`;
      els.badges.appendChild(el);
    });
    els.badgeCount.textContent = `${unlocked}/${BADGES.length}`;
  }

  function renderStats() {
    const xp = state.stats.xp || 0;
    const lv = levelFromXp(xp);
    const lo = xpForLevel(lv);
    const hi = xpForNext(lv);
    const pct = Math.max(0, Math.min(100, ((xp - lo) / (hi - lo)) * 100));
    els.levelNum.textContent = lv;
    els.rankLabel.textContent = RANKS[Math.min(lv - 1, RANKS.length - 1)];
    els.xpCurrent.textContent = xp - lo;
    els.xpNext.textContent = hi - lo;
    els.xpFill.style.width = pct + "%";
    els.streakNum.textContent = state.stats.streak || 0;
    els.conceptsNum.textContent = state.stats.totalQuestions || 0;
    els.practiceNum.textContent = state.stats.practiceCount || 0;
    els.favTabCount.textContent = state.favorites.length;
  }

  function renderChips() {
    els.chipsRow.innerHTML = "";
    const pool = SUGGESTIONS_BY_COUNTRY[state.country] || SUGGESTIONS_BY_COUNTRY.Default;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    shuffled.forEach((sug) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "cc-chip";
      c.textContent = sug.q;
      c.title = `Subject: ${sug.s}`;
      c.addEventListener("click", () => {
        els.conceptInput.value = sug.q;
        if (SUBJECTS.includes(sug.s)) {
          state.subject = sug.s;
          lsSet(K.SUBJECT, sug.s);
          renderSubjects();
        }
        els.conceptInput.focus();
      });
      els.chipsRow.appendChild(c);
    });
  }

  function getCurrent() {
    return state.history.find((e) => e.id === state.currentId) || null;
  }

  function isFavorited(id) { return state.favorites.some((f) => f.id === id); }

  function renderCurrent({ scroll = false } = {}) {
    const cur = getCurrent();
    if (!cur) { els.resultBox.hidden = true; return; }
    els.resultBox.hidden = false;
    els.currentQuestion.innerHTML =
      `<b>Your question</b> <span class="cc-tag">${escapeHtml(cur.subject)}</span><br/>${escapeHtml(cur.question)}`;
    renderRich(els.cardStep, cur.explanations.step_by_step);
    renderRich(els.cardAnalogy, cur.explanations.real_world_analogy);
    renderRich(els.cardVisual, cur.explanations.visual_cue);
    els.encourageBox.textContent = cur.encouragement;

    // re-trigger card animations
    $$(".cc-card-anim", els.resultBox).forEach((c) => {
      c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    });

    // simpler
    if (cur.simpler) {
      els.simplerCard.hidden = false;
      renderRich(els.simplerBody, cur.simpler);
    } else {
      els.simplerCard.hidden = true;
    }

    // practice
    if (cur.practice) {
      els.practiceCard.hidden = false;
      els.practiceDiff.textContent = cur.practice.difficulty;
      renderRich(els.practiceBody, cur.practice.problem);
      renderRich(els.practiceAnswer, cur.practice.answer);
      renderRich(els.practiceSolution, cur.practice.solution);
      els.practiceAttempt.value = cur.practice.attempt || "";
      if (cur.practice.attempt) {
        els.selfCheckBox.hidden = false;
        renderRich(els.yourAttempt, cur.practice.attempt);
      } else {
        els.selfCheckBox.hidden = true;
      }
      els.practiceAnswerWrap.open = !!cur.practice.revealed;
    } else {
      els.practiceCard.hidden = true;
    }

    // fav button state
    els.favBtn.textContent = isFavorited(cur.id) ? "★ Favorited" : "☆ Favorite";

    if (scroll) {
      els.resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historySection.hidden = true;
      els.historyList.innerHTML = "";
      return;
    }
    els.historySection.hidden = false;
    els.historyList.innerHTML = "";
    state.history.slice().reverse().forEach((e) => {
      const isCur = e.id === state.currentId;
      const det = document.createElement("details");
      det.className = "cc-history-item";
      if (isCur) det.open = true;
      det.innerHTML = `
        <summary>${isCur ? "▶ " : ""}[${escapeHtml(e.timestamp)}] (${escapeHtml(e.subject)}) ${escapeHtml(e.question.slice(0, 90))}</summary>
        <div class="cc-history-body">
          <h4>🔢 Step-by-Step</h4><div class="cc-body" data-render="step"></div>
          <h4>🌍 Real-World Analogy</h4><div class="cc-body" data-render="analogy"></div>
          <h4>🎨 Visual Cue</h4><div class="cc-body" data-render="visual"></div>
          ${e.simpler ? `<h4>🧒 Like You're 10</h4><div class="cc-body" data-render="simpler"></div>` : ""}
          ${e.practice ? `
            <h4>🎯 Practice (${escapeHtml(e.practice.difficulty)})</h4>
            <div class="cc-body" data-render="practice"></div>
            <p><b>Answer:</b> <span data-render="answer"></span></p>
            <p><b>Solution:</b></p>
            <div class="cc-body" data-render="solution"></div>` : ""}
          ${!isCur ? `<button class="cc-btn cc-btn-ghost" data-show="${e.id}" style="margin-top:0.7rem">Show this above</button>` : ""}
        </div>`;
      els.historyList.appendChild(det);
      // populate rendered bodies
      renderRich(det.querySelector('[data-render="step"]'), e.explanations.step_by_step);
      renderRich(det.querySelector('[data-render="analogy"]'), e.explanations.real_world_analogy);
      renderRich(det.querySelector('[data-render="visual"]'), e.explanations.visual_cue);
      if (e.simpler) renderRich(det.querySelector('[data-render="simpler"]'), e.simpler);
      if (e.practice) {
        renderRich(det.querySelector('[data-render="practice"]'), e.practice.problem);
        renderRich(det.querySelector('[data-render="answer"]'), e.practice.answer);
        renderRich(det.querySelector('[data-render="solution"]'), e.practice.solution);
      }
      const showBtn = det.querySelector("[data-show]");
      if (showBtn) showBtn.addEventListener("click", () => {
        state.currentId = showBtn.getAttribute("data-show");
        renderCurrent({ scroll: true });
        renderHistory();
      });
    });
  }

  function renderFavorites() {
    els.favoritesList.innerHTML = "";
    if (!state.favorites.length) {
      els.favEmpty.hidden = false;
      return;
    }
    els.favEmpty.hidden = true;
    state.favorites.slice().reverse().forEach((e) => {
      const det = document.createElement("details");
      det.className = "cc-history-item";
      det.innerHTML = `
        <summary>⭐ [${escapeHtml(e.timestamp)}] (${escapeHtml(e.subject)}) ${escapeHtml(e.question.slice(0, 90))}</summary>
        <div class="cc-history-body">
          <h4>🔢 Step-by-Step</h4><div class="cc-body" data-render="step"></div>
          <h4>🌍 Real-World Analogy</h4><div class="cc-body" data-render="analogy"></div>
          <h4>🎨 Visual Cue</h4><div class="cc-body" data-render="visual"></div>
          <button class="cc-btn cc-btn-ghost" data-unfav="${e.id}" style="margin-top:0.7rem">★ Remove favorite</button>
        </div>`;
      els.favoritesList.appendChild(det);
      renderRich(det.querySelector('[data-render="step"]'), e.explanations.step_by_step);
      renderRich(det.querySelector('[data-render="analogy"]'), e.explanations.real_world_analogy);
      renderRich(det.querySelector('[data-render="visual"]'), e.explanations.visual_cue);
      det.querySelector("[data-unfav]").addEventListener("click", () => {
        state.favorites = state.favorites.filter((f) => f.id !== e.id);
        state.stats.favoritesCount = state.favorites.length;
        persist();
        renderFavorites();
        renderStats();
        const cur = getCurrent();
        if (cur) els.favBtn.textContent = isFavorited(cur.id) ? "★ Favorited" : "☆ Favorite";
      });
    });
  }

  function switchView(view) {
    state.view = view;
    $$(".cc-tab", els.viewTabs).forEach((t) => {
      t.classList.toggle("active", t.dataset.view === view);
    });
    els.viewAsk.hidden = view !== "ask";
    els.viewFavorites.hidden = view !== "favorites";
    if (view === "favorites") renderFavorites();
  }

  // ====================================================================
  // UI helpers
  // ====================================================================
  function showError(msg) {
    els.errorBox.textContent = "😬 " + msg;
    els.errorBox.hidden = false;
  }
  function clearError() { els.errorBox.hidden = true; els.errorBox.textContent = ""; }
  function setLoading(on) {
    els.loadingBox.hidden = !on;
    if (on) {
      els.loadingMsg.textContent = "Loading…";
      Mascot.setState("thinking");
    } else {
      Mascot.setState("idle");
    }
  }
  function setBusy(busy) {
    els.explainBtn.disabled = busy;
    els.simplerBtn.disabled = busy;
    els.practiceBtn.disabled = busy;
  }

  // ====================================================================
  // Handlers
  // ====================================================================
  async function onAsk(e) {
    e.preventDefault();
    clearError();
    const q = els.conceptInput.value.trim();
    if (!q) return;

    setBusy(true);
    setLoading(true);
    try {
      const data = await apiPost("/api/explain", {
        concept: q,
        subject: state.subject,
        country: state.country,
      });
      const entry = {
        id: uid(),
        timestamp: nowHM(),
        question: q,
        subject: state.subject,
        country: state.country,
        explanations: {
          step_by_step: String(data.step_by_step || ""),
          real_world_analogy: String(data.real_world_analogy || ""),
          visual_cue: String(data.visual_cue || ""),
        },
        simpler: null,
        practice: null,
        encouragement: pick(ENCOURAGEMENTS),
      };
      state.history.push(entry);
      state.currentId = entry.id;

      // Stats
      state.stats.totalQuestions += 1;
      trackSubject(state.subject);
      bumpStreak();
      awardXp(XP.EXPLAIN, "explanation");
      Mascot.setState("celebrate");
      Confetti.spawn(40, window.innerWidth - 60, window.innerHeight - 80);

      // If the user is viewing Favorites, snap back to Ask so they see the answer.
      if (state.view !== "ask") switchView("ask");

      persist();
      renderCurrent({ scroll: true });
      renderHistory();
      renderStats();
      renderChips();
    } catch (err) {
      showError(err.message || "Something went wrong.");
      Mascot.setState("idle");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  async function onSimpler() {
    const cur = getCurrent();
    if (!cur) return;
    clearError();
    setBusy(true);
    setLoading(true);
    try {
      const data = await apiPost("/api/simpler", {
        concept: cur.question,
        subject: cur.subject,
        country: cur.country || state.country,
      });
      cur.simpler = String(data.explanation || "").trim();
      state.stats.simplerCount = (state.stats.simplerCount || 0) + 1;
      awardXp(XP.SIMPLER, "even simpler");
      persist();
      renderCurrent();
      renderHistory();
      // Scroll the simpler card into view.
      els.simplerCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  async function onPractice() {
    const cur = getCurrent();
    if (!cur) return;
    clearError();
    setBusy(true);
    setLoading(true);
    try {
      const data = await apiPost("/api/practice", {
        concept: cur.question,
        subject: cur.subject,
        country: cur.country || state.country,
        difficulty: els.difficultySelect.value,
      });
      cur.practice = {
        difficulty: String(data.difficulty || els.difficultySelect.value),
        problem: String(data.problem || ""),
        answer: String(data.answer || ""),
        solution: String(data.solution || ""),
        attempt: "",
        revealed: false,
        selfChecked: false,
      };
      state.stats.practiceCount = (state.stats.practiceCount || 0) + 1;
      awardXp(XP.PRACTICE, "practice problem");
      persist();
      renderCurrent();
      renderHistory();
      // Scroll the new practice card into view (it's at the bottom of the result).
      els.practiceCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  function onToggleFavorite() {
    const cur = getCurrent();
    if (!cur) return;
    if (isFavorited(cur.id)) {
      state.favorites = state.favorites.filter((f) => f.id !== cur.id);
    } else {
      state.favorites.push({
        id: cur.id, timestamp: cur.timestamp, question: cur.question,
        subject: cur.subject, explanations: cur.explanations,
      });
      awardXp(XP.FAVORITE, "favorite saved");
      Confetti.spawn(35, window.innerWidth / 2, 120);
    }
    state.stats.favoritesCount = state.favorites.length;
    persist();
    els.favBtn.textContent = isFavorited(cur.id) ? "★ Favorited" : "☆ Favorite";
    renderStats();
    if (state.view === "favorites") renderFavorites();
  }

  function onClearHistory() {
    if (!state.history.length) return;
    if (!confirm("Clear all session history? (Favorites and stats are kept.)")) return;
    state.history = [];
    state.currentId = null;
    persist();
    renderCurrent();
    renderHistory();
  }

  function onSurprise() {
    const pool = SUGGESTIONS_BY_COUNTRY[state.country] || SUGGESTIONS_BY_COUNTRY.Default;
    const sug = pick(pool);
    els.conceptInput.value = sug.q;
    if (SUBJECTS.includes(sug.s)) {
      state.subject = sug.s;
      lsSet(K.SUBJECT, sug.s);
      renderSubjects();
    }
    els.conceptInput.focus();
  }

  function onMic() {
    if (!Voice.available) {
      Mascot.say("Voice input isn't supported in this browser 🎤", 2400);
      return;
    }
    Mascot.say("Listening… speak now! 🎤", 2500);
    Voice.start(
      (text) => {
        if (text) {
          els.conceptInput.value = text;
          els.conceptInput.focus();
          Mascot.say("Got it! Hit Explain when you're ready ✨", 2200);
        }
      },
      (err) => {
        const reason = err === "not-allowed"
          ? "Mic permission denied. Enable it in browser settings."
          : err === "no-speech"
          ? "I didn't catch that — try again 🎤"
          : `Voice input failed (${err || "unknown"})`;
        Mascot.say(reason, 3000);
      }
    );
  }

  function onRevealAnswer() {
    const cur = getCurrent();
    if (!cur || !cur.practice) return;
    if (cur.practice.revealed) return;
    cur.practice.revealed = true;
    cur.practice.attempt = els.practiceAttempt.value.trim();
    if (cur.practice.attempt) {
      els.selfCheckBox.hidden = false;
      renderRich(els.yourAttempt, cur.practice.attempt);
      awardXp(XP.REVEAL_ANSWER, "tried first");
    }
    persist();
  }

  function onSelfCheck(result) {
    const cur = getCurrent();
    if (!cur || !cur.practice || cur.practice.selfChecked) return;
    cur.practice.selfChecked = true;
    if (result === "yes") {
      Confetti.spawn(120, window.innerWidth / 2, window.innerHeight / 2);
      Mascot.setState("celebrate");
      Mascot.say("🎉 You crushed it!", 2500);
      awardXp(XP.SELF_RIGHT, "nailed it!");
    } else {
      Mascot.say("Almost! Try the simpler explanation 💪", 2500);
    }
    persist();
  }

  // ====================================================================
  // Bindings
  // ====================================================================
  function bind() {
    els.askForm.addEventListener("submit", onAsk);
    els.simplerBtn.addEventListener("click", onSimpler);
    els.practiceBtn.addEventListener("click", onPractice);
    els.favBtn.addEventListener("click", onToggleFavorite);
    els.clearHistoryBtn.addEventListener("click", onClearHistory);
    els.surpriseBtn.addEventListener("click", onSurprise);
    els.micBtn.addEventListener("click", onMic);
    els.menuToggle.addEventListener("click", () => {
      if (els.sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
    els.backdrop.addEventListener("click", closeSidebar);

    if (!Voice.available) els.micBtn.style.display = "none";

    // Tabs
    $$(".cc-tab", els.viewTabs).forEach((t) => {
      t.addEventListener("click", () => switchView(t.dataset.view));
    });

    // TTS / copy buttons (delegated)
    document.addEventListener("click", (e) => {
      const tts = e.target.closest("[data-tts]");
      if (tts) {
        const cur = getCurrent();
        if (!cur) return;
        const key = tts.dataset.tts;
        const text = key === "simpler"
          ? (cur.simpler || "")
          : (cur.explanations[key] || "");
        if (!text) return;
        // strip markdown for cleaner speech
        const plain = text.replace(/[#*`>_~]/g, "").replace(/\$+/g, "");
        if (tts.classList.contains("playing")) { TTS.stop(); }
        else { TTS.speak(plain, tts); }
      }
      const cp = e.target.closest("[data-copy]");
      if (cp) {
        const cur = getCurrent();
        if (!cur) return;
        const text = cur.explanations[cp.dataset.copy] || "";
        navigator.clipboard?.writeText(text).then(() => {
          const original = cp.textContent;
          cp.textContent = "✅";
          setTimeout(() => (cp.textContent = original), 1100);
        });
      }
      const self = e.target.closest("[data-self]");
      if (self) onSelfCheck(self.dataset.self);
    });

    // Reveal-answer hook
    els.practiceAnswerWrap.addEventListener("toggle", () => {
      if (els.practiceAnswerWrap.open) onRevealAnswer();
    });

    // Keyboard shortcuts
    els.conceptInput.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        els.askForm.requestSubmit();
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && els.sidebar.classList.contains("open")) {
        closeSidebar();
      }
    });
  }

  // ====================================================================
  // Init
  // ====================================================================
  function init() {
    document.documentElement.dataset.theme = state.theme;
    renderSubjects();
    renderCountries();
    renderCountryTag();
    renderThemes();
    renderBadges();
    renderStats();
    renderChips();
    bind();

    if (state.history.length) {
      state.currentId = state.history[state.history.length - 1].id;
      renderCurrent();
    }
    renderHistory();

    // Welcome
    setTimeout(() => {
      const lv = levelFromXp(state.stats.xp || 0);
      const cflag = getCountryDef().flag;
      const cmode = state.country === "Default" ? "" : ` ${cflag}`;
      if ((state.stats.totalQuestions || 0) === 0) {
        Mascot.say(`Hey dost!${cmode} Ask me any STEM question 🚀`, 4000);
      } else {
        Mascot.say(`Welcome back dost,${cmode} Lv.${lv}! 🔥 ${state.stats.streak || 1}-day streak`, 3500);
      }
    }, 600);

    // Bump streak passively on app open if user already has stats
    if (state.stats.totalQuestions > 0) bumpStreak();
    persist();
    renderStats();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
