/* Evidence Dashboard */
(function () {
  const { $, esc, icon } = RS;
  const COLORS = { vault: "#2ee6f5", rag: "#a58bff", shield: "#5aa9ff", honeypot: "#ff7a59", audit: "#2ee6a0", agent: "#ffb547", secrets: "#ff4d6d", password: "#e879f9", phishing: "#f472b6", integrity: "#94a3b8", system: "#64748b" };
  const NAMES = Object.fromEntries(RS.tools.map((t) => [t.id, t.name]));
  let limit = 50;
  let open = new Set();

  function filtered(list) {
    const q = $("#q").value.trim().toLowerCase(), s = $("#fsrc").value, v = $("#fsev").value;
    return list.filter((r) => (!s || r.source === s) && (!v || r.severity === v) && (!q || (r.title + " " + JSON.stringify(r.detail || "")).toLowerCase().includes(q)));
  }

  function render() {
    const all = RS.evidence.all();
    const day = 86400000;
    const hi = all.filter((r) => r.severity === "high" || r.severity === "critical").length;
    const last24 = all.filter((r) => Date.now() - r.ts < day).length;
    const decoys = RS.store.get("vault", []), traps = RS.store.get("rag", []);
    $("#stats").innerHTML = [
      ["chain", all.length, "sealed records"],
      ["alert", hi, "high / critical"],
      ["activity", last24, "events in 24h"],
      ["eye", decoys.length + traps.length, `decoys & traps watched (${decoys.filter((d) => d.status === "tripped").length} tripped)`],
    ].map(([i, n, l]) => `<div class="card stat"><div class="ico">${icon(i)}</div><div class="n">${n.toLocaleString()}</div><div class="l">${l}</div></div>`).join("");

    // sources filter
    const sources = [...new Set(all.map((r) => r.source))].sort();
    const cur = $("#fsrc").value;
    $("#fsrc").innerHTML = `<option value="">All sources</option>` + sources.map((s) => `<option value="${esc(s)}" ${s === cur ? "selected" : ""}>${esc(NAMES[s] || s)}</option>`).join("");

    // by source bars
    const counts = {};
    all.forEach((r) => (counts[r.source] = (counts[r.source] || 0) + 1));
    const max = Math.max(1, ...Object.values(counts));
    $("#bysource").innerHTML = Object.keys(counts).length ? Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, n]) => `
      <div style="margin-bottom:.7rem"><div style="display:flex;justify-content:space-between;font-size:.85rem"><span>${esc(NAMES[s] || s)}</span><span class="mono muted">${n}</span></div>
      <div class="meter" style="height:7px;margin-top:.3rem"><i style="width:${(n / max) * 100}%;background:${COLORS[s] || "var(--cyan)"}"></i></div></div>`).join("") : `<div class="empty">No events yet.</div>`;

    // table
    const list = filtered(all).slice().reverse();
    $("#rows").innerHTML = list.length ? list.slice(0, limit).map((r) => `
      <tr data-seq="${r.seq}" style="cursor:pointer">
        <td class="mono">${r.seq}</td>
        <td class="mono" style="white-space:nowrap">${new Date(r.ts).toLocaleString()}</td>
        <td><span style="display:inline-flex;align-items:center;gap:.4rem"><i style="width:8px;height:8px;border-radius:50%;background:${COLORS[r.source] || "#888"}"></i>${esc(NAMES[r.source] || r.source)}</span></td>
        <td>${RS.sevTag(r.severity)}</td>
        <td>${esc(r.title)}<div class="muted mono" style="font-size:.72rem">${esc(r.kind)}</div></td>
        <td class="mono muted" style="font-size:.72rem">${r.hash.slice(0, 12)}…</td>
      </tr>
      ${open.has(r.seq) ? `<tr><td colspan="6"><dl class="kv" style="margin-bottom:.6rem"><dt>Record ID</dt><dd>${esc(r.id)}</dd><dt>Previous hash</dt><dd>${r.prev}</dd><dt>Seal (SHA-256)</dt><dd>${r.hash}</dd></dl><pre style="max-height:280px">${esc(JSON.stringify(r.detail, null, 2))}</pre></td></tr>` : ""}`).join("")
      : `<tr><td colspan="6"><div class="empty">${icon("chain")}No records${all.length ? " match your filters" : " yet. Use any tool, or load demo data"}.</div></td></tr>`;
    $("#more").innerHTML = list.length > limit ? `<button class="btn btn-sm" id="showmore">Show more (${list.length - limit} remaining)</button>` : "";
    drawChart(all);
  }

  function drawChart(all) {
    const c = $("#chart");
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    if (!W) return;
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext("2d");
    x.scale(dpr, dpr);
    x.clearRect(0, 0, W, H);
    const days = 14, start = new Date(); start.setHours(0, 0, 0, 0);
    const t0 = start.getTime() - (days - 1) * 86400000;
    const buckets = Array.from({ length: days }, () => ({}));
    const srcs = new Set();
    all.forEach((r) => { const i = Math.floor((r.ts - t0) / 86400000); if (i >= 0 && i < days) { buckets[i][r.source] = (buckets[i][r.source] || 0) + 1; srcs.add(r.source); } });
    const totals = buckets.map((b) => Object.values(b).reduce((a, n) => a + n, 0));
    const max = Math.max(4, ...totals);
    const padL = 32, padB = 26, padT = 8, cw = W - padL - 8, ch = H - padB - padT;
    x.font = "13px \"Times New Roman\", Times, serif";
    x.fillStyle = "#6b6a8a"; x.strokeStyle = "rgba(99,102,241,.12)"; x.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + ch - (ch * g) / 4;
      x.beginPath(); x.moveTo(padL, y); x.lineTo(W - 8, y); x.stroke();
      x.fillText(String(Math.round((max * g) / 4)), 2, y + 4);
    }
    const bw = cw / days;
    const order = [...srcs];
    buckets.forEach((b, i) => {
      let y = padT + ch;
      for (const s of order) {
        const n = b[s] || 0; if (!n) continue;
        const h = (n / max) * ch;
        x.fillStyle = COLORS[s] || "#888";
        const bx = padL + i * bw + bw * 0.18, bwid = bw * 0.64;
        x.beginPath();
        if (x.roundRect) x.roundRect(bx, y - h, bwid, h, 3); else x.rect(bx, y - h, bwid, h);
        x.fill();
        y -= h;
      }
      if (i % 2 === 0 || days <= 7) {
        const d = new Date(t0 + i * 86400000);
        x.fillStyle = "#6b6a8a";
        x.fillText(`${d.getDate()}/${d.getMonth() + 1}`, padL + i * bw + bw / 2 - 12, H - 8);
      }
    });
    $("#legend").innerHTML = order.map((s) => `<span style="display:inline-flex;align-items:center;gap:.3rem"><i style="width:8px;height:8px;border-radius:2px;background:${COLORS[s] || "#888"}"></i>${esc(NAMES[s] || s)}</span>`).join("");
  }

  async function verify(toast) {
    const v = await RS.evidence.verify();
    const el = $("#chainstat");
    el.className = "verdict " + (v.ok ? "ok" : "danger");
    el.innerHTML = v.ok
      ? `<div class="v-icon">${icon("shieldCheck")}</div><div><h4>Chain intact</h4><p>${v.count} record(s) · head <code>${v.head.slice(0, 16)}…</code></p></div>`
      : `<div class="v-icon">${icon("alert")}</div><div><h4>Tampering at record #${v.index}</h4><p>${esc(v.reason)}</p></div>`;
    if (toast) RS.toast(v.ok ? "Chain verified" : "Chain broken", v.ok ? `${v.count} records intact` : v.reason, v.ok ? "ok" : "danger");
  }

  /* demo data */
  const DEMO = [
    ["vault", "decoy.seed", "info", "Seeded decoy identity svc-backup"],
    ["rag", "trap.plant", "info", "Planted trap in \"Q3 pricing strategy\""],
    ["shield", "inspect.review", "medium", "Firewall flagged input (score 31)"],
    ["agent", "skill.scan", "high", "Risky agent skill (score 88)"],
    ["shield", "inspect.block", "high", "Firewall blocked input (score 92)"],
    ["honeypot", "intent.probing", "medium", "Honeypot detected probing attempt"],
    ["honeypot", "intent.extraction", "high", "Honeypot detected extraction attempt"],
    ["honeypot", "bait.issued", "medium", "Honeypot issued bait login (honeypot-svc-hr-sync-221)"],
    ["secrets", "secret.found", "high", "Secret scanner found 3 credential(s)"],
    ["phishing", "url.phish", "medium", "Phish Lens flagged 2 likely phishing link(s)"],
    ["audit", "agent.file_write", "info", "report-bot → file_write s3://finance/q3.pdf"],
    ["audit", "agent.shell_exec", "high", "ops-agent → shell_exec kubectl delete pod web-7f9"],
    ["rag", "trap.hit", "high", "Trap fact from \"Q3 pricing strategy\""],
    ["vault", "decoy.trip", "high", "Decoy svc-backup tripped — Found in pasted leak"],
    ["integrity", "file.notarize", "info", "Notarized incident-notes.pdf (220.4 KB)"],
  ];
  async function loadDemo() {
    const cur = RS.evidence.all();
    if (cur.length) {
      if (!confirm("Append demo events to your existing log? They'll be marked as demo.")) return;
      for (const [source, kind, severity, title] of DEMO) await RS.evidence.log({ source, kind, severity, title: "[demo] " + title, detail: { demo: true } });
    } else {
      const now = Date.now();
      let prev = "0".repeat(64);
      const recs = [];
      const n = DEMO.length * 2;
      for (let i = 0; i < n; i++) {
        const [source, kind, severity, title] = DEMO[i % DEMO.length];
        const r = { seq: i, id: RS.uid("ev_"), ts: now - (n - i) * (13 * 86400000 / n) - RS.rand(3600000), source, kind, severity, title: "[demo] " + title, detail: { demo: true }, prev };
        r.hash = await RS.sealRecord(r);
        prev = r.hash;
        recs.push(r);
      }
      RS.evidence.replace(recs);
    }
    RS.toast("Demo data loaded", "Clear it any time.", "ok");
  }

  /* events */
  $("#rows").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-seq]"); if (!tr) return;
    const s = +tr.dataset.seq;
    open.has(s) ? open.delete(s) : open.add(s);
    render();
  });
  $("#more").addEventListener("click", (e) => { if (e.target.id === "showmore") { limit += 100; render(); } });
  ["q", "fsrc", "fsev"].forEach((id) => $("#" + id).addEventListener("input", () => { limit = 50; render(); }));
  $("#verify").addEventListener("click", () => verify(true));
  $("#demo").addEventListener("click", loadDemo);
  $("#exp-json").addEventListener("click", () => RS.download(`ravenshield-evidence-${new Date().toISOString().slice(0, 10)}.json`, RS.evidence.exportJSON(), "application/json"));
  $("#exp-csv").addEventListener("click", () => {
    const rows = RS.evidence.all().map((r) => [r.seq, new Date(r.ts).toISOString(), r.source, r.kind, r.severity, r.title, r.hash, r.prev, JSON.stringify(r.detail)].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    RS.download("ravenshield-evidence.csv", "seq,time,source,kind,severity,title,hash,prev,detail\n" + rows.join("\n"), "text/csv");
  });
  $("#print").addEventListener("click", () => { limit = Infinity; open = new Set(); render(); setTimeout(() => { window.print(); limit = 50; render(); }, 100); });
  $("#import").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await RS.readFile(f));
      const recs = Array.isArray(d) ? d : d.records;
      const v = await RS.evidence.verify(recs);
      if (!v.ok) return RS.toast("Import refused", `The file's chain is broken at #${v.index}.`, "danger");
      if (!confirm(`Replace your current log (${RS.evidence.all().length} records) with ${recs.length} verified records from ${f.name}? Export first if you need a backup.`)) return;
      RS.evidence.replace(recs);
      RS.toast("Imported", `${recs.length} records, chain intact.`, "ok");
    } catch (err) { RS.toast("Couldn't import", err.message, "danger"); }
    e.target.value = "";
  });
  $("#clear").addEventListener("click", () => {
    if (!confirm("Permanently delete every record in this browser's evidence log? Export first if you need it.")) return;
    RS.evidence.clear();
    RS.toast("Evidence log cleared", "", "info");
  });
  $("#notify").addEventListener("click", async () => {
    if (!("Notification" in window)) return RS.toast("Notifications unsupported", "", "warn");
    const s = RS.store.get("settings", {});
    if (s.notify) { s.notify = false; RS.store.set("settings", s); updNotify(); return RS.toast("Desktop alerts off", "", "info"); }
    const p = await Notification.requestPermission();
    if (p !== "granted") return RS.toast("Permission denied", "Enable notifications for this site in your browser settings.", "warn");
    s.notify = true; RS.store.set("settings", s); updNotify();
    new Notification("RavenShield alerts on", { body: "You'll be notified of high-severity events while a RavenShield tab is open.", icon: "assets/img/icon-192.png" });
  });
  const updNotify = () => { const on = RS.store.get("settings", {}).notify; $("#notify").innerHTML = icon("bell") + (on ? " Alerts on" : " Alerts off"); };

  window.addEventListener("rs:evidence", () => { render(); verify(false); });
  window.addEventListener("resize", () => drawChart(RS.evidence.all()));
  const me = RS.auth.current();
  if (me) $("#greet").innerHTML = `Welcome back, <b style="color:var(--text)">${esc(me.name)}</b>. Every tool, one sealed log, stored only in this browser.`;
  updNotify();
  render();
  verify(false);
})();
