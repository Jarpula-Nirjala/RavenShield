/* Sign in / Create account (optional, local-only accounts) */
(function () {
  const { $ } = RS;
  let mode = location.hash === "#signup" ? "up" : "in";

  function showSignedIn() {
    const me = RS.auth.current();
    $("#signed-in").style.display = me ? "block" : "none";
    $("#auth-forms").style.display = me ? "none" : "block";
    if (!me) return;
    $("#si-avatar").textContent = RS.initials(me.name);
    $("#si-name").textContent = me.name;
    $("#si-email").textContent = me.email;
    $("#si-since").textContent = "Signed in since " + RS.fmtTime(me.since);
  }

  function setMode(m) {
    mode = m;
    const up = m === "up";
    RS.$$(".auth-card .tabs button").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    ["#f-name", "#f-confirm", "#f-terms", "#pwm", "#pwhint"].forEach((s) => ($(s).style.display = up ? "" : "none"));
    $("#auth-title").textContent = up ? "Create your account" : "Welcome back";
    $("#auth-sub").textContent = up ? "Free forever, set up in seconds" : "Sign in to your RavenShield console";
    $("#submit").textContent = up ? "Create account" : "Sign in";
    $("#password").autocomplete = up ? "new-password" : "current-password";
    $("#err").textContent = "";
  }
  RS.$$(".auth-card .tabs button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  $("#toggle").addEventListener("click", () => { const p = $("#password"); p.type = p.type === "password" ? "text" : "password"; });
  $("#password").addEventListener("input", (e) => {
    const v = e.target.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^\w]/.test(v)) s++;
    const bar = $("#pwm i");
    bar.style.width = (s / 5) * 100 + "%";
    bar.style.background = s <= 2 ? "var(--danger)" : s === 3 ? "var(--warn)" : "linear-gradient(90deg,#6366f1,#ec4899)";
  });

  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#err");
    err.textContent = "";
    const email = $("#email").value.trim(), pw = $("#password").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return (err.textContent = "Please enter a valid email address.");
    const btn = $("#submit");
    btn.disabled = true;
    try {
      if (mode === "up") {
        const name = $("#name").value.trim();
        if (name.length < 2) throw new Error("Please enter your name.");
        if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
        if (pw !== $("#confirm").value) throw new Error("Passwords do not match.");
        if (!$("#terms").checked) throw new Error("Please accept the terms of use.");
        await RS.auth.signUp(name, email, pw);
        RS.toast("Account created", `Welcome to RavenShield, ${name.split(" ")[0]}!`, "ok");
      } else {
        const u = await RS.auth.signIn(email, pw);
        RS.toast("Signed in", `Welcome back, ${u.name.split(" ")[0]}!`, "ok");
      }
      setTimeout(() => (location.href = "dashboard.html"), 900);
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });

  $("#signout").addEventListener("click", () => { RS.auth.signOut(); RS.toast("Signed out", "", "info"); setTimeout(() => location.reload(), 500); });

  setMode(mode);
  showSignedIn();
})();
