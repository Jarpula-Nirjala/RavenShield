/* Secret Scanner */
(function () {
  const { $, esc, icon, randStr } = RS;
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const HEX = "0123456789abcdef";

  const D = [
    { id: "aws-akid", name: "AWS access key ID", sev: "high", re: /\b(A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/g },
    { id: "aws-secret", name: "AWS secret access key", sev: "critical", re: /aws.{0,25}(secret|private)?.{0,25}['"=:\s]([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/gi, grp: 2 },
    { id: "gh-token", name: "GitHub token", sev: "critical", re: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g },
    { id: "gh-fine", name: "GitHub fine-grained PAT", sev: "critical", re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
    { id: "gitlab", name: "GitLab token", sev: "critical", re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
    { id: "slack-token", name: "Slack token", sev: "high", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g },
    { id: "slack-hook", name: "Slack webhook URL", sev: "high", re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g },
    { id: "stripe", name: "Stripe secret / restricted key", sev: "critical", re: /\b(sk|rk)_(live|test)_[0-9a-zA-Z]{20,}\b/g },
    { id: "google-api", name: "Google API key", sev: "high", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    { id: "gcp-sa", name: "GCP service-account key file", sev: "critical", re: /"type"\s*:\s*"service_account"[\s\S]{0,400}"private_key"/g },
    { id: "openai", name: "OpenAI API key", sev: "critical", re: /\bsk-(proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b|\bsk-proj-[A-Za-z0-9_-]{40,}\b/g },
    { id: "anthropic", name: "Anthropic API key", sev: "critical", re: /\bsk-ant-(api|admin)\d{2}-[A-Za-z0-9_-]{80,}\b/g },
    { id: "hf", name: "Hugging Face token", sev: "high", re: /\bhf_[A-Za-z0-9]{34,}\b/g },
    { id: "twilio", name: "Twilio API key / SID", sev: "high", re: /\b(SK|AC)[0-9a-f]{32}\b/g },
    { id: "sendgrid", name: "SendGrid API key", sev: "critical", re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g },
    { id: "mailgun", name: "Mailgun key", sev: "high", re: /\bkey-[0-9a-f]{32}\b/g },
    { id: "npm", name: "npm access token", sev: "critical", re: /\bnpm_[A-Za-z0-9]{36}\b/g },
    { id: "pypi", name: "PyPI upload token", sev: "critical", re: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}\b/g },
    { id: "discord-hook", name: "Discord webhook", sev: "high", re: /https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g },
    { id: "telegram", name: "Telegram bot token", sev: "high", re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/g },
    { id: "azure-conn", name: "Azure storage connection string", sev: "critical", re: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{60,}/g },
    { id: "shopify", name: "Shopify access token", sev: "high", re: /\bshp(at|ca|pa|ss)_[a-fA-F0-9]{32}\b/g },
    { id: "square", name: "Square access token", sev: "high", re: /\bEAAA[A-Za-z0-9_-]{60}\b/g },
    { id: "private-key", name: "Private key block", sev: "critical", re: /-----BEGIN ((RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED) )?PRIVATE KEY( BLOCK)?-----/g },
    { id: "jwt", name: "JSON Web Token", sev: "medium", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
    { id: "db-url", name: "Connection string with password", sev: "high", re: /\b(postgres(ql)?|mysql|mariadb|mongodb(\+srv)?|redis|rediss|amqps?|mssql):\/\/[^:\s/@]+:[^@\s]{3,}@[^\s'"]+/gi },
    { id: "basic-url", name: "Credentials in URL", sev: "high", re: /\bhttps?:\/\/[^:\s/@]{2,}:[^@\s/]{3,}@[^\s'"]+/g },
    { id: "pwd-assign", name: "Hard-coded password", sev: "medium", re: /\b(pass(word|wd)?|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"]([^'"\s]{6,})['"]/gi, grp: 3, entropyMin: 2.5 },
  ];
  $("#dcount").textContent = D.length + "+";

  const entropyRe = /(?:^|[\s'"=:(,])([A-Za-z0-9+/_\-]{24,})(?=$|[\s'",;)])/g;
  const mask = (s) => (s.length <= 10 ? s.slice(0, 2) + "…" : s.slice(0, 4) + "•".repeat(Math.min(12, s.length - 8)) + s.slice(-4));

  let files = [];
  let lastFindings = [];

  function scan() {
    const sources = files.length ? files : [{ name: "pasted text", text: $("#src").value }];
    if (!sources.some((s) => s.text.trim())) return RS.toast("Nothing to scan", "", "warn");
    const decoyTokens = RS.store.get("vault", []).flatMap((d) => d.tokens.map((t) => ({ v: t.v, d })));
    const findings = [];
    for (const src of sources) {
      const text = src.text;
      const lineOf = (i) => text.slice(0, i).split("\n").length;
      const seen = new Set();
      for (const d of D) {
        d.re.lastIndex = 0;
        let m;
        while ((m = d.re.exec(text))) {
          const val = m[d.grp || 0];
          const at = m.index + m[0].indexOf(val);
          if (d.entropyMin && RS.entropy(val) < d.entropyMin) continue;
          if (/^(x+|\*+|\.+|changeme|password|example|your[_-]?\w*|<[^>]+>|\$\{?\w+\}?)$/i.test(val)) continue;
          const key = at + ":" + val;
          if (seen.has(key)) continue;
          seen.add(key);
          findings.push({ file: src.name, line: lineOf(at), type: d.name, id: d.id, sev: d.sev, value: val, at, entropy: RS.entropy(val) });
        }
      }
      if ($("#entropy").checked) {
        entropyRe.lastIndex = 0;
        let m;
        while ((m = entropyRe.exec(text))) {
          const val = m[1];
          const at = m.index + m[0].indexOf(val);
          if ([...seen].some((k) => k.endsWith(":" + val) || k.includes(val))) continue;
          const e = RS.entropy(val);
          const mixed = /[a-z]/.test(val) + /[A-Z]/.test(val) + /\d/.test(val) >= 2;
          if (e > 4.3 && mixed && !/^[a-f0-9]{40,64}$/i.test(val) && !/\//.test(val.slice(1, -1).replace(/[A-Za-z0-9+]/g, "")) && !/^[A-Za-z]+$/.test(val)) {
            seen.add(at + ":" + val);
            findings.push({ file: src.name, line: lineOf(at), type: "High-entropy string", id: "entropy", sev: "low", value: val, at, entropy: e });
          }
        }
      }
    }
    for (const f of findings) { const dt = decoyTokens.find((t) => t.v === f.value); if (dt) { f.decoy = dt.d; } }
    lastFindings = findings;
    render(findings, sources);
    const real = findings.filter((f) => !f.decoy && f.sev !== "low");
    if (real.length) RS.evidence.log({ source: "secrets", kind: "secret.found", severity: real.some((f) => f.sev === "critical") ? "high" : "medium", title: `Secret scanner found ${real.length} credential(s)`, detail: { files: [...new Set(real.map((f) => f.file))].slice(0, 20), types: [...new Set(real.map((f) => f.type))], masked: real.slice(0, 20).map((f) => `${f.file}:${f.line} ${mask(f.value)}`) } });
    const decoys = findings.filter((f) => f.decoy);
    if (decoys.length) RS.evidence.log({ source: "vault", kind: "decoy.trip", severity: "high", title: `Decoy token(s) found by secret scanner`, detail: { decoys: [...new Set(decoys.map((f) => f.decoy.label))], where: decoys.map((f) => `${f.file}:${f.line}`).slice(0, 20) } });
  }

  function render(findings, sources) {
    const crit = findings.filter((f) => f.sev === "critical" || f.sev === "high").length;
    const v = $("#verdict");
    v.className = "verdict " + (crit ? "danger" : findings.length ? "warn" : "ok");
    v.innerHTML = `<div class="v-icon">${icon(crit ? "alert" : findings.length ? "info" : "shieldCheck")}</div><div><h4>${findings.length ? `${findings.length} potential secret(s)` : "No secrets found"}</h4><p>${sources.length} source(s), ${sources.reduce((n, s) => n + s.text.length, 0).toLocaleString()} chars scanned.</p></div>`;
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    findings.sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file) || a.line - b.line);
    $("#out").innerHTML = findings.length ? findings.map((f) => `
      <div class="finding ${f.sev}">
        <div class="f-head"><span class="f-title">${esc(f.type)}</span><span>${f.decoy ? `<span class="tag violet">your decoy: ${esc(f.decoy.label)}</span> ` : ""}${RS.sevTag(f.sev)}</span></div>
        <div class="f-body"><code>${esc(mask(f.value))}</code> <span class="muted">· ${esc(f.file)}:${f.line} · entropy ${f.entropy.toFixed(2)}</span></div>
      </div>`).join("") : `<div class="empty">${icon("shieldCheck")}Clean. Nothing that looks like a credential.</div>`;
  }

  async function loadFiles(list) {
    files = [];
    let skipped = 0;
    for (const f of list) {
      if (f.size > 3e6 || /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|mp4|mp3|woff2?|ttf|exe|dll|so|bin|lock)$/i.test(f.name) || /(^|\/)(node_modules|\.git)\//.test(f.webkitRelativePath || "")) { skipped++; continue; }
      files.push({ name: f.webkitRelativePath || f.name, text: await RS.readFile(f) });
      if (files.length >= 2000) break;
    }
    $("#meta").textContent = `${files.length} file(s)${skipped ? `, ${skipped} skipped` : ""}`;
    $("#src").value = files.length === 1 ? files[0].text : `[${files.length} files loaded: ${files.slice(0, 5).map((f) => f.name).join(", ")}${files.length > 5 ? "…" : ""}]`;
    scan();
  }
  $("#src").addEventListener("input", () => { if (files.length) { files = []; $("#meta").textContent = ""; } });
  $("#files").addEventListener("change", (e) => loadFiles([...e.target.files]));
  $("#folder").addEventListener("change", (e) => loadFiles([...e.target.files]));
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => loadFiles([...e.dataTransfer.files]));
  $("#scan").addEventListener("click", scan);

  $("#sample").addEventListener("click", () => {
    files = []; $("#meta").textContent = "";
    // Sample secrets are generated at runtime so no real-looking tokens live in the source code.
    $("#src").value = [
      "# config/settings.py",
      `AWS_ACCESS_KEY_ID = "${"AKI" + "A" + randStr(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")}"`,
      `aws_secret_access_key = "${randStr(40, A + "/+")}"`,
      `GITHUB_TOKEN = "${"gh" + "p_" + randStr(36, A)}"`,
      `STRIPE_KEY = "${"sk_" + "live_" + randStr(28, A)}"`,
      `DATABASE_URL = "postgres://admin:${randStr(14, A)}@db.internal:5432/app"`,
      `password = "${randStr(6, A)}!${randStr(4, A)}"`,
      `session = "${"ey" + "J" + randStr(20, A)}.${"ey" + "J" + randStr(30, A)}.${randStr(40, A)}"`,
      "-----BEGIN " + "OPENSSH PRIVATE KEY-----",
      randStr(64, A),
      "-----END OPENSSH PRIVATE KEY-----",
      `checksum = "${randStr(64, HEX)}"   # not a secret: plain hash`,
      `PLACEHOLDER_KEY = "your_api_key_here"`,
    ].join("\n");
    scan();
  });

  $("#redact").addEventListener("click", () => {
    if (files.length > 1) return RS.toast("Redacted copy works on single inputs", "Paste or drop one file.", "warn");
    let text = files[0]?.text ?? $("#src").value;
    if (!lastFindings.length) return RS.toast("Scan first", "", "warn");
    for (const f of [...lastFindings].sort((a, b) => b.at - a.at)) text = text.slice(0, f.at) + "[REDACTED:" + f.id + "]" + text.slice(f.at + f.value.length);
    RS.download("redacted.txt", text);
  });
  $("#report").addEventListener("click", () => {
    if (!lastFindings.length) return RS.toast("Nothing to report", "", "warn");
    RS.download("secret-scan-report.csv", "severity,type,file,line,masked_value,entropy\n" + lastFindings.map((f) => [f.sev, f.type, f.file, f.line, mask(f.value), f.entropy.toFixed(2)].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  });
})();
