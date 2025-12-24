// /assets/script/dom-loader.js
(() => {
	const PARTIALS_BASE = "/assets/partials";
	const ASSETS_BASE = "/assets"; // keep everything under /assets/...

	const qs = (sel) => document.querySelector(sel);

	async function fetchText(url) {
		const VERSION = "2025-12-22"; // bump when needed
		const r = await fetch(`${url}?v=${encodeURIComponent(VERSION)}`, {
			cache: "no-store",
		});
		if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
		return r.text();
	}

	function ensurePlaceholder(id, tag = "div", parent = document.body) {
		let el = document.getElementById(id);
		if (!el) {
			el = document.createElement(tag);
			el.id = id;
			parent.appendChild(el);
		}
		return el;
	}

	// Inject HTML into a placeholder element (creates it if missing)
	async function mountPartial({
		id,
		url,
		where = "inner",
		tag = "div",
		parent,
	} = {}) {
		const host = ensurePlaceholder(id, tag, parent || document.body);
		const html = await fetchText(url);

		if (where === "inner") host.innerHTML = html;
		else if (where === "beforeend") host.insertAdjacentHTML("beforeend", html);
		else if (where === "afterbegin")
			host.insertAdjacentHTML("afterbegin", html);
		else throw new Error(`Unknown mount mode: ${where}`);

		return host;
	}

	// Load a script in strict order (awaitable)
	function loadScript(src) {
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = src;
			s.async = false; // important: preserve order
			s.onload = () => resolve();
			s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
			document.head.appendChild(s);
		});
	}

	function setAdminLinkForEnv() {
		const a = document.querySelector('a[data-role="admin-link"]');
		if (!a) return;

		const isDev = location.hostname.startsWith("dev.");
		a.href = isDev
			? "https://dev.admin.portfolio.tacsa.co.uk/"
			: "https://admin.portfolio.tacsa.co.uk/";
	}

	async function boot() {
		// 1) Inject CSS first (no script tags in head-common.html)
		await mountPartial({
			id: "head-common", // can be absent; we'll create it
			url: `${PARTIALS_BASE}/head-common.html`,
			where: "inner",
			tag: "div",
			parent: document.head, // put CSS into <head>
		});

		// 2) Mount DOM partials (order matters for “things that refer to placeholders”)
		await mountPartial({
			id: "nav-placeholder",
			url: `${PARTIALS_BASE}/nav.html`,
		});
		setAdminLinkForEnv();

		await mountPartial({
			id: "lightbox-placeholder",
			url: `${PARTIALS_BASE}/lightbox.html`,
		});

		// footer is inside <footer><div id="footer-placeholder"></div></footer> on your pages
		// This will still work even if that wrapper doesn’t exist; it’ll create a div at the bottom.
		await mountPartial({
			id: "footer-placeholder",
			url: `${PARTIALS_BASE}/footer.html`,
			parent: document.querySelector("footer") || document.body,
		});

		// 3) Load scripts in a guaranteed sequence
		// (Put any “defines globals used by others” FIRST)
		await loadScript(`${ASSETS_BASE}/script/nav-marker.js`);
		await loadScript(`${ASSETS_BASE}/script/nav-close.js`);
		await loadScript(`${ASSETS_BASE}/script/breadcrumbs.js`);
		await loadScript(`${ASSETS_BASE}/script/lightbox.js`);
		await loadScript(`${ASSETS_BASE}/script/sections.js`);

		if (typeof window.setActiveNav === "function") window.setActiveNav();

		if (typeof window.whenNavReady === "function") {
			window.whenNavReady(() => window.buildBreadcrumbs?.());
		} else {
			window.buildBreadcrumbs?.();
		}

		window.initLightbox?.();
	}

	boot().catch(console.error);
})();
