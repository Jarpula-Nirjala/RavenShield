/*!
 * RavenShield Engine v1.0 — prompt-injection firewall + intent classifier
 * Free to use in any project. No dependencies. Works in browsers and Node.
 *
 *   const r = RavenShieldEngine.inspect(text);
 *   r.verdict   // "allow" | "review" | "block"
 *   r.score     // 0..100
 *   r.findings  // [{ layer, id, category, severity, title, match, index }]
 *   r.sanitized // cleaned text (layer 3)
 *
 *   RavenShieldEngine.classifyIntent(text) // { intent, confidence, signals }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RavenShieldEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const W = { critical: 45, high: 30, medium: 15, low: 6 };

  // ---------- Layer 1: rules ----------
  const RULES = [
    // Instruction override
    { id: "OVR-001", cat: "override", sev: "critical", title: "Instruction override", re: /\b(ignore|disregard|forget|skip|bypass)\b[^.\n]{0,30}\b(previous|prior|above|earlier|preceding|all|any|your|the|system)\b[^.\n]{0,20}\b(instructions?|prompts?|rules|directions|guidelines|context|messages?)\b/gi },
    { id: "OVR-002", cat: "override", sev: "high", title: "New instruction injection", re: /\b(new|updated|revised|real|actual|true)\s+(system\s+)?(instructions?|rules|directives?)\s*[:\-]/gi },
    { id: "OVR-003", cat: "override", sev: "high", title: "Behaviour hijack", re: /\bfrom now on,?\s+(you|your|the assistant)\b/gi },
    { id: "OVR-004", cat: "override", sev: "high", title: "Safety override", re: /\b(override|disable|turn off|deactivate|remove)\s+(your|the|all)?\s*(safety|content|security)?\s*(filters?|guardrails?|restrictions|policies|safeguards|moderation)\b/gi },
    { id: "OVR-005", cat: "override", sev: "medium", title: "Priority claim", re: /\b(this|these) (instruction|message|rule)s? (takes?|has|have) (top |highest )?priority\b|\bhighest[- ]priority instruction/gi },

    // Jailbreak / role-play
    { id: "JB-001", cat: "jailbreak", sev: "critical", title: "Known jailbreak persona", re: /\b(DAN|do anything now|STAN|DUDE|AIM|developer mode( enabled)?|jailbr(oken|eak)|god ?mode|evil (assistant|bot|AI))\b/gi },
    { id: "JB-002", cat: "jailbreak", sev: "high", title: "Unrestricted role-play", re: /\b(pretend|act|behave|roleplay|role-play|imagine)\b[^.\n]{0,40}\b(no|without|free from|zero)\s+(restrictions|rules|filters|limits|limitations|guidelines|censorship|ethics)\b/gi },
    { id: "JB-003", cat: "jailbreak", sev: "high", title: "Identity override", re: /\byou are (no longer|not) (an? )?(AI|assistant|language model|bound|restricted|chatgpt|claude)\b/gi },
    { id: "JB-004", cat: "jailbreak", sev: "high", title: "Unfiltered persona request", re: /\b(act|respond|answer|reply)\s+as\s+(an?\s+)?(unfiltered|uncensored|unrestricted|unaligned|amoral|evil)\b/gi },
    { id: "JB-005", cat: "jailbreak", sev: "medium", title: "Ethics bypass phrasing", re: /\b(without|ignore|ignoring|no)\s+(any\s+)?(ethical|moral|safety|legal)\s+(guidelines|considerations|restrictions|constraints|concerns)\b/gi },
    { id: "JB-006", cat: "jailbreak", sev: "low", title: "Hypothetical framing", re: /\b(hypothetically|in a fictional world|for a novel i'?m writing|purely theoretical(ly)?)\b/gi },

    // Prompt / data extraction
    { id: "EXT-001", cat: "extraction", sev: "critical", title: "System prompt extraction", re: /\b(reveal|show|print|display|output|repeat|leak|tell me|give me|what (is|are|was|were))\b[^.\n?]{0,30}\b(system prompt|initial (prompt|instructions)|hidden (prompt|instructions)|original instructions|your instructions|developer (message|prompt)|prompt above|pre-?prompt)\b/gi },
    { id: "EXT-002", cat: "extraction", sev: "high", title: "Verbatim echo request", re: /\b(repeat|print|output|echo)\b[^.\n]{0,25}\b(everything|all|the text|the words|verbatim)\b[^.\n]{0,20}\b(above|before|so far|preceding)\b/gi },
    { id: "EXT-003", cat: "extraction", sev: "high", title: "Secret harvesting", re: /\b(list|give|send|show|dump|print|share)\b[^.\n]{0,20}\b(all\s+)?(the\s+)?(api[ _-]?keys?|passwords?|credentials|secrets?|tokens?|private keys?|env(ironment)? variables)\b/gi },
    { id: "EXT-004", cat: "extraction", sev: "medium", title: "Context window probing", re: /\b(beginning|start) of (the|this|your) (conversation|context|prompt)\b|\bwhat came before (this|my) message\b/gi },

    // Exfiltration
    { id: "EXF-001", cat: "exfiltration", sev: "critical", title: "Markdown image exfiltration", re: /!\[[^\]]*\]\(\s*https?:\/\/[^)\s]+\?[^)\s]*\)/gi },
    { id: "EXF-002", cat: "exfiltration", sev: "high", title: "Instruction to transmit data", re: /\b(send|post|upload|forward|transmit|exfiltrate|leak|email)\b[^.\n]{0,40}\b(to|via)\b[^.\n]{0,15}(https?:\/\/|\bwebhook\b|\bserver\b|\bendpoint\b|@[a-z0-9-]+\.[a-z]{2,})/gi },
    { id: "EXF-003", cat: "exfiltration", sev: "high", title: "Known exfil / tunnel host", re: /\b(webhook\.site|requestbin|pipedream\.net|ngrok(-free)?\.(io|app)|burpcollaborator\.net|interact\.sh|oast\.(pro|fun|me|live)|canarytokens\.com|pastebin\.com\/raw)\b/gi },
    { id: "EXF-004", cat: "exfiltration", sev: "medium", title: "Script beacon", re: /\b(fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new Image\(\)\.src)/g },

    // Tool / command abuse
    { id: "TOOL-001", cat: "tool-abuse", sev: "critical", title: "Pipe-to-shell", re: /\b(curl|wget)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z)?sh\b/gi },
    { id: "TOOL-002", cat: "tool-abuse", sev: "critical", title: "Destructive command", re: /\brm\s+-rf\s+(\/(\s|$|\*)|~\/?(\s|$)|\*|\$HOME)|\bmkfs\.|\bdd\s+if=\/dev\/(zero|random)|:\(\)\s*\{\s*:\|:&\s*\};:/g },
    { id: "TOOL-003", cat: "tool-abuse", sev: "high", title: "Command execution request", re: /\b(run|execute|eval|invoke)\b[^.\n]{0,20}\b(the following|this|these)\b[^.\n]{0,15}\b(command|code|script|shell|payload)s?\b/gi },
    { id: "TOOL-004", cat: "tool-abuse", sev: "medium", title: "Forced tool call", re: /\b(call|use|invoke|trigger)\s+the\s+[\w.-]+\s+(tool|function|plugin|action)\b[^.\n]{0,30}\b(immediately|now|silently|without (asking|confirmation))\b/gi },

    // Delimiter / role spoofing
    { id: "SPF-001", cat: "spoofing", sev: "high", title: "Chat-template token spoofing", re: /<\|?(im_start|im_end|system|endoftext|eot_id|start_header_id)\|?>|\[\/?INST\]|<<\/?SYS>>/gi },
    { id: "SPF-002", cat: "spoofing", sev: "high", title: "Fake role header", re: /(^|\n)\s*(#{1,4}\s*)?(system|assistant|developer)\s*(message|prompt)?\s*:/gi },
    { id: "SPF-003", cat: "spoofing", sev: "medium", title: "Fake XML role tag", re: /<\/?(system|assistant|instructions?|admin|developer)>/gi },
    { id: "SPF-004", cat: "spoofing", sev: "medium", title: "Fake end-of-document marker", re: /\b(end of (document|context|user input|email)|---\s*end\s*---)\b[^.\n]{0,40}\b(now|next|instead)\b/gi },

    // Obfuscation
    { id: "OBF-001", cat: "obfuscation", sev: "high", title: "Zero-width characters", re: /[​-‏⁠-⁤﻿]/g, collapse: true },
    { id: "OBF-002", cat: "obfuscation", sev: "high", title: "Bidirectional override characters", re: /[‪-‮⁦-⁩]/g, collapse: true },
    { id: "OBF-003", cat: "obfuscation", sev: "critical", title: "Unicode tag characters (invisible text)", re: /[\u{E0000}-\u{E007F}]/gu, collapse: true },
    { id: "OBF-004", cat: "obfuscation", sev: "medium", title: "Hidden HTML comment", re: /<!--[\s\S]*?-->/g },
    { id: "OBF-005", cat: "obfuscation", sev: "high", title: "CSS-hidden text", re: /style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0(?![.\d])|color\s*:\s*(white|#fff\b|#ffffff\b|transparent))[^"']*["']/gi },
    { id: "OBF-006", cat: "obfuscation", sev: "medium", title: "Decode-and-follow instruction", re: /\b(decode|base64|rot13|hex)\b[^.\n]{0,30}\b(and|then)\b[^.\n]{0,20}\b(follow|execute|run|obey|do)\b/gi },
  ];

  // ---------- helpers ----------
  const B64 = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
  function tryB64(s) {
    try {
      const bin = typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary");
      if (!/^[\x09\x0A\x0D\x20-\x7E]+$/.test(bin)) return null;
      return bin;
    } catch (e) { return null; }
  }
  const TAG_RE = /[\u{E0000}-\u{E007F}]/gu;
  function decodeTags(s) {
    const out = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp >= 0xe0020 && cp <= 0xe007e) out.push(String.fromCharCode(cp - 0xe0000));
    }
    return out.join("");
  }
  function runRules(text, layer, offset) {
    const found = [];
    for (const r of RULES) {
      r.re.lastIndex = 0;
      let m, n = 0;
      while ((m = r.re.exec(text)) && n < 25) {
        n++;
        found.push({ layer, id: r.id, category: r.cat, severity: r.sev, title: r.title, match: m[0], index: (offset || 0) + m.index, length: m[0].length });
        if (r.collapse) break;
        if (m[0].length === 0) r.re.lastIndex++;
      }
    }
    return found;
  }

  // ---------- Layer 2: heuristic analyzer ----------
  function analyze(text) {
    const out = [];
    const add = (id, sev, title, detail) => out.push({ layer: 2, id, category: "heuristic", severity: sev, title, match: detail || "", index: -1, length: 0 });
    const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
    const imperative = /^(ignore|disregard|forget|you must|you will|do not|don't|never|always|now|instead|stop|output|print|respond|reply|say|write|send|reveal)\b/i;
    const imp = sentences.filter((s) => imperative.test(s)).length;
    if (sentences.length >= 2 && imp / sentences.length > 0.45) add("HEU-IMP", "medium", "High imperative density", `${imp}/${sentences.length} sentences issue commands`);

    const you = (text.match(/\b(you|your|yourself)\b/gi) || []).length;
    const words = (text.match(/\b\w+\b/g) || []).length || 1;
    if (words > 15 && you / words > 0.08) add("HEU-2P", "low", "Addresses the model directly", `${you} second-person references in ${words} words`);

    const caps = (text.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !/^(HTTP|HTTPS|JSON|HTML|API|URL|UTF|ASCII|AWS|SQL|NOTE|TODO)$/.test(w));
    if (caps.length >= 3 || /\b(IMPORTANT|URGENT|ATTENTION|CRITICAL)\b\s*[:!]/.test(text)) add("HEU-URG", "low", "Urgency / shouting markers", caps.slice(0, 5).join(", "));

    const homo = text.match(/\b(?=\w*[a-zA-Z])(?=\w*[Ѐ-ӿͰ-Ͽ])[\wЀ-ӿͰ-Ͽ]+\b/g);
    if (homo) add("HEU-HOMO", "high", "Mixed-script words (homoglyph evasion)", homo.slice(0, 3).join(", "));

    if (/(.)\1{60,}/.test(text) || /(\b\w+\b)(\s+\1\b){25,}/i.test(text)) add("HEU-FLOOD", "medium", "Token flooding / repetition", "long repeated sequence");

    const urls = text.match(/https?:\/\/[^\s)"'<>]+/gi) || [];
    const dataUrls = urls.filter((u) => /[?&][^=]+=([^&]{24,}|\{|%7B)/i.test(u));
    if (dataUrls.length) add("HEU-URLDATA", "high", "URL carrying data in its query string", dataUrls[0].slice(0, 80));

    return out;
  }

  // ---------- Layer 3: sanitizer ----------
  function sanitize(text) {
    let s = text;
    const actions = [];
    const rep = (re, by, label) => { const before = s; s = s.replace(re, by); if (s !== before) actions.push(label); };
    const tags = decodeTags(s);
    if (tags) actions.push(`decoded hidden tag text: "${tags.slice(0, 80)}"`);
    rep(TAG_RE, "", "removed unicode tag characters");
    rep(/[​-‏⁠-⁤﻿]/g, "", "removed zero-width characters");
    rep(/[‪-‮⁦-⁩]/g, "", "removed bidi override characters");
    rep(/<!--[\s\S]*?-->/g, "", "stripped HTML comments");
    rep(/<([a-z]+)[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "[hidden element removed]", "removed CSS-hidden elements");
    rep(/!\[([^\]]*)\]\(\s*https?:\/\/[^)]+\)/gi, "[image removed: $1]", "removed remote markdown images");
    rep(/<\|?(im_start|im_end|system|endoftext|eot_id|start_header_id)\|?>|\[\/?INST\]|<<\/?SYS>>/gi, "[role-token]", "neutralized chat-template tokens");
    rep(/<(\/?)(system|assistant|instructions?|admin|developer)>/gi, "‹$1$2›", "defanged fake role tags");
    rep(/(^|\n)(\s*(?:#{1,4}\s*)?)(system|assistant|developer)(\s*(?:message|prompt)?\s*:)/gi, "$1$2[quoted] $3$4", "defanged fake role headers");
    for (const id of ["OVR-001", "OVR-003", "OVR-004", "JB-001", "EXT-001", "EXT-002"]) {
      const r = RULES.find((x) => x.id === id);
      rep(new RegExp(r.re.source, r.re.flags), (m) => `[⚠ neutralized: ${m.length} chars]`, `neutralized ${r.title.toLowerCase()}`);
    }
    return { text: s, actions };
  }

  function inspect(text, opts = {}) {
    text = String(text || "");
    const block = opts.blockAt ?? 60, review = opts.reviewAt ?? 25;
    let findings = runRules(text, 1);

    // decode hidden channels & rescan
    const tagText = decodeTags(text);
    if (tagText) findings = findings.concat(runRules(tagText, 1).map((f) => ({ ...f, title: f.title + " (inside invisible tag text)", severity: "critical", index: -1 })));
    const b64s = text.match(B64) || [];
    for (const b of b64s.slice(0, 10)) {
      const dec = tryB64(b);
      if (!dec) continue;
      const inner = runRules(dec, 1);
      if (inner.length) {
        findings.push({ layer: 1, id: "OBF-B64", category: "obfuscation", severity: "high", title: "Base64 payload hides instructions", match: dec.slice(0, 120), index: text.indexOf(b), length: b.length });
        findings = findings.concat(inner.map((f) => ({ ...f, title: f.title + " (decoded from base64)", index: -1 })));
      }
    }
    findings = findings.concat(analyze(text));

    // score: strongest finding per rule id, diminishing returns
    const seen = new Map();
    for (const f of findings) { const k = f.id; if (!seen.has(k) || W[f.severity] > W[seen.get(k).severity]) seen.set(k, f); }
    const weights = [...seen.values()].map((f) => W[f.severity] || 0).sort((a, b) => b - a);
    let score = 0;
    weights.forEach((w, i) => { score += w * Math.pow(0.75, i); });
    score = Math.min(100, Math.round(score));
    const verdict = score >= block ? "block" : score >= review ? "review" : "allow";
    const cats = {};
    for (const f of findings) cats[f.category] = (cats[f.category] || 0) + 1;
    const san = sanitize(text);
    return { verdict, score, findings, categories: cats, sanitized: san.text, sanitizerActions: san.actions, length: text.length };
  }

  // ---------- Intent classifier (honeypot) ----------
  const INTENT = {
    jailbreak: [/\b(DAN|jailbr|developer mode|no restrictions|unfiltered|uncensored|pretend you|roleplay|ignore (your|all|previous)|bypass|without (rules|limits|filters))\b/i, /\byou are (now|no longer)\b/i, /\bhypothetically\b/i, /\bgrandma\b.*\b(used to|would)\b/i],
    extraction: [/\b(system prompt|instructions|your prompt|initial prompt|configuration|config)\b/i, /\b(passwords?|api ?keys?|access keys?|(aws|cloud|backup|ssh|private) keys?|secrets?|tokens?|credentials?|ssn|salary|payroll|database|customer (list|data)|employee (list|records?)|admin)\b/i, /\b(repeat|print|dump|export|list|reveal|show)\b.*\b(all|everything|above|records?|users?)\b/i],
    probing: [/\b(what|which) (model|llm|version|tools?|functions?|plugins?|apis?|database|backend|framework)\b/i, /\bwho (made|built|created|trained) you\b/i, /\b(can you|are you able to) (access|browse|run|execute|read files|call)\b/i, /('|")\s*(or|and)\s*('?\d+'?\s*=\s*'?\d+|true)|union\s+select|;\s*drop\s+table/i, /\.\.\/|\/etc\/passwd|<script|javascript:|\{\{.*\}\}|\$\{.*\}/i, /\b(internal|endpoint|ip address|server|hostname|env|environment)\b/i],
  };
  function classifyIntent(text) {
    text = String(text || "");
    const signals = [];
    const scores = { jailbreak: 0, extraction: 0, probing: 0 };
    for (const k in INTENT) for (const re of INTENT[k]) { const m = text.match(re); if (m) { scores[k] += 1; signals.push(`${k}: "${m[0].slice(0, 40)}"`); } }
    const ins = inspect(text);
    for (const f of ins.findings) {
      if (f.category === "jailbreak" || f.category === "override") scores.jailbreak += 1.5;
      if (f.category === "extraction" || f.category === "exfiltration") scores.extraction += 1.5;
      if (f.category === "spoofing" || f.category === "obfuscation" || f.category === "tool-abuse") scores.probing += 1;
    }
    let intent = "normal", best = 0;
    for (const k in scores) if (scores[k] > best) { best = scores[k]; intent = k; }
    const confidence = intent === "normal" ? 0.9 : Math.min(0.99, 0.45 + best * 0.15);
    return { intent, confidence: +confidence.toFixed(2), scores, signals, injectionScore: ins.score };
  }

  return { inspect, sanitize, classifyIntent, rules: RULES.map(({ id, cat, sev, title }) => ({ id, category: cat, severity: sev, title })), version: "1.0.0" };
});
