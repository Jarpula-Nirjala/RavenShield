/* RavenVault — decoy identities, bait packs, leak matcher */
(function () {
  const { $, esc, icon, randStr, pick } = RS;
  const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", LO = "abcdefghijklmnopqrstuvwxyz", DIG = "0123456789";
  const ALNUM = UP + LO + DIG;
  const FIRST = ["alex", "jordan", "morgan", "sam", "taylor", "casey", "riley", "jamie", "drew", "quinn", "avery", "rohan", "priya", "li", "omar", "elena"];
  const LAST = ["chen", "patel", "garcia", "nguyen", "smith", "kim", "silva", "khan", "muller", "rossi", "sato", "okafor", "ivanova", "shah"];
  const WORDS = ["Falcon", "Harbor", "Summit", "Cobalt", "Juniper", "Atlas", "Ember", "Granite", "Willow", "Orbit", "Maple", "Copper"];
  const SYMS = "!@#$%&*";

  let decoys = RS.store.get("vault", []);
  const save = () => RS.store.set("vault", decoys);

  const b64url = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

  function mint() {
    const kinds = RS.$$("#kinds input:checked").map((i) => i.value);
    const marker = "rvn-" + randStr(8);
    const label = ($("#label").value.trim() || pick(FIRST) + "." + pick(LAST)).replace(/\s+/g, "-").toLowerCase();
    const org = ($("#org").value.trim() || pick(["acme-internal.com", "northwind-corp.net", "globex-it.io", "initech-hq.com"])).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const my = $("#myemail").value.trim();
    const tokens = [];
    const t = (k, lbl, v) => tokens.push({ k, label: lbl, v });
    if (my && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(my)) {
      const [local, dom] = my.split("@");
      t("alias", "Tripwire email (your inbox)", `${local.split("+")[0]}+rs-${randStr(5)}@${dom}`);
    }
    t("email", "Decoy work email", `${label}@${org}`);
    const pw = `${pick(WORDS)}${pick(SYMS)}${2019 + RS.rand(7)}${randStr(3, LO)}`;
    if (kinds.includes("login")) { t("user", "Username", label); t("password", "Password", pw); }
    if (kinds.includes("aws")) { t("awsId", "AWS access key ID", "AKIA" + randStr(16, UP + "234567")); t("awsSecret", "AWS secret access key", randStr(40, ALNUM + "/+")); }
    if (kinds.includes("gh")) t("gh", "GitHub token", "ghp_" + randStr(36, ALNUM));
    if (kinds.includes("api")) t("api", "API key", org.split(/[.-]/)[0].slice(0, 4) + "_prod_" + randStr(32, ALNUM));
    if (kinds.includes("db")) t("db", "Database URL", `postgres://${label.replace(/\W/g, "_")}:${encodeURIComponent(pw)}@db-prod-${RS.rand(9) + 1}.${org}:5432/${pick(["payments", "billing", "customers", "hr"])}`);
    if (kinds.includes("jwt")) t("jwt", "Session JWT", `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: label, email: `${label}@${org}`, role: "admin", ref: marker, iat: Math.floor(Date.now() / 1000) })}.${randStr(43, ALNUM + "-_")}`);
    t("marker", "Hidden marker", marker);

    const d = { id: RS.uid("dc_"), label, org, place: $("#place").value.trim(), created: Date.now(), status: "watching", marker, tokens, trips: [] };
    decoys.unshift(d);
    save();
    render();
    RS.evidence.log({ source: "vault", kind: "decoy.seed", severity: "info", title: `Seeded decoy identity ${label}`, detail: { decoy: d.id, marker, placement: d.place || null, tokenKinds: tokens.map((x) => x.k) } });
    RS.toast("Decoy minted", `${label} is now being watched.`, "ok");
    $("#label").value = "";
  }

  /* ---------- bait formats ---------- */
  const val = (d, k) => (d.tokens.find((x) => x.k === k) || {}).v;
  function envFile(d) {
    const L = [`# ${d.org} — service credentials (do not commit)`, `# ref: ${d.marker}`];
    if (val(d, "user")) L.push(`SERVICE_USER=${val(d, "user")}`, `SERVICE_PASSWORD=${val(d, "password")}`);
    if (val(d, "email")) L.push(`ADMIN_EMAIL=${val(d, "email")}`);
    if (val(d, "alias")) L.push(`ALERT_EMAIL=${val(d, "alias")}`);
    if (val(d, "awsId")) L.push(`AWS_ACCESS_KEY_ID=${val(d, "awsId")}`, `AWS_SECRET_ACCESS_KEY=${val(d, "awsSecret")}`, "AWS_DEFAULT_REGION=us-east-1");
    if (val(d, "gh")) L.push(`GITHUB_TOKEN=${val(d, "gh")}`);
    if (val(d, "api")) L.push(`API_KEY=${val(d, "api")}`);
    if (val(d, "db")) L.push(`DATABASE_URL=${val(d, "db")}`);
    if (val(d, "jwt")) L.push(`SESSION_TOKEN=${val(d, "jwt")}`);
    return L.join("\n") + "\n";
  }
  function awsFile(d) {
    return val(d, "awsId") ? `[${d.label}]\naws_access_key_id = ${val(d, "awsId")}\naws_secret_access_key = ${val(d, "awsSecret")}\n# ${d.marker}\n` : "";
  }
  function csvRow(d) { return [val(d, "alias") || val(d, "email"), val(d, "user") || d.label, val(d, "password") || "", `https://portal.${d.org}/login`, d.marker].map((x) => `"${String(x || "").replace(/"/g, '""')}"`).join(","); }
  function pack(list) {
    return [
      "########## .env ##########", ...list.map(envFile),
      "########## ~/.aws/credentials ##########", ...list.map(awsFile).filter(Boolean),
      "########## credentials.csv ##########", "email,username,password,url,ref", ...list.map(csvRow), "",
    ].join("\n");
  }

  /* ---------- render ---------- */
  function render() {
    const tripped = decoys.filter((d) => d.status === "tripped").length;
    $("#vstats").innerHTML = [
      ["eye", decoys.length, "decoys watched"],
      ["alert", tripped, "tripped"],
      ["key", decoys.reduce((n, d) => n + d.tokens.length, 0), "bait tokens"],
    ].map(([i, n, l]) => `<div class="card stat"><div class="ico">${icon(i)}</div><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");

    if (!decoys.length) { $("#list").innerHTML = `<div class="empty">${icon("key")}No decoys yet. Mint your first one on the left.</div>`; return; }
    $("#list").innerHTML = decoys.map((d) => `
      <div class="card" style="margin-bottom:1rem;padding:1.1rem;${d.status === "tripped" ? "border-color:rgba(255,77,109,.5)" : ""}">
        <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center;flex-wrap:wrap">
          <div><strong style="font-size:1.02rem">${esc(d.label)}</strong> <span class="muted" style="font-size:.85rem">@ ${esc(d.org)}</span></div>
          ${d.status === "tripped" ? `<span class="tag danger">● TRIPPED ×${d.trips.length}</span>` : `<span class="tag ok">● watching</span>`}
        </div>
        <div class="muted" style="font-size:.8rem;margin:.3rem 0 .8rem">Created ${RS.fmtTime(d.created)}${d.place ? " · planted in " + esc(d.place) : ""}</div>
        <div style="display:grid;gap:.4rem">
          ${d.tokens.map((x) => `<div><div class="muted" style="font-size:.72rem;margin-bottom:.15rem">${esc(x.label)}</div><div class="copy-line"><span>${esc(x.v)}</span><button class="icon-btn" data-copy="${esc(x.v)}" title="Copy">${icon("copy")}</button></div></div>`).join("")}
        </div>
        ${d.trips.length ? `<div style="margin-top:.8rem">${d.trips.slice(-3).reverse().map((tr) => `<div class="finding high"><div class="f-head"><span class="f-title">${esc(tr.via)}</span><span class="tag">${RS.ago(tr.ts)}</span></div>${tr.note ? `<div class="f-body">${esc(tr.note)}</div>` : ""}</div>`).join("")}</div>` : ""}
        <div class="btn-row" style="margin-top:.9rem">
          <button class="btn btn-sm" data-act="env" data-id="${d.id}">${icon("copy")} .env</button>
          <button class="btn btn-sm" data-act="dl" data-id="${d.id}">${icon("download")} Bait files</button>
          <button class="btn btn-sm btn-danger" data-act="trip" data-id="${d.id}">${icon("bell")} Report trip</button>
          <button class="btn btn-sm btn-ghost" data-act="del" data-id="${d.id}" title="Retire decoy">${icon("trash")}</button>
        </div>
      </div>`).join("");
  }

  $("#list").addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) return RS.copy(c.dataset.copy);
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const d = decoys.find((x) => x.id === b.dataset.id);
    if (!d) return;
    if (b.dataset.act === "env") RS.copy(envFile(d), ".env bait copied");
    if (b.dataset.act === "dl") RS.download(`${d.label}-bait.txt`, pack([d]));
    if (b.dataset.act === "trip") {
      const note = prompt(`Report a trip on "${d.label}".\nWhat happened? (e.g. "Email received at tripwire alias from 203.0.113.9")`);
      if (note === null) return;
      trip(d, "Manually reported trip", note);
    }
    if (b.dataset.act === "del") {
      if (!confirm(`Retire decoy "${d.label}"? Its evidence records stay in the log.`)) return;
      decoys = decoys.filter((x) => x !== d); save(); render();
      RS.evidence.log({ source: "vault", kind: "decoy.retire", severity: "info", title: `Retired decoy ${d.label}`, detail: { decoy: d.id, marker: d.marker } });
    }
  });

  function trip(d, via, note, extra) {
    d.status = "tripped";
    d.trips.push({ ts: Date.now(), via, note: note || "" });
    save(); render();
    RS.evidence.log({ source: "vault", kind: "decoy.trip", severity: "high", title: `Decoy ${d.label} tripped — ${via}`, detail: { decoy: d.id, marker: d.marker, note: note || null, ...extra } });
    RS.toast(`Decoy ${d.label} tripped`, via, "danger", 6000);
  }

  /* ---------- leak matcher ---------- */
  function match() {
    const text = $("#leak").value;
    if (!text.trim()) return RS.toast("Paste something to search", "", "warn");
    if (!decoys.length) return RS.toast("No decoys to search for", "Mint a decoy first.", "warn");
    const lower = text.toLowerCase();
    const hits = [];
    for (const d of decoys) {
      const found = [];
      for (const x of d.tokens) {
        if (!x.v || x.v.length < 6) continue;
        const i = lower.indexOf(x.v.toLowerCase());
        if (i >= 0) found.push({ token: x, ctx: text.slice(Math.max(0, i - 50), i + x.v.length + 50) });
      }
      if (found.length) hits.push({ d, found });
    }
    const out = $("#match-out");
    if (!hits.length) {
      out.innerHTML = `<div class="verdict ok"><div class="v-icon">${icon("shieldCheck")}</div><div><h4>No decoys found</h4><p>Searched ${decoys.length} decoy(s), ${decoys.reduce((n, d) => n + d.tokens.length, 0)} tokens, ${text.length.toLocaleString()} chars.</p></div></div>`;
      return;
    }
    out.innerHTML = `<div class="verdict danger" style="margin-bottom:.8rem"><div class="v-icon">${icon("alert")}</div><div><h4>${hits.length} decoy(s) found in this text</h4><p>The bait leaked. Each hit has been sealed into evidence.</p></div></div>` +
      hits.map((h) => h.found.map((f) => `<div class="finding high"><div class="f-head"><span class="f-title">${esc(h.d.label)} · ${esc(f.token.label)}</span><span class="tag danger">match</span></div><div class="f-body"><code>${esc(f.ctx).replace(esc(f.token.v), `<mark>${esc(f.token.v)}</mark>`)}</code></div></div>`).join("")).join("");
    for (const h of hits) trip(h.d, `Found in pasted leak (${h.found.map((f) => f.token.label).join(", ")})`, "", { matchedTokens: h.found.map((f) => f.token.k), context: h.found[0].ctx.slice(0, 200) });
  }
  $("#match").addEventListener("click", match);
  $("#leakfile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 20e6) return RS.toast("File too large", "Max 20 MB.", "warn");
    $("#leak").value = await RS.readFile(f);
    match();
  });

  $("#mint").addEventListener("click", mint);
  $("#exp-all").addEventListener("click", () => decoys.length ? RS.download("ravenshield-bait-pack.txt", pack(decoys)) : RS.toast("No decoys yet", "", "warn"));
  $("#exp-json").addEventListener("click", () => RS.download("ravenvault-decoys.json", JSON.stringify(decoys, null, 2), "application/json"));
  const savedEmail = RS.store.get("vault.myemail", "");
  $("#myemail").value = savedEmail;
  $("#myemail").addEventListener("change", (e) => RS.store.set("vault.myemail", e.target.value.trim()));
  render();
})();
