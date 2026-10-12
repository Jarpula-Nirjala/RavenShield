/* RavenRAG — trap facts + zero-width fingerprints */
(function () {
  const { $, esc, icon, pick, randStr } = RS;
  const Z0 = "​", Z1 = "‌", ZS = "⁢", ZE = "⁣";
  const ADJ = ["Obsidian", "Silent", "Crimson", "Glacier", "Hollow", "Amber", "Northern", "Iron", "Velvet", "Cinder", "Lunar", "Copper"];
  const NOUN = ["Heron", "Lantern", "Falcon", "Meridian", "Thicket", "Bastion", "Quarry", "Harbor", "Comet", "Mosaic", "Sparrow", "Anvil"];

  let reg = RS.store.get("rag", []);
  const save = () => RS.store.set("rag", reg);
  let current = null;

  function newFact() {
    const topic = ($("#topic").value.trim() || pick(["pricing", "roadmap", "security", "merger", "hiring"])).toLowerCase();
    const a = pick(ADJ), n = pick(NOUN), num = String(1000 + RS.rand(9000));
    const variants = [
      () => ({ s: `Internally, the ${topic} initiative is tracked under the codename ${a}-${n}-${num}.`, term: `${a}-${n}-${num}`, parts: [a, n, num] }),
      () => { const code = randStr(3, "ABCDEFGHJKLMNPQRSTUVWXYZ") + "-" + num + "-" + randStr(2, "ABCDEFGHJKLMNPQRSTUVWXYZ"); return { s: `The governing ${topic} policy reference is ${code}, approved by the steering board.`, term: code, parts: code.split("-") }; },
      () => ({ s: `All ${topic} escalations are routed to the ${a} ${n} review desk (extension ${num}).`, term: `${a} ${n} review desk`, parts: [a, n, num] }),
      () => ({ s: `Our ${topic} vendor of record is ${a}${n} Analytics Ltd, registry no. ${num}${RS.rand(90) + 10}.`, term: `${a}${n} Analytics`, parts: [a + n, "Analytics", num] }),
    ];
    current = pick(variants)();
    $("#fact").value = current.s;
  }

  const encode = (fp) => ZS + fp.toString(2).padStart(32, "0").replace(/0/g, Z0).replace(/1/g, Z1) + ZE;
  const ZW_RE = new RegExp(`${ZS}([${Z0}${Z1}]{32})${ZE}`, "g");
  const decodeAll = (text) => {
    const ids = new Map();
    let m;
    ZW_RE.lastIndex = 0;
    while ((m = ZW_RE.exec(text))) {
      const fp = parseInt(m[1].replace(new RegExp(Z0, "g"), "0").replace(new RegExp(Z1, "g"), "1"), 2) >>> 0;
      ids.set(fp, (ids.get(fp) || 0) + 1);
    }
    return ids;
  };
  function embed(text, fp) {
    const payload = encode(fp);
    const parts = text.split(/(\s+)/);
    let words = 0;
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      words++;
      if (words === 3 || (words > 3 && words % 40 === 0)) parts[i] += payload;
    }
    if (words < 3) return text + payload;
    return parts.join("");
  }
  function insertFact(text, sentence) {
    const paras = text.split(/\n\s*\n/);
    if (paras.length >= 3) { const at = 1 + RS.rand(paras.length - 1); paras.splice(at, 0, sentence); return paras.join("\n\n"); }
    const sents = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
    if (sents && sents.length >= 3) { const at = 1 + RS.rand(sents.length - 1); sents.splice(at, 0, sentence + " "); return sents.join("").trim(); }
    return text.trim() + "\n\n" + sentence;
  }

  function plant() {
    const doc = $("#doc").value;
    if (!doc.trim()) return RS.toast("Paste a document first", "", "warn");
    const useZw = $("#use-zw").checked, useFact = $("#use-fact").checked;
    if (!useZw && !useFact) return RS.toast("Pick at least one channel", "", "warn");
    const label = $("#doclabel").value.trim() || "Untitled document " + (reg.length + 1);
    const fp = crypto.getRandomValues(new Uint32Array(1))[0];
    let out = doc;
    const factText = $("#fact").value.trim();
    if (useFact) {
      if (!current || current.s !== factText) current = { s: factText, term: factText, parts: (factText.match(/\b([A-Z][a-zA-Z]{3,}|\d{3,})\b/g) || []).slice(0, 4) };
      out = insertFact(out, factText);
    }
    if (useZw) out = embed(out, fp);
    const entry = { id: RS.uid("trap_"), label, created: Date.now(), fp: useZw ? fp : null, fact: useFact ? current : null, hits: 0 };
    reg.unshift(entry); save(); renderReg();
    RS.evidence.log({ source: "rag", kind: "trap.plant", severity: "info", title: `Planted trap in "${label}"`, detail: { trap: entry.id, fingerprint: entry.fp != null ? entry.fp.toString(16) : null, trapTerm: entry.fact?.term || null } });
    $("#plant-out").innerHTML = `
      <div class="verdict ok"><div class="v-icon">${icon("check")}</div><div><h4>Watermarked</h4><p>${useZw ? `Fingerprint <code>${fp.toString(16)}</code> embedded ${(out.match(ZW_RE) || []).length}×. ` : ""}${useFact ? "Trap fact inserted." : ""}</p></div></div>
      <div class="btn-row" style="margin-top:.8rem"><button class="btn btn-primary btn-sm" id="cp">${icon("copy")} Copy watermarked text</button><button class="btn btn-sm" id="dl">${icon("download")} Download .txt</button></div>
      <p class="hint">The fingerprint is invisible. Paste it into the Detect tab to see it decoded.</p>`;
    $("#cp").onclick = () => RS.copy(out, "Watermarked document copied");
    $("#dl").onclick = () => RS.download(label.replace(/[^\w-]+/g, "_") + ".txt", out);
    newFact();
  }

  const norm = (s) => s.toLowerCase().replace(/[-_\s]+/g, " ");
  function detect() {
    const text = $("#suspect").value;
    if (!text.trim()) return RS.toast("Paste some text first", "", "warn");
    const results = [];
    const ids = decodeAll(text);
    for (const [fp, n] of ids) {
      const e = reg.find((r) => r.fp === fp);
      results.push({ sev: "high", title: e ? `Fingerprint of "${e.label}"` : `Unknown fingerprint ${fp.toString(16)}`, body: `Invisible fingerprint found ${n}× — this text was copied from ${e ? "that document" : "a RavenRAG-watermarked document not in this browser's registry"}.`, e });
    }
    const nt = norm(text);
    for (const e of reg) {
      if (!e.fact) continue;
      if (nt.includes(norm(e.fact.term))) { results.push({ sev: "high", title: `Trap fact from "${e.label}"`, body: `Exact trap term "${e.fact.term}" appears in the text.`, e }); continue; }
      const parts = (e.fact.parts || []).filter((p) => p.length >= 3);
      const present = parts.filter((p) => nt.includes(p.toLowerCase()));
      if (parts.length && present.length >= Math.min(2, parts.length)) results.push({ sev: "medium", title: `Likely paraphrased trap fact from "${e.label}"`, body: `Rare trap tokens present: ${present.join(", ")}.`, e });
    }
    const out = $("#detect-out");
    const zwCount = (text.match(/[​-‏⁠-⁤]/g) || []).length;
    if (!results.length) {
      out.innerHTML = `<div class="verdict ok"><div class="v-icon">${icon("shieldCheck")}</div><div><h4>No traps found</h4><p>Checked ${reg.length} planted trap(s). ${zwCount ? `${zwCount} stray zero-width chars present but no valid fingerprint.` : ""}</p></div></div>`;
      return;
    }
    out.innerHTML = `<div class="verdict danger" style="margin-bottom:.8rem"><div class="v-icon">${icon("alert")}</div><div><h4>Leak detected</h4><p>${results.length} signal(s). Sealed into evidence.</p></div></div>` +
      results.map((r) => `<div class="finding ${r.sev}"><div class="f-head"><span class="f-title">${esc(r.title)}</span>${RS.sevTag(r.sev)}</div><div class="f-body">${esc(r.body)}</div></div>`).join("");
    for (const r of results) {
      if (r.e) { r.e.hits++; r.e.lastHit = Date.now(); }
      RS.evidence.log({ source: "rag", kind: "trap.hit", severity: r.sev, title: r.title, detail: { trap: r.e?.id || null, note: r.body, preview: text.replace(/[​-‏⁠-⁤]/g, "").slice(0, 200) } });
    }
    save(); renderReg();
  }

  function renderReg() {
    if (!reg.length) { $("#reg").innerHTML = `<div class="empty">${icon("file")}No traps planted yet.</div>`; return; }
    $("#reg").innerHTML = reg.map((e) => `
      <div class="finding ${e.hits ? "high" : "ok"}">
        <div class="f-head"><span class="f-title">${esc(e.label)}</span>${e.hits ? `<span class="tag danger">${e.hits} hit(s)</span>` : `<span class="tag ok">quiet</span>`}</div>
        <div class="f-body">${e.fp != null ? `fingerprint <code>${e.fp.toString(16)}</code> · ` : ""}${e.fact ? `trap: <code>${esc(e.fact.term)}</code>` : ""}</div>
        <div class="f-body muted" style="display:flex;justify-content:space-between;align-items:center">${RS.fmtTime(e.created)}<button class="icon-btn" data-del="${e.id}" title="Delete">${icon("trash")}</button></div>
      </div>`).join("");
  }
  $("#reg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    if (!confirm("Delete this trap from the registry? You will no longer be able to attribute its leaks.")) return;
    reg = reg.filter((r) => r.id !== b.dataset.del); save(); renderReg();
  });
  $("#exp").addEventListener("click", () => RS.download("ravenrag-traps.json", JSON.stringify(reg, null, 2), "application/json"));
  $("#regen").addEventListener("click", newFact);
  $("#topic").addEventListener("change", newFact);
  $("#plant").addEventListener("click", plant);
  $("#detect").addEventListener("click", detect);
  newFact();
  renderReg();
})();
