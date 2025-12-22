(() => {
	function normPath(p) {
		if (!p) return "/";
		p = String(p).split("?")[0].split("#")[0];
		p = p.replace(/\/index\.html$/i, "/");
		if (p.length > 1) p = p.replace(/\/$/, "");
		return p;
	}

	function pretty(seg) {
		return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
	}

	function findLabelFromNav(path) {
		const nav = document.querySelector(".main-nav");
		if (!nav) return null;

		const links = nav.querySelectorAll("a[href]");
		for (const a of links) {
			const href = a.getAttribute("href");
			if (
				!href ||
				href.startsWith("#") ||
				href.startsWith("mailto:") ||
				href.startsWith("http")
			)
				continue;

			const linkPath = normPath(new URL(href, window.location.origin).pathname);
			if (linkPath === path) return (a.textContent || "").trim() || null;
		}
		return null;
	}

	function buildBreadcrumbs() {
		const wrap = document.querySelector(".breadcrumbs");
		if (!wrap) return;

		const currentPath = normPath(window.location.pathname);
		const parts = currentPath.split("/").filter(Boolean);

		// Build cumulative paths: /about, /about/working-style, etc.
		const crumbs = [{ path: "/", label: "Home" }];
		let acc = "";
		for (const seg of parts) {
			acc += "/" + seg;
			const label = findLabelFromNav(acc) || pretty(seg);
			crumbs.push({ path: acc, label });
		}

		wrap.innerHTML = "";
		crumbs.forEach((c, i) => {
			const isLast = i === crumbs.length - 1;

			if (i > 0) {
				const sep = document.createElement("span");
				sep.className = "sep";
				sep.textContent = "/";
				wrap.appendChild(sep);
			}

			if (isLast) {
				const cur = document.createElement("span");
				cur.className = "current";
				cur.setAttribute("aria-current", "page");
				cur.textContent = c.label;
				wrap.appendChild(cur);
			} else {
				const a = document.createElement("a");
				a.href =
					c.path === "/"
						? "/"
						: c.path.endsWith(".html")
							? c.path
							: c.path + ".html";
				a.textContent = c.label;
				wrap.appendChild(a);
			}
		});
	}

	// Nav is injected via partials, so wait for it
	function whenNavReady(cb) {
		const nav = document.querySelector(".main-nav");
		if (nav) return cb();

		const mo = new MutationObserver(() => {
			if (document.querySelector(".main-nav")) {
				mo.disconnect();
				cb();
			}
		});
		mo.observe(document.documentElement, { childList: true, subtree: true });
	}

	window.buildBreadcrumbs = buildBreadcrumbs;
	window.whenNavReady = whenNavReady; // optional
})();
