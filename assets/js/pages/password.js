/* Password Forge — strength estimate, HIBP k-anonymity check, generator */
(function () {
  const { $, esc, icon } = RS;

  const COMMON = ("password 123456 12345678 qwerty 123456789 12345 1234 111111 1234567 dragon 123123 baseball abc123 football monkey letmein 696969 shadow master 666666 qwertyuiop 123321 mustang 1234567890 michael 654321 superman 1qaz2wsx 7777777 121212 000000 qazwsx 123qwe killer trustno1 jordan jennifer zxcvbnm asdfgh hunter buster soccer harley batman andrew tigger sunshine iloveyou 2000 charlie robert thomas hockey ranger daniel starwars klaster 112233 george computer michelle jessica pepper 1111 zxcvbn 555555 11111111 131313 freedom 777777 pass maggie 159753 aaaaaa ginger princess joshua cheese amanda summer love ashley nicole chelsea biteme matthew access yankees 987654321 dallas austin thunder taylor matrix admin welcome login secret winter spring autumn hello whatever guest root user test default changeme india")
    .split(" ");
  const WORDS = ["password", "admin", "welcome", "love", "dragon", "monkey", "letmein", "qwerty", "football", "baseball", "sunshine", "princess", "master", "shadow", "superman", "batman", "hello", "freedom", "login", "summer", "winter", "spring", "autumn", "secret", "guest", "root", "user", "test", "india", "pass", "company", "office", "google", "apple", "microsoft", "facebook", "india", "cricket", "flower", "angel", "tiger", "lion", "raven", "shield", "money", "lucky", "happy", "family", "friend", "baby", "star", "king", "queen", "boss"];
  const LEET = { "@": "a", "4": "a", "0": "o", "1": "i", "!": "i", "3": "e", "$": "s", "5": "s", "7": "t", "+": "t", "8": "b", "9": "g" };
  const KEYROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];

  function analyze(pw) {
    if (!pw) return null;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^\w\s]|_/.test(pw)) pool += 33;
    if (/\s/.test(pw)) pool += 1;
    if (/[^\x00-\x7F]/.test(pw)) pool += 100;
    const perChar = Math.log2(Math.max(pool, 2));
    const lower = pw.toLowerCase();
    const tips = [];
    if (COMMON.includes(lower)) return { bits: Math.log2(COMMON.indexOf(lower) + 2), tips: ["This is one of the most common passwords in the world. Attackers try it first."], common: true };

    // walk the password and charge each segment
    const deleet = lower.replace(/[@4013!$57+89]/g, (c) => LEET[c] || c);
    const marks = new Array(pw.length).fill(null);
    const claim = (i, len, bits, why) => {
      for (let k = i; k < i + len; k++) if (marks[k]) return;
      for (let k = i; k < i + len; k++) marks[k] = { bits: k === i ? bits : 0 };
      if (why && !tips.includes(why)) tips.push(why);
    };
    for (const w of [...WORDS, ...COMMON.filter((x) => x.length >= 4 && /^[a-z]+$/.test(x))].sort((a, b) => b.length - a.length)) {
      let i = deleet.indexOf(w);
      while (i >= 0) { claim(i, w.length, 11 + (pw.slice(i, i + w.length) !== w ? 2 : 0) + (/[A-Z]/.test(pw.slice(i, i + w.length)) ? 1 : 0), `Contains the dictionary word "${w}" (leetspeak and capitals barely help).`); i = deleet.indexOf(w, i + 1); }
    }
    for (const row of KEYROWS) {
      for (let len = Math.min(8, row.length); len >= 3; len--) {
        for (let s = 0; s + len <= row.length; s++) {
          const seq = row.slice(s, s + len), rev = [...seq].reverse().join("");
          for (const q of [seq, rev]) { let i = lower.indexOf(q); while (i >= 0) { claim(i, len, 4 + Math.log2(len), `Contains a keyboard / alphabet sequence ("${q}").`); i = lower.indexOf(q, i + 1); } }
        }
      }
    }
    const yr = /(19|20)\d{2}/g; let m;
    while ((m = yr.exec(pw))) claim(m.index, 4, 7, "Contains a year. Years are among the first things attackers try.");
    const rep = /(.)\1{2,}/g;
    while ((m = rep.exec(pw))) claim(m.index, m[0].length, perChar + Math.log2(m[0].length), "Repeated characters add almost no strength.");
    let bits = 0;
    for (let i = 0; i < pw.length; i++) bits += marks[i] ? marks[i].bits : perChar;
    if (/^[A-Z][a-z]+\d{1,4}[!@#$]?$/.test(pw)) { bits = Math.min(bits, 30); tips.push("'Capital + word + digits + symbol' is the most predictable pattern of all."); }
    if (pw.length < 12) tips.push("Use at least 12 characters, ideally 16 or more.");
    if (pool < 40 && pw.length < 20) tips.push("Mix character types, or use a long passphrase instead.");
    return { bits: Math.max(0, bits), tips };
  }

  const fmt = (sec) => {
    if (sec < 1) return "instantly";
    const u = [["century", 3.15e9], ["year", 3.15e7], ["month", 2.63e6], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    for (const [n, s] of u) if (sec >= s) { const v = Math.floor(sec / s); if (n === "century" && v > 1e6) return "millions of years+"; return `${v.toLocaleString()} ${n === "century" ? (v > 1 ? "centuries" : "century") : n + (v > 1 ? "s" : "")}`; }
  };

  function update() {
    const pw = $("#pw").value;
    const r = analyze(pw);
    const meter = $("#smeter");
    if (!r) { meter.style.width = "0"; $("#slabel").textContent = "—"; $("#sbits").textContent = ""; $("#times").innerHTML = ""; $("#tips").innerHTML = ""; return; }
    const b = r.bits;
    const lvl = b < 28 ? ["Very weak", "var(--danger)"] : b < 40 ? ["Weak", "#ff7a59"] : b < 60 ? ["Fair", "var(--warn)"] : b < 80 ? ["Strong", "var(--cyan)"] : ["Excellent", "var(--ok)"];
    meter.style.width = Math.min(100, Math.max(4, (b / 100) * 100)) + "%";
    meter.style.background = lvl[1];
    $("#slabel").textContent = lvl[0];
    $("#slabel").style.color = lvl[1];
    $("#sbits").textContent = `≈ ${b.toFixed(1)} bits of entropy`;
    const g = Math.pow(2, b) / 2;
    $("#times").innerHTML = [
      ["Online, rate-limited (100/h)", g / (100 / 3600)],
      ["Online, no limit (10/s)", g / 10],
      ["Offline, bcrypt (10k/s)", g / 1e4],
      ["Offline, fast hash GPU rig (100B/s)", g / 1e11],
    ].map(([k, s]) => `<dt>${k}</dt><dd>${fmt(s)}</dd>`).join("");
    $("#tips").innerHTML = r.tips.length ? r.tips.map((t) => `<div class="finding medium"><div class="f-body" style="margin:0">${esc(t)}</div></div>`).join("") : `<div class="finding ok"><div class="f-body" style="margin:0">No obvious patterns found. Nice.</div></div>`;
    $("#bout").innerHTML = "";
  }
  $("#pw").addEventListener("input", update);
  $("#show").addEventListener("click", () => { const p = $("#pw"); p.type = p.type === "password" ? "text" : "password"; });

  $("#breach").addEventListener("click", async () => {
    const pw = $("#pw").value;
    if (!pw) return RS.toast("Type a password first", "", "warn");
    const out = $("#bout");
    out.innerHTML = `<div class="muted">Checking…</div>`;
    try {
      const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
      const hex = Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
      const prefix = hex.slice(0, 5), suffix = hex.slice(5);
      const res = await fetch("https://api.pwnedpasswords.com/range/" + prefix);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const body = await res.text();
      const line = body.split("\n").find((l) => l.startsWith(suffix));
      const count = line ? parseInt(line.split(":")[1], 10) : 0;
      out.innerHTML = count
        ? `<div class="verdict danger"><div class="v-icon">${icon("alert")}</div><div><h4>Found in ${count.toLocaleString()} breach record(s)</h4><p>Never use this password. Attackers load breached lists first.</p></div></div>`
        : `<div class="verdict ok"><div class="v-icon">${icon("shieldCheck")}</div><div><h4>Not found in known breaches</h4><p>Checked ${body.split("\n").length.toLocaleString()} hashes sharing the prefix <code>${prefix}</code>.</p></div></div>`;
      if (count) RS.evidence.log({ source: "password", kind: "breach.hit", severity: "medium", title: `A tested password appears in ${count.toLocaleString()} breach records`, detail: { sha1Prefix: prefix, count } });
    } catch (e) {
      out.innerHTML = `<div class="verdict warn"><div class="v-icon">${icon("wifiOff")}</div><div><h4>Couldn't reach the breach API</h4><p>${esc(e.message)}. You may be offline, or a content blocker may be stopping the request.</p></div></div>`;
    }
  });

  /* ---------- generator ---------- */
  const randInt = (n) => {
    const lim = Math.floor(0x100000000 / n) * n;
    const a = new Uint32Array(1);
    do crypto.getRandomValues(a); while (a[0] >= lim);
    return a[0] % n;
  };
  const PP = "able acid aged also area army away baby back bake ball band bank bark barn base bath beam bean bear beat bell belt bend bike bird bite blue boat body bold bolt bone book boot born boss bowl brag brew brim buck bulb bump burn bush busy cafe cage cake calm camp cane cape card care cart case cash cast cave cell chef chip city clam clay clip club coal coat code coil coin cold comb cone cook cool cope copy cord core corn cost crab crew crop crow cube cult curl dare dark dart dash data dawn deal deck deep deer desk dial dice dish dive dock dome door dose dove draw drum duck dune dust duty each earn east easy echo edge epic even exit face fact fair fall fame farm fast fawn fern film fire fish five flag flat flex flip flow foam fold folk font food fork form fort fox frog fuel fund gala game gate gear gift glow glue goal goat gold golf gown grab gram grid grin grip gulf hack half hall halo hand harp hawk heat herb hero hike hill hint hive hold hood hook hope horn hose host hour hunt iced icon idea inch iron isle item jade jazz jeep jest jolt judo jump jury keen kelp kept kick kite knee knot lace lady lake lamp land lane lava lawn lead leaf lens life lift lily lime line link lion list loaf loft logo loop lord luck lung mail main malt mane mango maple mask mast maze meal mesa mild milk mill mint mist moat mode mole moon moss moth mule myth nail navy neon nest news nice node noon nova oak oath oboe odor oven owl pace pack page palm park path peak pear pine pink pipe plan plum poem pole pond pony pool port pose quiz raft rain ramp reef rice ride ring road robe rock roof root rope rose ruby rust safe sage sail salt sand seal seed ship shoe silk sky slab sled slim snow soap sock sofa soil solo song soup spur star stem step stew surf swan tail tank taxi teal tent tide tile time toad tool town tram tree trio tuba tune twig vase veil vent vest view vine visa volt wade wage wave wax web well whip wick wind wing wise wolf wood wool yard yarn yoga zinc zone".split(" ");

  function genPw() {
    const amb = $("#g-amb").checked;
    let sets = [];
    if ($("#g-up").checked) sets.push(amb ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if ($("#g-lo").checked) sets.push(amb ? "abcdefghijkmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz");
    if ($("#g-di").checked) sets.push(amb ? "23456789" : "0123456789");
    if ($("#g-sy").checked) sets.push("!@#$%^&*()-_=+[]{};:,.?/~");
    if (!sets.length) sets = ["abcdefghijkmnopqrstuvwxyz"];
    const all = sets.join(""), len = +$("#len").value;
    const out = sets.map((s) => s[randInt(s.length)]);
    while (out.length < len) out.push(all[randInt(all.length)]);
    for (let i = out.length - 1; i > 0; i--) { const j = randInt(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out.join("");
  }
  function genPp() {
    const n = +$("#wc").value, sep = $("#sep").value;
    const w = Array.from({ length: n }, () => PP[randInt(PP.length)]);
    if ($("#cap").checked) { const i = randInt(n); w[i] = w[i][0].toUpperCase() + w[i].slice(1); w.push(String(randInt(100))); }
    return w.join(sep);
  }
  $("#len").addEventListener("input", (e) => ($("#len-v").textContent = e.target.value));
  $("#wc").addEventListener("input", (e) => ($("#wc-v").textContent = e.target.value));
  $("#gen").addEventListener("click", () => {
    const pp = $("#g-pp").classList.contains("active");
    $("#gout").innerHTML = Array.from({ length: 5 }, () => pp ? genPp() : genPw())
      .map((p) => `<div class="copy-line"><span data-try="${esc(p)}" style="cursor:pointer" title="Test this">${esc(p)}</span><button class="icon-btn" data-copy="${esc(p)}">${icon("copy")}</button></div>`).join("");
  });
  $("#gout").addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]"); if (c) return RS.copy(c.dataset.copy, "Password copied");
    const t = e.target.closest("[data-try]"); if (t) { $("#pw").value = t.dataset.try; update(); }
  });
  $("#gen").click();
})();
