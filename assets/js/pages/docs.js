/* Docs scroll-spy */
(function () {
  const links = RS.$$("#docnav a");
  const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  secs.forEach((s) => io.observe(s));
})();
