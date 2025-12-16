// nav-closebar.js
(function () {
  const BAR_H = 64; // must match CSS height above

  function getNav() {
    return document.querySelector("nav.main-nav");
  }

  function isMenuOpen(nav) {
    return (
      nav?.classList.contains("open") ||
      nav?.classList.contains("is-open") ||
      nav?.classList.contains("active") ||
      document.documentElement.classList.contains("nav-open") ||
      document.body.classList.contains("nav-open")
    );
  }

  function closeMenu(nav) {
    // If your hamburger uses a checkbox toggle, close that first
    const toggle =
      document.querySelector("#nav-toggle") ||
      document.querySelector("#navToggle") ||
      document.querySelector('input[type="checkbox"][data-nav-toggle]');

    if (toggle) toggle.checked = false;

    // Also remove common “open” classes (safe even if you don’t use them)
    nav?.classList.remove("open", "is-open", "active");
    document.documentElement.classList.remove("nav-open");
    document.body.classList.remove("nav-open");
  }

  document.addEventListener("click", (e) => {
    // only on small screens
    if (window.matchMedia("(min-width: 880px)").matches) return;

    const nav = getNav();
    if (!nav || !isMenuOpen(nav)) return;

    // click must be inside nav, and within the top bar region
    const clickedInsideNav = nav.contains(e.target);
    if (!clickedInsideNav) return;

    if (e.clientY <= BAR_H) {
      e.preventDefault();
      e.stopPropagation();
      closeMenu(nav);
    }
  }, true);
})();