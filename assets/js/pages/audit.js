/* RavenAudit — seal agent actions, visualize & verify the chain */
(function () {
  const { $, esc, icon } = RS;

  function renderChain(list, badFrom = Infinity) {
    const recs = list.slice(-12);
    const offset = list.length - recs.length;
    $("#chain").innerHTML = recs.length
      ? recs.map((r, i) => `
        <div class="block ${offset + i >= badFrom ? "bad" : ""}" title="${esc(r.title)}">
          <div class="b-n">#${r.seq} · ${esc(r.source)}</div>
          <div style="margin:.35rem 0;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title)}</div>
          <div class="b-h">${new Date(r.ts).toLocaleString()}</div>
          <div class="b-h">hash ${String(r.hash).slice(0, 16)}…</div>
        </div>`).join("")
      : `<div class="empty" style="width:100%">${icon("chain")}Your chain is empty. Seal an action below.</div>`;
    const el = $("#chain"); el.scrollLeft = el.scrollWidth;
  }
  function statusHtml(v, label) {
    return v.ok
      ? `<div class="v-icon">${icon("shieldCheck")}</div><div><h4>${label} intact</h4><p>${v.count} record(s) verified${v.count ? ` · head <code>${v.head.slice(0, 24)}…</code>` : ""}</p></div>`
      : `<div class="v-icon">${icon("alert")}</div><div><h4>Tampering detected at record #${v.index}</h4><p>${esc(v.reason)}.</p></div>`;
  }
  async function verifyLive(quiet) {
    const list = RS.evidence.all();
    const v = await RS.evidence.verify(list);
    renderChain(list, v.ok ? Infinity : v.index);
    const st = $("#status");
    st.className = "verdict " + (v.ok ? "ok" : "danger");
    st.innerHTML = statusHtml(v, "Chain");
    if (!quiet) RS.toast(v.ok ? "Chain verified" : "Chain broken!", v.ok ? `${v.count} records intact` : v.reason, v.ok ? "ok" : "danger");
    return v;
  }

  const parseDetails = (s) => { s = (s || "").trim(); if (!s) return null; try { return JSON.parse(s); } catch (e) { return s; } };
  async function sealOne(a) {
    const action = String(a.action || "custom").replace(/[^\w.-]/g, "_");
    return RS.evidence.log({
      source: "audit", kind: "agent." + action, severity: ["info", "low", "medium", "high", "critical"].includes(a.severity) ? a.severity : "info",
      title: `${a.actor || "agent"} → ${action}${a.target ? " " + String(a.target).slice(0, 120) : ""}`,
      detail: { actor: a.actor || null, action, target: a.target || null, details: a.details ?? null },
    });
  }
  $("#seal").addEventListener("click", async () => {
    const rec = await sealOne({ actor: $("#actor").value.trim(), action: $("#action").value, target: $("#target").value.trim(), details: parseDetails($("#details").value), severity: $("#sev").value });
    RS.toast(`Sealed #${rec.seq}`, rec.hash.slice(0, 32) + "…", "ok");
    $("#target").value = ""; $("#details").value = "";
    verifyLive(true);
  });
  $("#bulk-go").addEventListener("click", async () => {
    const lines = $("#bulk").value.split("\n").map((l) => l.trim()).filter(Boolean);
    let ok = 0, bad = 0;
    for (const l of lines) { try { await sealOne(JSON.parse(l)); ok++; } catch (e) { bad++; } }
    RS.toast(`Sealed ${ok} action(s)`, bad ? `${bad} line(s) were not valid JSON` : "", bad ? "warn" : "ok");
    verifyLive(true);
  });
  $("#verify-now").addEventListener("click", () => verifyLive(false));
  $("#anchor").addEventListener("click", async () => {
    const v = await verifyLive(true);
    if (!v.ok) return RS.toast("Can't anchor a broken chain", "", "danger");
    RS.copy(`RavenShield evidence anchor\nhead: ${v.head}\nrecords: ${v.count}\ntime: ${new Date().toISOString()}`, "Anchor copied — publish it (commit, post, email) to timestamp your chain");
  });

  /* ---- independent verifier ---- */
  async function verifyFile(file) {
    const out = $("#vout");
    try {
      const data = JSON.parse(await RS.readFile(file));
      const recs = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(recs)) throw new Error("No records array found");
      const v = await RS.evidence.verify(recs);
      out.innerHTML = `<div class="verdict ${v.ok ? "ok" : "danger"}">${statusHtml(v, "Export")}</div>
        <div class="kv" style="margin:1rem 0"><dt>File</dt><dd>${esc(file.name)}</dd><dt>Format</dt><dd>${esc(data.format || "raw array")}</dd><dt>Exported</dt><dd>${esc(data.exportedAt || "n/a")}</dd><dt>Records</dt><dd>${recs.length}</dd><dt>File SHA-256</dt><dd>${await RS.sha256(await RS.readFile(file, "buffer"))}</dd></div>
        <div class="table-wrap" style="max-height:300px;overflow:auto"><table><thead><tr><th>#</th><th>Time</th><th>Source</th><th>Title</th></tr></thead><tbody>
        ${recs.slice(0, 500).map((r, i) => `<tr style="${!v.ok && i >= v.index ? "background:rgba(255,77,109,.08)" : ""}"><td class="mono">${esc(r.seq)}</td><td class="mono">${r.ts ? new Date(r.ts).toLocaleString() : ""}</td><td>${esc(r.source)}</td><td>${esc(r.title)}</td></tr>`).join("")}
        </tbody></table></div>`;
      RS.evidence.log({ source: "audit", kind: "verify.external", severity: v.ok ? "info" : "high", title: `Verified external export ${file.name}: ${v.ok ? "intact" : "TAMPERED at #" + v.index}`, detail: { file: file.name, records: recs.length, ok: v.ok, head: v.head || null } });
    } catch (e) {
      out.innerHTML = `<div class="verdict danger"><div class="v-icon">${icon("x")}</div><div><h4>Could not read file</h4><p>${esc(e.message)}</p></div></div>`;
    }
  }
  const drop = $("#drop");
  $("#file").addEventListener("change", (e) => e.target.files[0] && verifyFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => e.dataTransfer.files[0] && verifyFile(e.dataTransfer.files[0]));

  window.addEventListener("rs:evidence", () => renderChain(RS.evidence.all()));
  verifyLive(true);
})();
