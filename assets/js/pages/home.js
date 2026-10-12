/* Home page interactions */
(function () {
  const { $, esc, icon } = RS;

  /* --- Tool cards --- */
  const card = (t, i) => `
    <a class="card hover glow-card tool-card reveal" style="--d:${(i % 3) * 0.08}s" href="${t.file}">
      ${RS.featLogo(t.id)}
      <h3>${t.name}</h3>
      <p>${t.tag}.</p>
      <span class="go">Open tool ${icon("arrow")}</span>
    </a>`;
  const blurbs = {
    vault: "Seed decoy identities, plus-addressed tripwire emails and fake cloud keys. Export them as bait files and match leaks back to the exact decoy",
    rag: "Hide invisible zero-width fingerprints and fictitious trap facts in documents. If an AI repeats them, you know exactly which document leaked",
    shield: "Rules engine, heuristic analyzer and sanitizer stop prompt-injection, jailbreaks and exfiltration links before they reach your model",
    honeypot: "A convincing decoy assistant that baits attackers, classifies their intent in real time and fingerprints the client",
    audit: "Seal every agent action with SHA-256 into an append-only chain. Verify any export, anywhere, any time",
    agent: "Scan agent skills and plugins for shell exec, exfiltration and hidden instructions, then replay agent logs on a risk timeline",
  };
  $("#core-tools").innerHTML = RS.tools.filter((t) => t.core).map((t, i) => card({ ...t, tag: blurbs[t.id] || t.tag }, i)).join("");
  $("#extra-tools").innerHTML = RS.tools.filter((t) => !t.core).map(card).join("");

  /* --- Stats --- */
  const stats = [
    { n: RS.tools.length, l: "security tools", i: "grid" },
    { n: 0, l: "dollars, forever", i: "heart", pre: "$" },
    { n: 0, l: "bytes sent to our servers", i: "wifiOff" },
    { n: "∞", l: "scans, decoys & records", i: "zap" },
  ];
  $("#stats").innerHTML = stats.map((s, i) => `<div class="card stat reveal" style="--d:${i * 0.08}s"><div class="ico">${icon(s.i)}</div><div class="n" data-n="${s.n}">${s.pre || ""}${s.n}</div><div class="l">${s.l}</div></div>`).join("");

  /* --- Marquee --- */
  const mq = [["key", "Decoy identities"], ["mail", "Tripwire emails"], ["file", "Trap facts"], ["eye", "Zero-width fingerprints"], ["shieldCheck", "Prompt-injection firewall"], ["flame", "AI honeypot"], ["fingerprint", "Client fingerprinting"], ["chain", "SHA-256 evidence chain"], ["bot", "Agent skill scanning"], ["scan", "Secret detection"], ["lock", "Breach check (k-anonymity)"], ["hook", "Phishing lens"], ["hash", "File integrity"]];
  const mqHtml = mq.map(([i, t]) => `<span>${icon(i)}${t}</span>`).join("");
  $("#marquee").innerHTML = mqHtml + mqHtml;

  /* --- Typewriter --- */
  const lines = [
    " decoy svc-backup@corp tripped from 185.220.101.4 — sealed #a91f…",
    " shield blocked: 'ignore previous instructions…' (score 92)",
    " honeypot intent=extraction · fingerprint 7c2e19ab",
    " trap fact 'Obsidian-Heron-4471' found in model output",
    " audit chain verified · 1,284 records · head 3fd0…",
    " secret scanner: github_pat_* found in config.yml:14",
  ];
  const typer = $("#typer");
  let li = 0;
  (async function loop() {
    for (;;) {
      const s = lines[li++ % lines.length];
      for (let i = 0; i <= s.length; i++) { typer.textContent = s.slice(0, i); await RS.sleep(28); }
      await RS.sleep(2200);
      for (let i = s.length; i >= 0; i -= 3) { typer.textContent = s.slice(0, i); await RS.sleep(10); }
    }
  })();

  /* --- Live decoy demo --- */
  const key = "AKIA" + RS.randStr(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
  const secret = RS.randStr(40, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/+");
  $("#demo-key").textContent = key;
  $("#demo-copy").addEventListener("click", () => RS.copy(key, "Decoy key copied"));
  const term = $("#demo-term");
  const say = (html) => { term.insertAdjacentHTML("beforeend", `<div class="l">${html}</div>`); while (term.children.length > 14) term.firstElementChild.remove(); };
  const ips = ["185.220.101.4", "45.155.205.233", "103.75.190.12", "91.240.118.172", "194.26.29.81"];
  const agents = ["aws-cli/2.15.0 Python/3.11", "Boto3/1.34.2 Python/3.10", "python-requests/2.31", "curl/8.4.0"];
  let running = false;
  $("#demo-run").addEventListener("click", async () => {
    if (running) return;
    running = true;
    const ip = RS.pick(ips), ua = RS.pick(agents);
    say(`<span class="t-dim">${new Date().toISOString()}</span>`);
    await RS.sleep(300); say(`<span class="t-w">⚠ inbound auth</span> sts:GetCallerIdentity using key <span class="t-c">${key.slice(0, 8)}…</span>`);
    await RS.sleep(500); say(`<span class="t-d">✖ DECOY TRIPPED</span> — no legitimate user owns this identity`);
    await RS.sleep(450); say(`<span class="t-dim">  source ip   </span>${ip}`);
    await RS.sleep(200); say(`<span class="t-dim">  user-agent  </span>${esc(ua)}`);
    await RS.sleep(200); say(`<span class="t-dim">  decoy       </span>svc-backup (RavenVault)`);
    await RS.sleep(400); say(`<span class="t-v">⛓ sealing evidence…</span>`);
    const rec = await RS.evidence.log({
      source: "vault", kind: "decoy.trip", severity: "high",
      title: "Decoy AWS key used (homepage demo)",
      detail: { key: key.slice(0, 8) + "…", ip, userAgent: ua, demo: true, secretFingerprint: (await RS.sha256(secret)).slice(0, 16) },
    });
    say(`<span class="t-ok">✔ sealed</span> #${rec.seq} hash <span class="t-c">${rec.hash.slice(0, 24)}…</span>`);
    say(`<span class="t-dim">  prev        ${rec.prev.slice(0, 24)}…</span>`);
    RS.toast("Decoy tripped", "Event sealed into your evidence log.", "danger");
    RS.heroLogo?.slowClose();
    running = false;
  });

  /* --- Evidence chain demo --- */
  const sample = [
    { source: "vault", kind: "decoy.seed", severity: "info", title: "Seeded decoy identity svc-backup" },
    { source: "shield", kind: "inspect.block", severity: "high", title: "Blocked prompt injection (score 92)" },
    { source: "honeypot", kind: "intent.extraction", severity: "medium", title: "Honeypot: system-prompt extraction attempt" },
    { source: "rag", kind: "trapfact.hit", severity: "high", title: "Trap fact surfaced in model output" },
    { source: "audit", kind: "agent.action", severity: "info", title: "Agent wrote report.pdf" },
  ];
  let chain = [];
  const build = async () => {
    chain = [];
    let prev = "0".repeat(64);
    const t0 = Date.UTC(2026, 9, 1, 9, 0, 0);
    for (let i = 0; i < sample.length; i++) {
      const r = { seq: i, id: "ev_demo" + i, ts: t0 + i * 61000, ...sample[i], detail: null, prev };
      r.hash = await RS.sealRecord(r);
      prev = r.hash;
      chain.push(r);
    }
  };
  const render = async () => {
    const v = await RS.evidence.verify(chain);
    const bad = v.ok ? Infinity : v.index;
    $("#chain").innerHTML = chain.map((r, i) => `
      <div class="block ${i >= bad ? "bad" : ""}">
        <div class="b-n">#${r.seq} · ${esc(r.source)}</div>
        <div style="margin:.35rem 0;color:var(--text)">${esc(r.title)}</div>
        <div class="b-h">prev ${r.prev.slice(0, 16)}…</div>
        <div class="b-h">hash ${r.hash.slice(0, 16)}…</div>
      </div>`).join("");
    const st = $("#chain-status");
    st.className = "verdict " + (v.ok ? "ok" : "danger");
    st.innerHTML = v.ok
      ? `<div class="v-icon">${icon("shieldCheck")}</div><div><h4>Chain intact</h4><p>${v.count} records verified · head ${v.head.slice(0, 20)}…</p></div>`
      : `<div class="v-icon">${icon("alert")}</div><div><h4>Tampering detected at record #${v.index}</h4><p>${esc(v.reason)}. Every record after it is now untrusted.</p></div>`;
  };
  build().then(render);
  $("#chain-tamper").addEventListener("click", () => {
    chain[2].title = "Honeypot: harmless greeting"; // attacker rewrites history
    render();
    RS.toast("Record #2 rewritten", "Watch the seal break.", "warn");
  });
  $("#chain-reset").addEventListener("click", () => build().then(render));

  RS.icons();
  RS.reveal();
})();
