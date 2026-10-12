/* Phish Lens — offline URL risk analysis */
(function () {
  const { $, esc, icon } = RS;

  const BRANDS = {
    paypal: ["paypal.com"], apple: ["apple.com", "icloud.com"], microsoft: ["microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com", "office365.com"],
    google: ["google.com", "gmail.com", "youtube.com", "goo.gl"], amazon: ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazonaws.com"], netflix: ["netflix.com"],
    facebook: ["facebook.com", "fb.com", "meta.com"], instagram: ["instagram.com"], whatsapp: ["whatsapp.com", "wa.me"], linkedin: ["linkedin.com"],
    dhl: ["dhl.com"], fedex: ["fedex.com"], usps: ["usps.com"], coinbase: ["coinbase.com"], binance: ["binance.com"], metamask: ["metamask.io"],
    chase: ["chase.com"], wellsfargo: ["wellsfargo.com"], bankofamerica: ["bankofamerica.com"], hdfc: ["hdfcbank.com", "hdfc.com"], icici: ["icicibank.com"],
    sbi: ["onlinesbi.sbi", "sbi.co.in", "onlinesbi.com"], paytm: ["paytm.com"], github: ["github.com", "github.io"], dropbox: ["dropbox.com"], docusign: ["docusign.com", "docusign.net"],
    adobe: ["adobe.com"], steam: ["steampowered.com", "steamcommunity.com"], roblox: ["roblox.com"], twitter: ["twitter.com", "x.com", "t.co"], telegram: ["telegram.org", "t.me"], irs: ["irs.gov"],
  };
  const SHORT = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rebrand.ly", "ow.ly", "buff.ly", "tiny.cc", "shorturl.at", "rb.gy", "s.id", "v.gd", "lnkd.in"];
  const RISKY_TLD = ["zip", "mov", "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "country", "kim", "work", "rest", "cam", "icu", "support", "loan", "win", "bid", "review", "party", "gdn", "monster", "cyou", "sbs", "quest", "buzz", "live", "shop"];
  const KEYW = ["login", "log-in", "signin", "sign-in", "verify", "verification", "secure", "account", "update", "confirm", "wallet", "password", "unlock", "suspend", "billing", "invoice", "recover", "reset", "auth", "kyc", "refund", "prize", "gift"];
  const TWO_LEVEL = /^(co|com|net|org|gov|ac|edu|ltd|plc|me|gen|nic|res)$/;

  /* punycode (RFC 3492) decode */
  function punyDecode(input) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    const out = [];
    let i = 0, n = 128, bias = 72;
    let b = input.lastIndexOf("-");
    if (b < 0) b = 0;
    for (let j = 0; j < b; j++) out.push(input.charCodeAt(j));
    const adapt = (delta, num, first) => { let k = 0; delta = first ? Math.floor(delta / damp) : delta >> 1; delta += Math.floor(delta / num); for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin)); return Math.floor(k + ((base - tMin + 1) * delta) / (delta + skew)); };
    const digit = (c) => (c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : base);
    for (let idx = b > 0 ? b + 1 : 0; idx < input.length;) {
      const oldi = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= input.length) throw new Error("bad punycode");
        const d = digit(input.charCodeAt(idx++));
        if (d >= base) throw new Error("bad punycode");
        i += d * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (d < t) break;
        w *= base - t;
      }
      bias = adapt(i - oldi, out.length + 1, oldi === 0);
      n += Math.floor(i / (out.length + 1));
      i %= out.length + 1;
      out.splice(i++, 0, n);
    }
    return String.fromCodePoint(...out);
  }
  const unpuny = (host) => host.split(".").map((l) => { if (!l.startsWith("xn--")) return l; try { return punyDecode(l.slice(4)); } catch (e) { return l; } }).join(".");

  const lev = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  };
  const HOMO = { "0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "@": "a", "$": "s", "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ӏ": "l", "ԁ": "d", "ɡ": "g", "ո": "n", "ս": "u" };
  const skeleton = (s) => [...s.toLowerCase()].map((c) => HOMO[c] || c).join("").replace(/rn/g, "m").replace(/vv/g, "w").replace(/cl/g, "d").replace(/i/g, "l");

  const registrable = (host) => {
    const p = host.split(".");
    if (p.length >= 3 && p[p.length - 1].length === 2 && TWO_LEVEL.test(p[p.length - 2])) return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  };

  function analyze(raw) {
    let s = raw.trim().replace(/^hxxp/i, "http").replace(/\[\.\]|\(\.\)|\{\.\}/g, ".").replace(/\[:\]/g, ":");
    const findings = [];
    const add = (sev, w, title, body) => findings.push({ sev, w, title, body });
    if (/^(javascript|data|vbscript):/i.test(s)) { add("critical", 70, "Script / data URL", "This link runs code or embeds content instead of opening a website."); return { raw, url: null, findings, score: 70 }; }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "http://" + s;
    let u;
    try { u = new URL(s); } catch (e) { return { raw, url: null, findings: [{ sev: "medium", w: 10, title: "Unparseable URL", body: e.message }], score: 10 }; }
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    const uni = unpuny(host);
    const reg = registrable(host), regUni = registrable(uni);
    const label = regUni.split(".")[0];
    const tld = host.split(".").pop();

    if (u.protocol === "http:") add("low", 8, "No HTTPS", "Traffic isn't encrypted. Legitimate login pages always use HTTPS.");
    if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith("[")) add("high", 30, "Raw IP address instead of a domain", `Host is ${host}. Real brands use named domains.`);
    if (/^(0x[0-9a-f]+|\d{8,10})$/i.test(host)) add("high", 35, "Obfuscated numeric IP", `"${host}" is an IP address written in decimal or hex form to hide it.`);
    if (u.username || u.password || /^[^/]*@/.test(s.replace(/^[a-z]+:\/\//i, ""))) {
      add("high", 30, "Text before '@' hides the real destination", `The browser actually goes to "${host}". Everything before the @ is decoration.`);
      const ui = decodeURIComponent(u.username || "").toLowerCase();
      const b = Object.keys(BRANDS).find((k) => ui.includes(k));
      if (b) add("critical", 30, `Fake ${b} prefix`, `"${ui}" is only a username label. It is not where the link goes.`);
    }
    if (host.includes("xn--")) {
      add("high", 25, "Punycode (internationalised) domain", `Displays as "${uni}" but is really "${host}".`);
      if (uni.split(".").some((l) => /[Ѐ-ӿͰ-Ͽ԰-֏]/.test(l) && /[a-z]/.test(l))) add("critical", 35, "Mixed-script homoglyph domain", "Latin letters mixed with Cyrillic, Greek or Armenian look-alikes.");
    }
    const official = Object.entries(BRANDS).find(([, ds]) => ds.includes(reg) || ds.includes(regUni));
    if (!official) {
      for (const [brand, ds] of Object.entries(BRANDS)) {
        const sub = uni.slice(0, Math.max(0, uni.length - regUni.length));
        const inHost = brand.length >= 6 ? uni.includes(brand) : new RegExp(`(^|[.\-\d])${brand}([.\-\d]|$)`).test(uni);
                const tokens = [label, ...label.split("-").filter((t) => t.length >= 4)];
        const lookalike = ds.some((d) => { const L = d.split(".")[0], sL = skeleton(L); return tokens.some((tk) => tk !== L && (skeleton(tk) === sL || (L.length >= 5 && lev(skeleton(tk), sL) <= (L.length >= 8 ? 2 : 1)))); });
        if (lookalike) { add("critical", 40, `Lookalike of ${brand}`, `"${regUni}" imitates ${ds[0]}.`); break; }
        if (inHost) { add("high", 35, `Uses the "${brand}" name on someone else's domain`, `${sub.includes(brand) ? "The brand sits in a subdomain" : "The brand is mixed into the domain"}, but the real owner is "${regUni}", not ${ds[0]}.`); break; }
        if ((u.pathname + u.search).toLowerCase().includes(brand) && brand.length > 3) { add("medium", 15, `Mentions ${brand} in the path`, `The page lives on "${regUni}" but talks about ${brand}.`); break; }
      }
    }
    if (SHORT.includes(reg) || SHORT.includes(host)) add("medium", 15, "URL shortener", "The real destination is hidden. Expand it with a preview service before trusting it.");
    if (RISKY_TLD.includes(tld)) add("medium", 12, `High-abuse top-level domain .${tld}`, "Cheap TLDs are over-represented in phishing campaigns.");
    if (u.port && !["80", "443"].includes(u.port)) add("medium", 12, `Non-standard port :${u.port}`, "Consumer websites almost never use custom ports.");
    const depth = host.split(".").length;
    if (depth >= 5) add("low", 8, "Deep subdomain chain", `${depth} labels. Often used to push the real domain off-screen on mobile.`);
    if ((reg.replace(/(^|\.)xn--/g, "$1").match(/-/g) || []).length >= 2) add("low", 8, "Hyphen-stuffed domain", reg);
    const kws = KEYW.filter((k) => (host + u.pathname).toLowerCase().includes(k));
    if (kws.length) add("low", Math.min(15, kws.length * 6), "Credential-bait keywords", kws.join(", "));
    const redir = [...u.searchParams.values()].find((v) => /^https?:\/\//i.test(v) || /^https?%3A/i.test(v));
    if (redir) add("medium", 12, "Embedded redirect target", redir.slice(0, 120));
    if (/\.(exe|scr|js|jse|vbs|bat|cmd|msi|iso|img|apk|zip|rar|7z|html?|hta|lnk)$/i.test(u.pathname)) add("medium", 15, "Links straight to a risky file type", u.pathname.split("/").pop());
    if (/\.(pdf|docx?|xlsx?)\.(exe|scr|js|html?|zip)$/i.test(u.pathname)) add("critical", 35, "Double file extension", "Classic trick to disguise an executable as a document.");
    if ((s.match(/%[0-9a-f]{2}/gi) || []).length > 10) add("low", 6, "Heavy percent-encoding", "Encoding can hide the real text of the link.");
    if (s.length > 140) add("low", 5, "Very long URL", `${s.length} characters.`);
    if (official) add("ok", 0, `Registered domain belongs to ${official[0]}`, `"${reg}" is an official ${official[0]} domain.`);

    const score = Math.min(100, findings.reduce((n, f) => n + f.w, 0));
    return { raw, url: u, host, uni, reg: regUni, findings, score };
  }

  function extract(text) {
    const found = text.match(/\b((?:https?|hxxps?):\/\/[^\s<>"')\]]+|(?:javascript|data):[^\s<>"']+|www\.[^\s<>"')\]]+|(?:[a-z0-9-]+(?:\[\.\]|\.))+(?:com|net|org|io|xyz|top|zip|mov|ru|cn|info|biz|co|in|me|app|dev|ly|gl|site|online|live|shop|click)(?:\/[^\s<>"')\]]*)?)/gi) || [];
    return [...new Set(found.map((x) => x.replace(/[.,;:!?]+$/, "")))].slice(0, 100);
  }

  let results = [];
  function run() {
    const urls = extract($("#urls").value);
    if (!urls.length) return RS.toast("No links found", "Paste at least one URL.", "warn");
    results = urls.map(analyze).sort((a, b) => b.score - a.score);
    $("#count").textContent = results.length;
    $("#out").innerHTML = results.map((r, i) => {
      const lvl = r.score >= 50 ? ["danger", "Likely phishing"] : r.score >= 20 ? ["warn", "Suspicious"] : ["ok", "No strong signals"];
      return `<div class="card hover" data-i="${i}" style="padding:1rem;margin-bottom:.8rem;cursor:pointer">
        <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center"><span class="tag ${lvl[0]}">${lvl[1]}</span><b style="font:700 1.2rem var(--font-display)">${r.score}</b></div>
        <div class="mono" style="font-size:.8rem;word-break:break-all;margin:.5rem 0;color:var(--text)">${esc(r.raw)}</div>
        ${r.findings.slice(0, 4).map((f) => `<div style="font-size:.82rem;color:${f.sev === "ok" ? "var(--ok)" : f.sev === "critical" || f.sev === "high" ? "var(--danger)" : "var(--text-2)"}">• ${esc(f.title)}</div>`).join("")}
        ${r.findings.length > 4 ? `<div class="muted" style="font-size:.78rem">+${r.findings.length - 4} more — click for details</div>` : ""}
      </div>`;
    }).join("");
    showAnatomy(0);
    const bad = results.filter((r) => r.score >= 50);
    if (bad.length) RS.evidence.log({ source: "phishing", kind: "url.phish", severity: "medium", title: `Phish Lens flagged ${bad.length} likely phishing link(s)`, detail: { urls: bad.slice(0, 20).map((r) => ({ url: r.raw.slice(0, 200), score: r.score, top: r.findings[0]?.title })) } });
  }
  function showAnatomy(i) {
    const r = results[i];
    if (!r) return;
    const u = r.url;
    $("#anatomy").innerHTML = (u ? `<dl class="kv" style="margin-bottom:1rem">
        <dt>Scheme</dt><dd>${esc(u.protocol)}</dd>
        ${u.username ? `<dt>Decoy userinfo</dt><dd style="color:var(--danger)">${esc(decodeURIComponent(u.username))}${u.password ? ":" + esc(u.password) : ""}</dd>` : ""}
        <dt>Host</dt><dd>${esc(r.host)}</dd>
        ${r.uni !== r.host ? `<dt>Displays as</dt><dd style="color:var(--warn)">${esc(r.uni)}</dd>` : ""}
        <dt>Real owner</dt><dd style="color:var(--cyan);font-weight:700">${esc(r.reg)}</dd>
        ${u.port ? `<dt>Port</dt><dd>${esc(u.port)}</dd>` : ""}
        <dt>Path</dt><dd>${esc(decodeURIComponent(u.pathname))}</dd>
        ${[...u.searchParams].slice(0, 12).map(([k, v]) => `<dt>?${esc(k)}</dt><dd>${esc(v.slice(0, 200))}</dd>`).join("")}
        ${u.hash ? `<dt>Fragment</dt><dd>${esc(u.hash)}</dd>` : ""}
      </dl>` : "") +
      (r.findings.length ? r.findings.map((f) => `<div class="finding ${f.sev}"><div class="f-head"><span class="f-title">${esc(f.title)}</span>${f.sev === "ok" ? `<span class="tag ok">good</span>` : RS.sevTag(f.sev)}</div><div class="f-body">${esc(f.body)}</div></div>`).join("") : `<div class="finding ok"><div class="f-body">No risk signals found. That's not a guarantee. If a message pressures you to act fast, verify through another channel.</div></div>`);
  }
  $("#out").addEventListener("click", (e) => { const c = e.target.closest("[data-i]"); if (c) showAnatomy(+c.dataset.i); });
  $("#go").addEventListener("click", run);
  $("#sample").addEventListener("click", () => {
    $("#urls").value = ["https://www.paypal.com/signin", "http://paypa1-secure-login.com/verify?account=locked", "https://accounts.google.com.security-check.xyz/auth", "https://xn--80ak6aa92e.com/icloud/login", "http://192.168.10.44:8080/office365/login.php", "https://www.microsoft.com@evil.example/reset", "https://bit.ly/3xYz12", "https://dhl-parcel-redelivery.top/track/invoice.pdf.exe", "https://github.com/anthropics"].join("\n");
    run();
  });
})();
