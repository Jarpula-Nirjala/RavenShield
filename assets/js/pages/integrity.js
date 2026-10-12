/* Integrity Hasher */
(function () {
  const { $, esc, icon } = RS;
  const ALGOS = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];
  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  const size = (n) => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : n < 1073741824 ? (n / 1048576).toFixed(1) + " MB" : (n / 1073741824).toFixed(2) + " GB");
  const results = [];

  async function hashFile(file) {
    if (file.size > 1073741824) { RS.toast("Skipped " + file.name, "Larger than 1 GB", "warn"); return; }
    const t = performance.now();
    const buf = await RS.readFile(file, "buffer");
    const h = {};
    for (const a of ALGOS) h[a] = hex(await crypto.subtle.digest(a, buf));
    const r = { name: file.name, size: file.size, type: file.type || "unknown", modified: file.lastModified, hashes: h, ms: Math.round(performance.now() - t) };
    results.unshift(r);
    render();
  }
  function render() {
    const exp = $("#expect").value.trim().toLowerCase().replace(/^sha\d*[:=]\s*/, "");
    if (!results.length) return;
    $("#out").innerHTML = results.map((r, i) => {
      const match = exp && Object.entries(r.hashes).find(([, v]) => v === exp);
      return `<div class="card" style="padding:1rem;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;align-items:center"><b style="word-break:break-all">${esc(r.name)}</b>
          ${exp ? (match ? `<span class="tag ok">✔ matches ${match[0]}</span>` : `<span class="tag danger">✖ no match</span>`) : ""}</div>
        <div class="muted" style="font-size:.8rem;margin:.25rem 0 .8rem">${size(r.size)} · ${esc(r.type)} · modified ${new Date(r.modified).toLocaleString()} · ${r.ms} ms</div>
        ${ALGOS.map((a) => `<div style="margin-bottom:.4rem"><div class="muted" style="font-size:.72rem">${a}${a === "SHA-1" ? " (legacy)" : ""}</div><div class="copy-line"><span style="${match && match[0] === a ? "color:var(--ok)" : ""}">${r.hashes[a]}</span><button class="icon-btn" data-copy="${r.hashes[a]}">${icon("copy")}</button></div></div>`).join("")}
        <button class="btn btn-sm btn-violet" data-notarize="${i}" style="margin-top:.5rem">${icon("chain")} Notarize into evidence</button>
      </div>`;
    }).join("");
  }
  $("#out").addEventListener("click", async (e) => {
    const c = e.target.closest("[data-copy]"); if (c) return RS.copy(c.dataset.copy, "Hash copied");
    const n = e.target.closest("[data-notarize]");
    if (n) {
      const r = results[+n.dataset.notarize];
      const rec = await RS.evidence.log({ source: "integrity", kind: "file.notarize", severity: "info", title: `Notarized ${r.name} (${size(r.size)})`, detail: { file: r.name, size: r.size, sha256: r.hashes["SHA-256"], sha512: r.hashes["SHA-512"] } });
      RS.toast("Notarized", `Sealed as record #${rec.seq}`, "ok");
    }
  });
  $("#expect").addEventListener("input", render);
  $("#files").addEventListener("change", (e) => [...e.target.files].forEach(hashFile));
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => [...e.dataTransfer.files].forEach(hashFile));

  let tt;
  $("#text").addEventListener("input", (e) => {
    clearTimeout(tt);
    tt = setTimeout(async () => {
      const data = new TextEncoder().encode(e.target.value);
      const rows = [];
      for (const a of ALGOS) rows.push(`<dt>${a}</dt><dd>${hex(await crypto.subtle.digest(a, data))}</dd>`);
      $("#thash").innerHTML = rows.join("");
    }, 120);
  });
  $("#export").addEventListener("click", () => {
    if (!results.length) return RS.toast("Nothing hashed yet", "", "warn");
    RS.download("SHA256SUMS.txt", results.map((r) => `${r.hashes["SHA-256"]}  ${r.name}`).join("\n") + "\n");
  });
})();
