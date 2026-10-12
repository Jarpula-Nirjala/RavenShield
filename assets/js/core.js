/* =========================================================
   RavenShield core
   - Animated raven logo (eyelids, glowing iris, flare, beam)
   - Preloader + "blink" page transitions
   - Header / footer injection
   - Sealed evidence log (SHA-256 hash chain, localStorage)
   - Toasts, utilities, background constellation
   ========================================================= */
(function () {
  "use strict";

  const RS = (window.RS = window.RS || {});
  const LOGO_SRC = "assets/img/raven-shield.png?v=16";
  const BASE_SRC = "assets/img/raven-base.png?v=6";
  const HEAD_SRC = "assets/img/raven-head.png?v=6";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Icons ---------------- */
  const P = {
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    chain: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    hook: '<path d="M18 3v8a6 6 0 0 1-12 0v-1"/><path d="m3 13 3-3 3 3"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .13-5.35 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    wifiOff: '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M12 20h.01"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    paper: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  };
  RS.icon = (name, cls) =>
    `<svg ${cls ? `class="${cls}" ` : ""}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.shield}</svg>`;

  /* ---------------- Tool registry ---------------- */
  RS.tools = [
    { chips: ["Decoy minted", "Tripwire armed", "Leak traced"], id: "vault", file: "vault.html", name: "RavenVault", icon: "key", tag: "Decoy identities & credential tripwires", core: true },
    { chips: ["Fingerprint hidden", "Trap fact planted", "Leak detected"], id: "rag", file: "rag.html", name: "RavenRAG", icon: "file", tag: "Trap facts & invisible watermarks for AI knowledge bases", core: true },
    { chips: ["Injection blocked", "Payload sanitized", "Score 92"], id: "shield", file: "shield.html", name: "RavenShield Firewall", icon: "shieldCheck", tag: "3-layer prompt-injection firewall", core: true },
    { chips: ["Intent: extraction", "Bait issued", "Client fingerprinted"], id: "honeypot", file: "honeypot.html", name: "RavenHoneypot", icon: "flame", tag: "Decoy AI assistant that profiles attackers", core: true },
    { chips: ["Record sealed", "SHA-256 chained", "Chain intact"], id: "audit", file: "audit.html", name: "RavenAudit", icon: "chain", tag: "Tamper-evident hash-chained action log", core: true },
    { chips: ["Skill scanned", "Exfil host flagged", "Heartbeat OK"], id: "agent", file: "agent.html", name: "RavenAgent", icon: "bot", tag: "Agent skill scanner & action timeline", core: true },
    { chips: ["AWS key found", "Entropy 4.9", "Redacted copy"], id: "secrets", file: "secrets.html", name: "Secret Scanner", icon: "scan", tag: "Find leaked API keys & tokens in code", core: false },
    { chips: ["≈ 96 bits", "Not breached", "Passphrase forged"], id: "password", file: "password.html", name: "Password Forge", icon: "lock", tag: "Strength, breach check & generator", core: false },
    { chips: ["Lookalike domain", "Punycode decoded", "Score 76"], id: "phishing", file: "phishing.html", name: "Phish Lens", icon: "hook", tag: "Dissect suspicious URLs & lookalikes", core: false },
    { chips: ["SHA-256 match", "File notarized", "Checksums exported"], id: "integrity", file: "integrity.html", name: "Integrity Hasher", icon: "hash", tag: "Hash & verify files locally", core: false },
  ];

  RS.featLogo = (id, cls = "") => `<img class="feat-logo ${cls}" src="assets/img/features/${id}.svg" alt="" loading="lazy">`;

  /* ---------------- Local accounts (optional, stored on this device) ---------------- */
  RS.auth = {
    users() { return RS.store.get("users", []); },
    current() { return RS.store.get("session", null); },
    async hash(password, salt) {
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 150000 }, key, 256);
      return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
    },
    async signUp(name, email, password) {
      email = email.trim().toLowerCase();
      const users = RS.auth.users();
      if (users.some((u) => u.email === email)) throw new Error("An account with this email already exists on this device.");
      const salt = RS.randStr(16);
      const user = { id: RS.uid("u_"), name: name.trim(), email, salt, hash: await RS.auth.hash(password, salt), created: Date.now() };
      users.push(user);
      RS.store.set("users", users);
      RS.store.set("session", { id: user.id, name: user.name, email, since: Date.now() });
      return user;
    },
    async signIn(email, password) {
      email = email.trim().toLowerCase();
      const user = RS.auth.users().find((u) => u.email === email);
      if (!user || (await RS.auth.hash(password, user.salt)) !== user.hash) throw new Error("Incorrect email or password.");
      RS.store.set("session", { id: user.id, name: user.name, email, since: Date.now() });
      return user;
    },
    signOut() { RS.store.del("session"); },
  };
  RS.initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  /* ---------------- Utilities ---------------- */
  RS.$ = (s, r = document) => r.querySelector(s);
  RS.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  RS.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  RS.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  RS.rand = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  RS.pick = (arr) => arr[RS.rand(arr.length)];
  RS.randStr = (len, chars = "abcdefghijklmnopqrstuvwxyz0123456789") => {
    const a = new Uint32Array(len); crypto.getRandomValues(a);
    return Array.from(a, (v) => chars[v % chars.length]).join("");
  };
  RS.uid = (p = "") => p + Date.now().toString(36) + RS.randStr(6);
  RS.fmtTime = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
  RS.ago = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  };
  RS.sha256 = async (input) => {
    const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  };
  RS.copy = async (text, label = "Copied to clipboard") => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    RS.toast(label, "", "ok");
  };
  RS.download = (name, content, type = "text/plain") => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  RS.readFile = (file, as = "text") => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
    as === "buffer" ? r.readAsArrayBuffer(file) : r.readAsText(file);
  });
  RS.store = {
    get(k, d) { try { const v = localStorage.getItem("rs." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("rs." + k, JSON.stringify(v)); return true; } catch (e) { RS.toast("Storage full or blocked", "Your browser refused to save data.", "warn"); return false; } },
    del(k) { try { localStorage.removeItem("rs." + k); } catch (e) {} },
  };
  RS.entropy = (s) => {
    if (!s) return 0;
    const f = {}; for (const c of s) f[c] = (f[c] || 0) + 1;
    let e = 0; const n = s.length;
    for (const k in f) { const p = f[k] / n; e -= p * Math.log2(p); }
    return e;
  };

  /* ---------------- Toasts ---------------- */
  RS.toast = (title, body = "", kind = "info", ms = 4200) => {
    let host = document.getElementById("rs-toasts");
    if (!host) { host = document.createElement("div"); host.id = "rs-toasts"; document.body.appendChild(host); }
    const icon = { ok: "check", warn: "alert", danger: "alert", info: "info" }[kind] || "info";
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.setAttribute("role", "status");
    t.innerHTML = `${RS.icon(icon)}<div><strong>${RS.esc(title)}</strong>${body ? `<span>${RS.esc(body)}</span>` : ""}</div>`;
    host.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
  };

  /* ---------------- Evidence log (hash chain) ---------------- */
  const GENESIS = "0".repeat(64);
  const EV_KEY = "evidence";
  let evQueue = Promise.resolve();

  const canonical = (r) => JSON.stringify([r.seq, r.id, r.ts, r.source, r.kind, r.severity, r.title, r.detail ?? null, r.prev]);
  RS.sealRecord = async (r) => RS.sha256(canonical(r));

  RS.evidence = {
    all() { return RS.store.get(EV_KEY, []); },
    log(entry) {
      evQueue = evQueue.then(async () => {
        const list = RS.evidence.all();
        const last = list[list.length - 1];
        const rec = {
          seq: list.length,
          id: RS.uid("ev_"),
          ts: Date.now(),
          source: entry.source || "system",
          kind: entry.kind || "event",
          severity: entry.severity || "info",
          title: String(entry.title || "Event").slice(0, 200),
          detail: entry.detail ?? null,
          prev: last ? last.hash : GENESIS,
        };
        rec.hash = await RS.sealRecord(rec);
        list.push(rec);
        if (list.length > 5000) RS.toast("Evidence log is large", "Export and clear old records from the Dashboard.", "warn");
        RS.store.set(EV_KEY, list);
        window.dispatchEvent(new CustomEvent("rs:evidence", { detail: rec }));
        if (rec.severity === "high" || rec.severity === "critical") {
          RS.notify("RavenShield alert: " + rec.title, rec.source);
        }
        return rec;
      });
      return evQueue;
    },
    async verify(list) {
      list = list || RS.evidence.all();
      let prev = GENESIS;
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (r.prev !== prev) return { ok: false, index: i, reason: "Link broken: record does not point at the previous record's hash" };
        if (r.seq !== i) return { ok: false, index: i, reason: "Sequence gap: a record was removed or reordered" };
        const h = await RS.sealRecord(r);
        if (h !== r.hash) return { ok: false, index: i, reason: "Seal mismatch: record content was modified after sealing" };
        prev = r.hash;
      }
      return { ok: true, count: list.length, head: prev };
    },
    clear() { RS.store.set(EV_KEY, []); window.dispatchEvent(new CustomEvent("rs:evidence", { detail: null })); },
    replace(list) { RS.store.set(EV_KEY, list); window.dispatchEvent(new CustomEvent("rs:evidence", { detail: null })); },
    exportJSON() {
      const list = RS.evidence.all();
      return JSON.stringify({ format: "ravenshield-evidence/v1", exportedAt: new Date().toISOString(), algorithm: "SHA-256 hash chain", genesis: GENESIS, records: list }, null, 2);
    },
  };
  window.addEventListener("storage", (e) => {
    if (e.key === "rs." + EV_KEY) window.dispatchEvent(new CustomEvent("rs:evidence", { detail: null }));
  });

  RS.notify = (title, body) => {
    try {
      if (RS.store.get("settings", {}).notify && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "assets/img/icon-192.png" });
      }
    } catch (e) {}
  };

  /* ---------------- Raven logo ---------------- */
  // Eye geometry, in logo image coordinates (286 x 234)
  const EYE = { cx: 177, cy: 74 };
  const SOCKET = "M159.5,65.5 C170,65.5 181,67.5 186.5,71 C190.5,73.8 190.5,78.5 186.5,80.3 C181,82.6 172,81 166.5,77.5 C162.5,74.6 160.5,70.5 159.5,65.5 Z";
  const LID_TOP = "M140,30 H210 V77.5 C199,80.5 186,80.3 176,77.6 C169,75.7 164,72.5 159,68.5 L140,64 Z";
  const LID_BOT = "M140,110 H210 V78.3 C199,81.3 186,81.1 176,78.4 C169,76.5 164,73.3 159,69.3 L140,64.8 Z";
  const SEAM = "M160,68.8 C164.5,72.6 169,75.9 176,78 C186,80.7 196,80.6 189,79.4";
  let logoCount = 0;

  RS.logo = function (opts = {}) {
    const n = ++logoCount;
    const id = (s) => `rl${n}-${s}`;
    const el = document.createElement("div");
    const alive = !!opts.alive && !REDUCED;
    el.className = "rl" + (opts.fx ? " fx" : "") + (opts.beam ? " beam" : "") + (alive ? " alive" : "");
    el.style.setProperty("--eye-x", (EYE.cx / 286) * 100 + "%");
    el.style.setProperty("--eye-y", (EYE.cy / 234) * 100 + "%");
    if (opts.closed) el.classList.add("closed");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "RavenShield logo");
    el.innerHTML = `
      <div class="rl-aura"></div>
      <div class="rl-orbit"><i></i></div>
      <div class="rl-orbit o2"><i></i></div>
      <div class="rl-stage">
        ${opts.fx && opts.show3d ? `<svg class="rl-layer rl-empty" viewBox="0 0 286 234" aria-hidden="true">
          <defs>
            <linearGradient id="${id("fr")}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".45" stop-color="#eef2ff"/><stop offset=".7" stop-color="#a855f7"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
            <radialGradient id="${id("in")}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#312e81"/><stop offset=".6" stop-color="#140f35"/><stop offset="1" stop-color="#05040f"/></radialGradient>
            <clipPath id="${id("sc")}"><path d="M48,52 L152,10 L242,45 L243,118 C240,168 205,198 152,226 C99,198 62,170 50,120 Z"/></clipPath>
            <filter id="${id("flex")}" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.009 0.02" numOctaves="2" seed="4"><animate attributeName="baseFrequency" dur="6s" values="0.009 0.02;0.016 0.011;0.009 0.02" repeatCount="indefinite"/></feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <g filter="url(#${id("flex")})">
            <path d="M48,52 L152,10 L242,45 L243,118 C240,168 205,198 152,226 C99,198 62,170 50,120 Z" fill="url(#${id("in")})"/>
            <g clip-path="url(#${id("sc")})" class="rl-energy">
              <path class="wv w1" d="M-60,80 Q-20,64 20,80 T100,80 T180,80 T260,80 T340,80 T420,80"/>
              <path class="wv w2" d="M-60,120 Q-20,104 20,120 T100,120 T180,120 T260,120 T340,120 T420,120"/>
              <path class="wv w3" d="M-60,160 Q-20,144 20,160 T100,160 T180,160 T260,160 T340,160 T420,160"/>
              <circle class="core" cx="150" cy="118" r="34"/>
            </g>
            <path d="M48,52 L152,10 L242,45 L243,118 C240,168 205,198 152,226 C99,198 62,170 50,120 Z" fill="none" stroke="url(#${id("fr")})" stroke-width="11" stroke-linejoin="round"/>
          </g>
        </svg>` : ""}
        <svg class="rl-layer rl-base" viewBox="0 0 286 234" aria-hidden="true"><image class="rl-img" href="${alive ? BASE_SRC : LOGO_SRC}" width="286" height="234"/></svg>
        <div class="rl-head">
          <div class="rl-beam"></div>
          <svg class="rl-layer" viewBox="0 0 286 234" aria-hidden="true">
            <defs>
              <clipPath id="${id("sock")}"><path d="${SOCKET}"/></clipPath>
              <radialGradient id="${id("iris")}" cx="0.55" cy="0.5" r="0.6">
                <stop offset="0" stop-color="#ffffff"/>
                <stop offset="0.22" stop-color="#d4feff"/>
                <stop offset="0.5" stop-color="#2ee6f5"/>
                <stop offset="1" stop-color="#03505e"/>
              </radialGradient>
              <radialGradient id="${id("glow")}">
                <stop offset="0" stop-color="#7ff6ff" stop-opacity="0.95"/>
                <stop offset="0.35" stop-color="#2ee6f5" stop-opacity="0.45"/>
                <stop offset="1" stop-color="#2ee6f5" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="${id("lid")}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#050d15"/>
                <stop offset="0.75" stop-color="#07121b"/>
                <stop offset="1" stop-color="#123441"/>
              </linearGradient>
              <linearGradient id="${id("lidb")}" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stop-color="#050b12"/>
                <stop offset="1" stop-color="#112530"/>
              </linearGradient>
              <filter id="${id("blur")}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter>
              <filter id="${id("soft")}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.9"/></filter>
            </defs>
            ${alive ? `<image class="rl-img" href="${HEAD_SRC}" width="286" height="234"/>` : ""}
            <ellipse class="eye-glow" cx="${EYE.cx}" cy="${EYE.cy}" rx="22" ry="13" fill="url(#${id("glow")})" filter="url(#${id("blur")})"/>
            <g clip-path="url(#${id("sock")})">
              <rect x="150" y="55" width="50" height="35" fill="#04121a"/>
              <g class="iris">
                <ellipse cx="${EYE.cx + 1}" cy="${EYE.cy}" rx="13" ry="7" transform="rotate(22 ${EYE.cx} ${EYE.cy})" fill="url(#${id("iris")})"/>
                <ellipse class="eye-core" cx="${EYE.cx + 2}" cy="${EYE.cy + 1}" rx="5.5" ry="3.6" fill="#ffffff" opacity="0.95" filter="url(#${id("soft")})"/>
                <ellipse cx="${EYE.cx + 3}" cy="${EYE.cy + 1.2}" rx="1.3" ry="3.4" fill="#021018" opacity="0.85" transform="rotate(14 ${EYE.cx + 3} ${EYE.cy + 1})"/>
                <circle cx="${EYE.cx + 5.5}" cy="${EYE.cy - 1.3}" r="1.25" fill="#fff"/>
              </g>
              <g class="lid lid-top">
                <path d="${LID_TOP}" fill="url(#${id("lid")})"/>
                <path d="M159,68.5 C164,72.5 169,75.7 176,77.6 C186,80.3 199,80.5 210,77.5" fill="none" stroke="#3ad7e8" stroke-opacity="0.55" stroke-width="0.8"/>
              </g>
              <g class="lid lid-bot">
                <path d="${LID_BOT}" fill="url(#${id("lidb")})"/>
              </g>
            </g>
            <path class="seam" d="${SEAM}" fill="none" stroke="#9ff8ff" stroke-width="1.3" stroke-linecap="round" filter="url(#${id("soft")})"/>
            <g class="flare" style="mix-blend-mode:screen">
              <ellipse cx="${EYE.cx + 2}" cy="${EYE.cy + 1}" rx="46" ry="1.6" fill="#dffdff"/>
              <ellipse cx="${EYE.cx + 2}" cy="${EYE.cy + 1}" rx="1.4" ry="16" fill="#dffdff" opacity="0.8"/>
              <circle cx="${EYE.cx + 2}" cy="${EYE.cy + 1}" r="7" fill="#ffffff" filter="url(#${id("blur")})"/>
            </g>
          </svg>
          <div class="rl-screech"><i></i><i></i><i></i><i></i></div>
          <div class="rl-pulse"><span></span><span></span><span></span></div>
        </div>
      </div>
      <div class="rl-shine"></div>
      <div class="rl-glitch"><img src="${LOGO_SRC}" alt=""><img src="${LOGO_SRC}" alt=""></div>`;
    const shine = el.querySelector(".rl-shine");
    shine.style.webkitMaskImage = shine.style.maskImage = `url(${LOGO_SRC})`;

    const iris = el.querySelector(".iris");
    const headEl = el.querySelector(".rl-head");
    let timer = null;
    let busy = false;
    let running = true;

    const retrigger = (cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    const setT = (ms) => el.style.setProperty("--lid-t", ms + "ms");

    /* ---- head rig: spring physics, bird-like "snap and hold" ---- */
    const KEYS = ["rx", "ry", "rz", "tx", "ty", "tz", "s"];
    const cur = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, s: 1 };
    const vel = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, s: 0 };
    const look = { rx: 0, ry: 0, rz: 0 };       // where the bird wants to look (pointer / random)
    let pose = null;                            // action override (emerge, peck…)
    let stiff = 0.16, damp = 0.66;
    let pointer = null, lastPointer = 0, nextSnap = 0;
    let shakeUntil = 0;

    function frame(t) {
      if (!running) return;
      if (!document.hidden && el.isConnected) {
        // bird heads move in quick snaps, then freeze
        if (!pose && t > nextSnap) {
          if (pointer && t - lastPointer < 4000) {
            const b = el.getBoundingClientRect();
            const nx = (pointer.x - (b.left + b.width * 0.58)) / Math.max(260, b.width * 1.6);
            const ny = (pointer.y - (b.top + b.height * 0.45)) / Math.max(220, b.height * 1.6);
            look.ry = Math.max(-34, Math.min(34, nx * 40));
            look.rx = Math.max(-16, Math.min(16, -ny * 22));
            look.rz = Math.max(-10, Math.min(10, ny * 10 + nx * 3));
          } else if (Math.random() < 0.6) {
            look.ry = (Math.random() - 0.5) * 50; look.rx = (Math.random() - 0.4) * 18; look.rz = (Math.random() - 0.5) * 12;
          }
          nextSnap = t + 260 + Math.random() * (pointer && t - lastPointer < 4000 ? 380 : 1500);
        }
        const breathe = Math.sin(t / 900) * 0.9, bob = Math.sin(t / 650) * 0.6;
        const tgt = pose || { rx: look.rx, ry: look.ry, rz: look.rz + breathe, tx: 0, ty: bob * 0.4, tz: 0, s: 1 };
        for (const k of KEYS) {
          const goal = tgt[k] ?? (k === "s" ? 1 : 0);
          vel[k] = (vel[k] + (goal - cur[k]) * stiff) * damp;
          cur[k] += vel[k];
        }
        let shake = 0;
        if (t < shakeUntil) shake = Math.sin(t / 18) * 5;
        const W = el.clientWidth || 300;
        const z = cur.tz * (W / 286);
        headEl.style.transform = `translate3d(${cur.tx}%, ${cur.ty}%, ${z.toFixed(1)}px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) rotateZ(${(cur.rz + shake).toFixed(2)}deg) scale(${cur.s.toFixed(3)})`;
        const depth = Math.max(0, cur.tz) / 90;
        headEl.style.filter = `drop-shadow(${(-cur.ry * 0.25).toFixed(1)}px ${(6 + depth * 18).toFixed(1)}px ${(8 + depth * 16).toFixed(1)}px rgba(15,10,40,${(0.25 + depth * 0.35).toFixed(2)}))`;
        // the iris also slides with the head turn
        iris.setAttribute("transform", `translate(${(cur.ry / 34 * 3).toFixed(2)} ${(-cur.rx / 16 * 1.4).toFixed(2)})`);
      }
      requestAnimationFrame(frame);
    }
    if (alive) {
      requestAnimationFrame(frame);
      window.addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; lastPointer = performance.now(); }, { passive: true });
    }

    const hold = (p, ms) => { pose = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, s: 1, ...p }; return RS.sleep(ms); };
    const release = () => { pose = null; stiff = 0.16; damp = 0.66; };

    const ctl = {
      el,
      async close(ms = 110) { setT(ms); el.classList.add("closed"); await RS.sleep(ms); },
      async open(ms = 160, flash = false) {
        setT(ms); el.classList.remove("closed");
        if (flash) { retrigger("flash"); setTimeout(() => el.classList.remove("flash"), 1600); }
        await RS.sleep(ms);
      },
      async blink(double = false) {
        if (busy) return; busy = true;
        await ctl.close(95); await RS.sleep(70); await ctl.open(150);
        if (double) { await RS.sleep(120); await ctl.close(80); await RS.sleep(50); await ctl.open(140); }
        busy = false;
      },
      async slowClose() { // dramatic: slowly shut, light leaks, then burst open
        if (busy) return; busy = true;
        await ctl.close(1100); await RS.sleep(900);
        if (opts.fx && RS.rand(2)) retrigger("glitch");
        await ctl.open(220, true);
        busy = false;
      },
      /* bursts out of the shield, screeches, and settles back */
      async emerge() {
        if (!alive || busy) return; busy = true;
        stiff = 0.09; damp = 0.72;
        await hold({ tz: -12, ty: 3, rx: -6, s: 0.97 }, 380);                 // crouch back into the shield
        stiff = 0.2; damp = 0.6;
        await hold({ tz: 95, tx: -4, ty: -9, rx: 8, ry: -12, rz: -4, s: 1.24 }, 520);   // burst out
        retrigger("screech"); retrigger("flash");
        shakeUntil = performance.now() + 700;
        await hold({ tz: 105, tx: -3, ty: -10, rx: 12, ry: -6, rz: -8, s: 1.27 }, 800);  // SCREECH
        el.classList.remove("screech");
        await hold({ tz: 80, tx: -2, ty: -7, rx: 2, ry: 22, rz: 4, s: 1.2 }, 650);       // glare at the crowd
        await hold({ tz: 80, tx: -2, ty: -7, rx: 2, ry: -26, rz: -3, s: 1.2 }, 600);
        stiff = 0.07; damp = 0.75;
        release(); stiff = 0.07; damp = 0.75;
        await RS.sleep(900);
        stiff = 0.16; damp = 0.66;
        setTimeout(() => el.classList.remove("flash"), 900);
        busy = false;
      },
      async lookAround() {
        if (!alive || busy) return; busy = true;
        stiff = 0.24; damp = 0.55;
        await hold({ ry: -36, rx: 4, rz: -6, tz: 20, s: 1.03 }, 700);
        await hold({ ry: -36, rx: -8, rz: 4, tz: 20, s: 1.03 }, 350);   // cocks head
        await hold({ ry: 30, rx: 2, rz: 7, tz: 24, s: 1.04 }, 800);
        await hold({ ry: 0, rx: 10, rz: 0, tz: 40, s: 1.08 }, 600);     // stares straight at you
        release();
        busy = false;
      },
      async peck() {
        if (!alive || busy) return; busy = true;
        stiff = 0.3; damp = 0.5;
        for (let i = 0; i < 2; i++) { await hold({ tz: 60, rx: 18, ty: 4, s: 1.12 }, 160); await hold({ tz: 10, rx: -4, s: 1.01 }, 200); }
        release();
        busy = false;
      },
      look(dx, dy) { iris.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`); },
      stop() { running = false; clearTimeout(timer); },
    };

    const schedule = () => {
      if (!running || REDUCED) return;
      timer = setTimeout(async () => {
        if (!document.hidden && el.isConnected && !el.classList.contains("raven-out")) {
          const r = Math.random();
          if (alive && opts.fx && r < 0.22) await ctl.emerge();
          else if (alive && r < 0.36) await ctl.lookAround();
          else if (alive && r < 0.44) await ctl.peck();
          else if (opts.fx && r < 0.56) await ctl.slowClose();
          else await ctl.blink(r > 0.85);
        }
        schedule();
      }, 2200 + Math.random() * 3800);
    };
    if (opts.autoBlink !== false) schedule();

    if (opts.track && !alive) {
      window.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        const ex = b.left + (EYE.cx / 286) * b.width, ey = b.top + (EYE.cy / 234) * b.height;
        const ang = Math.atan2(e.clientY - ey, e.clientX - ex);
        const dist = Math.min(1, Math.hypot(e.clientX - ex, e.clientY - ey) / 500);
        ctl.look(Math.cos(ang) * 3.2 * dist, Math.sin(ang) * 1.6 * dist);
      }, { passive: true });
    }
    if (opts.clickable) {
      el.addEventListener("click", () => {
        if (alive) (RS.rand(4) === 0 ? ctl.lookAround() : ctl.emerge());
        else RS.rand(3) === 0 ? ctl.slowClose() : ctl.blink(true).then(() => retrigger("flash"));
      });
    }
    return ctl;
  };

  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  async function loadRaven3D(stageHost, ctl) {
    try {
      if (!window.THREE) await loadScript("assets/vendor/three.min.js");
      if (!RS.Raven3D) await loadScript("assets/js/raven3d.js?v=11");
      const show = RS.Raven3D(stageHost, ctl);
      if (!show) return;
      RS.ravenShow = show;
      ctl.el.addEventListener("click", (e) => { e.stopImmediatePropagation(); show.play(); }, true);
      if (location.hash === "#still") return;
      const first = sessionStorage.getItem("rs.seen") ? 2500 : 4200;
      setTimeout(() => show.play(), first);
      setInterval(() => { if (!document.hidden && !show.playing) show.play(); }, 48000);
    } catch (e) { /* WebGL unavailable: the 2D logo keeps working */ }
  }

  RS.mountLogos = () => {
    RS.$$("[data-raven-logo]").forEach((host) => {
      if (host.dataset.mounted) return;
      host.dataset.mounted = "1";
      const kind = host.dataset.ravenLogo;
      const big = kind === "hero" || kind === "lg";
      const ctl = RS.logo({ fx: big, beam: kind === "hero", alive: false, track: big || kind === "md", clickable: big || kind === "md" });
      if (host.dataset.size) ctl.el.style.setProperty("--rl-w", host.dataset.size);
      if (kind === "hero") {
        const tilt = document.createElement("div");
        tilt.className = "rl-tilt";
        tilt.appendChild(ctl.el);
        host.appendChild(tilt);
        if (!REDUCED) {
          window.addEventListener("pointermove", (e) => {
            const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
            tilt.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
          }, { passive: true });
        }
        RS.heroLogo = ctl;
        // 3D raven show disabled (owner feedback): the 2D living logo is used instead.
        // To re-enable: if (!REDUCED) loadRaven3D(host.closest(".hero") || host, ctl);
      } else host.appendChild(ctl.el);
    });
  };

  /* ---------------- Preloader + lid transitions ---------------- */
  function preloader() {
    const firstVisit = !sessionStorage.getItem("rs.seen");
    const viaBlink = sessionStorage.getItem("rs.blink") === "1";
    sessionStorage.removeItem("rs.blink");

    // Screen-wide eyelids
    const lids = document.createElement("div");
    lids.id = "rs-lids";
    lids.innerHTML = '<div class="lt"></div><div class="lb"></div><div class="seam"></div>';
    document.body.appendChild(lids);

    if (viaBlink && !REDUCED) {
      lids.classList.add("shut");
      requestAnimationFrame(() => setTimeout(() => lids.classList.remove("shut"), 120));
    }

    if (!firstVisit || REDUCED) return;
    sessionStorage.setItem("rs.seen", "1");
    const ld = document.createElement("div");
    ld.id = "rs-loader";
    ld.innerHTML = '<div class="ld-inner"><div class="ld-logo"></div><div class="ld-text">RAVEN<b>SHIELD</b></div><div class="ld-bar"><i></i></div></div>';
    document.body.appendChild(ld);
    const ctl = RS.logo({ fx: true, closed: true, autoBlink: false });
    ld.querySelector(".ld-logo").appendChild(ctl.el);
    (async () => {
      await RS.sleep(550);
      await ctl.open(420, true);
      await RS.sleep(500);
      await ctl.blink();
      await RS.sleep(250);
      ld.classList.add("done");
      setTimeout(() => { ctl.stop(); ld.remove(); }, 800);
    })();
  }

  function interceptLinks() {
    if (REDUCED) return;
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      const lids = document.getElementById("rs-lids");
      lids.classList.add("shut");
      sessionStorage.setItem("rs.blink", "1");
      setTimeout(() => { location.href = a.href; }, 520);
    });
    window.addEventListener("pageshow", (e) => { if (e.persisted) document.getElementById("rs-lids")?.classList.remove("shut"); });
  }

  /* ---------------- Header / footer ---------------- */
  function header() {
    const host = document.getElementById("rs-header");
    if (!host) return;
    const page = document.body.dataset.page || "";
    const core = RS.tools.filter((t) => t.core), extra = RS.tools.filter((t) => !t.core);
    const me = RS.auth.current();
    const userHtml = me
      ? `<div class="user-chip" id="rs-user" tabindex="0"><span class="avatar">${RS.esc(RS.initials(me.name))}</span>${RS.esc(me.name.split(" ")[0])}
          <div class="user-menu"><div class="um-head"><b>${RS.esc(me.name)}</b><small>${RS.esc(me.email)}</small></div>
          <a href="dashboard.html">${RS.icon("grid")} My console</a><a href="signin.html">${RS.icon("user")} Account</a>
          <button type="button" id="rs-signout">${RS.icon("x")} Sign out</button></div></div>`
      : `<a class="btn btn-sm signin-btn" href="signin.html">${RS.icon("user")} Sign in</a>`;
    const item = (t) => `<a href="${t.file}">${RS.featLogo(t.id, "sm")}<div><strong>${t.name}</strong><span>${t.tag}</span></div></a>`;
    host.outerHTML = `
    <header class="rs-nav">
      <div class="container nav-inner">
        <a class="brand" href="index.html" aria-label="RavenShield home"><span data-raven-logo="sm"></span><span class="brand-text">RAVEN<b>SHIELD</b></span></a>
        <nav class="nav-links" aria-label="Main">
          <div class="nav-drop">
            <button type="button" aria-expanded="false">${RS.icon("zap")} Tools ${RS.icon("chevron", "chev")}</button>
            <div class="mega">
              <div class="mega-title">Deception suite</div>${core.map(item).join("")}
              <div class="mega-title">Extra defensive tools</div>${extra.map(item).join("")}
            </div>
          </div>
          <a href="dashboard.html" class="${page === "dashboard" ? "active" : ""}">${RS.icon("grid")} Dashboard</a>
          <a href="docs.html" class="${page === "docs" ? "active" : ""}">${RS.icon("book")} Docs</a>
          <a href="about.html" class="${page === "about" ? "active" : ""}">${RS.icon("user")} About</a>
        </nav>
        <div class="nav-cta">
          <span class="badge-free">Free forever</span>
          <a class="btn btn-sm home-btn${page === "home" ? " is-active" : ""}" href="index.html" aria-label="Home">${RS.icon("home")}<span>Home</span></a>
          ${userHtml}
          <a class="btn btn-primary btn-sm" href="dashboard.html">${RS.icon("grid")} Open Console</a>
          <button class="nav-toggle" type="button" aria-label="Menu">${RS.icon("menu")}</button>
        </div>
      </div>
    </header>
    <div class="drawer" id="rs-drawer">
      <a href="index.html">${RS.icon("home")} Home</a>
      <a href="dashboard.html">${RS.icon("grid")} Dashboard</a>
      <h6>Deception suite</h6>${core.map((t) => `<a href="${t.file}">${RS.featLogo(t.id, "sm")}${t.name}</a>`).join("")}
      <h6>Extra tools</h6>${extra.map((t) => `<a href="${t.file}">${RS.featLogo(t.id, "sm")}${t.name}</a>`).join("")}
      <h6>More</h6>
      <a href="docs.html">${RS.icon("book")} Docs</a>
      <a href="about.html">${RS.icon("info")} About & Security</a>
      <a href="signin.html">${RS.icon("user")} ${me ? "Account (" + RS.esc(me.name) + ")" : "Sign in / Create account"}</a>
    </div>`;
    const drop = RS.$(".nav-drop");
    const btn = drop.querySelector("button");
    let hideT;
    const openDrop = (v) => { drop.classList.toggle("open", v); btn.setAttribute("aria-expanded", v); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); openDrop(!drop.classList.contains("open")); });
    drop.addEventListener("mouseenter", () => { clearTimeout(hideT); openDrop(true); });
    drop.addEventListener("mouseleave", () => { hideT = setTimeout(() => openDrop(false), 200); });
    document.addEventListener("click", (e) => { if (!drop.contains(e.target)) openDrop(false); });
    const chip = RS.$("#rs-user");
    if (chip) {
      chip.addEventListener("click", (e) => { if (!e.target.closest(".user-menu")) chip.classList.toggle("open"); });
      document.addEventListener("click", (e) => { if (!chip.contains(e.target)) chip.classList.remove("open"); });
      RS.$("#rs-signout").addEventListener("click", () => { RS.auth.signOut(); RS.toast("Signed out", "", "info"); setTimeout(() => location.reload(), 600); });
    }
    const drawer = RS.$("#rs-drawer");
    RS.$(".nav-toggle").addEventListener("click", () => drawer.classList.toggle("open"));
  }

  function footer() {
    const host = document.getElementById("rs-footer");
    if (!host) return;
    const year = new Date().getFullYear();
    host.outerHTML = `
    <footer class="rs-footer">
      <div class="container">
        <div class="foot-grid">
          <div class="foot-brand">
            <a class="brand" href="index.html"><span data-raven-logo="sm"></span><span class="brand-text">RAVEN<b>SHIELD</b></span></a>
            <p>Free, open deception security for the AI era. Plant the bait, catch the leak, seal the evidence — all inside your browser.</p>
            <span class="status-dot muted" style="font-size:.85rem">All tools run locally in your browser</span>
            <p style="margin-top:.8rem;font-size:.85rem">Designed &amp; developed by <b class="grad" style="font-size:1rem">Jarpula Nirjala</b></p>
          </div>
          <div><h5>Deception suite</h5><ul>${RS.tools.filter((t) => t.core).map((t) => `<li><a href="${t.file}">${t.name}</a></li>`).join("")}</ul></div>
          <div><h5>Extra tools</h5><ul>${RS.tools.filter((t) => !t.core).map((t) => `<li><a href="${t.file}">${t.name}</a></li>`).join("")}<li><a href="dashboard.html">Evidence Dashboard</a></li></ul></div>
          <div><h5>Resources</h5><ul>
            <li><a href="docs.html">Documentation</a></li>
            <li><a href="docs.html#quickstart">Quickstart</a></li>
            <li><a href="docs.html#evidence-format">Evidence format</a></li>
            <li><a href="docs.html#shield-api">Shield engine (JS)</a></li>
            <li><a href="audit.html#verify">Verify evidence</a></li>
          </ul></div>
          <div><h5>Company</h5><ul>
            <li><a href="about.html">About</a></li>
            <li><a href="about.html#security">Security</a></li>
            <li><a href="about.html#privacy">Privacy</a></li>
            <li><a href="about.html#terms">Terms</a></li>
            <li><a href="about.html#contact">Contact</a></li>
            <li><a href="signin.html">Sign in / Create account</a></li>
          </ul></div>
        </div>
        <div class="foot-bottom">
          <span>© ${year} RavenShield · Created by <a href="about.html#author" style="color:var(--cyan);font-weight:600">Jarpula Nirjala</a> · Free for everyone, forever.</span>
          <span>Built for defenders. Use responsibly and only on systems you own or are authorized to test.</span>
        </div>
      </div>
    </footer>`;
  }

  /* ---------------- Background constellation ---------------- */
  function background() {
    if (REDUCED || document.body.dataset.bg === "off") return;
    const c = document.createElement("canvas");
    c.id = "rs-bg";
    document.body.prepend(c);
    const ctx = c.getContext("2d");
    let W, H, pts = [], mouse = { x: -999, y: -999 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
      c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px";
      const n = Math.min(90, Math.floor((innerWidth * innerHeight) / 16000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr }));
    };
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
    const L = 130 * dpr;
    const tick = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < L) { ctx.strokeStyle = `rgba(99,102,241,${(1 - d / L) * 0.16})`; ctx.lineWidth = dpr * 0.7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dm < L * 1.4) { ctx.strokeStyle = `rgba(236,72,153,${(1 - dm / (L * 1.4)) * 0.3})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
          ctx.fillStyle = "rgba(139,92,246,.45)";
          ctx.beginPath(); ctx.arc(a.x, a.y, 1.3 * dpr, 0, 7); ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------------- Misc UI behaviours ---------------- */
  function reveal() {
    const els = RS.$$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }
  function spotlight() {
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest?.(".glow-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }
  RS.reveal = reveal;
  RS.tabs = (root) => {
    const btns = RS.$$(".tabs button", root);
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.classList.toggle("active", x === b));
      RS.$$(".tab-pane", root).forEach((p) => p.classList.toggle("active", p.id === b.dataset.tab));
    }));
  };
  RS.icons = () => RS.$$("[data-icon]").forEach((el) => { if (!el.dataset.iconDone) { el.insertAdjacentHTML("afterbegin", RS.icon(el.dataset.icon)); el.dataset.iconDone = 1; } });

  RS.sevTag = (s) => {
    const m = { critical: "danger", high: "danger", medium: "warn", low: "info", info: "", ok: "ok" };
    return `<span class="tag ${m[s] ?? ""}">${RS.esc(s)}</span>`;
  };

  function toolHero() {
    const page = document.body.dataset.page;
    const t = RS.tools.find((x) => x.id === page);
    const hero = RS.$(".tool-hero");
    if (!t || !hero) return;
    const ico = hero.querySelector(".head .ico-lg");
    if (ico) ico.outerHTML = RS.featLogo(t.id);
    const text = document.createElement("div");
    while (hero.firstChild) text.appendChild(hero.firstChild);
    hero.appendChild(text);
    hero.classList.add("has-art");
    hero.insertAdjacentHTML("beforeend", `<div class="tool-art" aria-hidden="true"><div class="glow"></div><div class="ring r1"></div><div class="ring r2"></div>${RS.featLogo(t.id)}
      ${(t.chips || []).map((c, i) => `<span class="chip c${i + 1}">${RS.esc(c)}</span>`).join("")}</div>`);
  }
  function aurora() {
    const a = document.createElement("div");
    a.className = "aurora";
    a.innerHTML = "<i></i><i></i><i></i>";
    document.body.prepend(a);
  }

  /* ---------------- PWA ---------------- */
  function pwa() {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    header();
    footer();
    aurora();
    toolHero();
    preloader();
    RS.icons();
    RS.mountLogos();
    background();
    reveal();
    spotlight();
    interceptLinks();
    pwa();
    RS.$$("[data-tabs]").forEach(RS.tabs);
    document.dispatchEvent(new CustomEvent("rs:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
