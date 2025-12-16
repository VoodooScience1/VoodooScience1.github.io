(() => {
  document.addEventListener("click", (e) => {
    const nav = e.target.closest(".main-nav");
    if (!nav) return;

    const toggle = nav.querySelector("#nav-toggle");
    if (!toggle) return;

    if (e.target.closest("a[href]")) {
      toggle.checked = false;
    }
  });
})();