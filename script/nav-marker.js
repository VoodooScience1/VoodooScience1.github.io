// nav-marker.js
(function () {
	function normPath(p) {
		if (!p) return "/";

		// remove query/hash if they sneak in
		p = String(p).split("?")[0].split("#")[0];

		// treat /index.html as /
		p = p.replace(/\/index\.html$/i, "/");

		// strip trailing slash unless it's root
		if (p.length > 1) p = p.replace(/\/$/, "");

		return p;
	}

	window.setActiveNav = function setActiveNav() {
		const nav = document.querySelector(".main-nav");
		if (!nav) return;

		// clear existing
		nav
			.querySelectorAll("li.active")
			.forEach((li) => li.classList.remove("active"));

		const currentPath = normPath(window.location.pathname);

		let matchLink = null;

		nav.querySelectorAll("a[href]").forEach((a) => {
			const href = a.getAttribute("href");
			if (
				!href ||
				href.startsWith("#") ||
				href.startsWith("mailto:") ||
				href.startsWith("http")
			)
				return;

			// the nav uses root-relative hrefs, but this keeps it robust
			const linkPath = normPath(new URL(href, window.location.origin).pathname);

			if (linkPath === currentPath) {
				matchLink = a;
			}

			// also treat "/" and "/index.html" as equivalent both ways
			if (!matchLink) {
				const curIsHome = currentPath === "/";
				const linkIsHome = linkPath === "/";
				if (curIsHome && linkIsHome) matchLink = a;
			}
		});

		if (!matchLink) return;

		// mark the matched li
		const li = matchLink.closest("li");
		if (li) li.classList.add("active");

		// if it's a submenu item, also mark the parent top-level li
		const subMenu = matchLink.closest(".sub-menu");
		if (subMenu) {
			const parentLi = subMenu.closest("li");
			if (parentLi) parentLi.classList.add("active");
		}
	};
})();
