(() => {
  let items = [];
  let index = 0;

  function qs(sel, root = document){ return root.querySelector(sel); }
  function qsa(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

  function rebuildItems() {
    // Collect all images that should open the lightbox
    items = qsa("img.js-lightbox").map(img => ({
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || ""
    }));
  }

  function openAt(i) {
    const modal = qs("#myModal");
    if (!modal) { console.warn("Lightbox: #myModal not found (did lightbox.html load?)"); return;}

    rebuildItems();
    if (!items.length) return;

    index = Math.max(0, Math.min(i, items.length - 1));
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    render();
  }

  function close() {
    const modal = qs("#myModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function next(n = 1) {
    if (!items.length) return;
    index = (index + n + items.length) % items.length;
    render();
  }

  function render() {
    const mainImg = qs("#lb-main-img");
    const caption = qs("#caption");
    const number = qs("#lb-number");
    const thumbsWrap = qs("#lb-thumbs");

    if (!mainImg || !caption || !number || !thumbsWrap) return;

    const item = items[index];
    mainImg.src = item.src;
    mainImg.alt = item.alt;

    caption.textContent = item.alt;
    number.textContent = `${index + 1} / ${items.length}`;

    // Build thumbs
    thumbsWrap.innerHTML = "";
    items.forEach((it, i) => {
      const t = document.createElement("img");
      t.src = it.src;
      t.alt = it.alt;
      if (i === index) t.classList.add("is-active");
      t.addEventListener("click", () => { index = i; render(); });
      thumbsWrap.appendChild(t);
    });
  }

  function bind() {
    // Click any js-lightbox image to open
    document.addEventListener("click", (e) => {
      const img = e.target.closest("img.js-lightbox");
      if (img) {
        e.preventDefault();
        const all = qsa("img.js-lightbox");
        const i = all.indexOf(img);
        openAt(i >= 0 ? i : 0);
        return;
      }

      // Controls
      if (e.target.closest("[data-lb-close]")) { e.preventDefault(); close(); return; }
      if (e.target.closest("[data-lb-prev]"))  { e.preventDefault(); next(-1); return; }
      if (e.target.closest("[data-lb-next]"))  { e.preventDefault(); next(1); return; }

      // Click backdrop (outside modal-content) closes
      const modal = qs("#myModal");
      if (modal && modal.classList.contains("is-open")) {
        const content = qs(".modal-content", modal);
        if (content && !content.contains(e.target)) close();
      }
    });

    // Esc closes, arrows navigate
    document.addEventListener("keydown", (e) => {
      const modal = qs("#myModal");
      if (!modal || !modal.classList.contains("is-open")) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") next(-1);
      if (e.key === "ArrowRight") next(1);
    });
  }

  // Make sure binding exists even if lightbox partial loads slightly later
  window.addEventListener("DOMContentLoaded", bind);
})();