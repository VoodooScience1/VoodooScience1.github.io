// /assets/script/dom-loader.js
(() => {
	const PARTIALS_BASE = "/assets/partials";
	const ASSETS_BASE = "/assets"; // keep everything under /assets/...

	const qs = (sel) => document.querySelector(sel);

	async function fetchText(url) {
		const VERSION = "2025-12-22"; // bump when needed
		const r = await fetch(`${url}?v=${encodeURIComponent(VERSION)}`);
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

	function mountPartialHtml({
		id,
		html,
		where = "inner",
		tag = "div",
		parent,
	} = {}) {
		const host = ensurePlaceholder(id, tag, parent || document.body);
		const text = String(html || "");
		if (where === "inner") host.innerHTML = text;
		else if (where === "beforeend") host.insertAdjacentHTML("beforeend", text);
		else if (where === "afterbegin")
			host.insertAdjacentHTML("afterbegin", text);
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

	function waitForStyles(links) {
		const list = Array.from(links || []);
		if (!list.length) return Promise.resolve();
		return Promise.all(
			list.map(
				(link) =>
					new Promise((resolve) => {
						if (link.sheet) return resolve();
						link.addEventListener("load", () => resolve(), { once: true });
						link.addEventListener("error", () => resolve(), { once: true });
					}),
			),
		);
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
		// 1) Fetch partials in parallel (reduces waterfall)
		const headPromise = fetchText(`${PARTIALS_BASE}/head-common.html`);
		const navPromise = fetchText(`${PARTIALS_BASE}/nav.html`);
		const lightboxPromise = fetchText(`${PARTIALS_BASE}/lightbox.html`);
		const footerPromise = fetchText(`${PARTIALS_BASE}/footer.html`);

		// 2) Inject CSS first (no script tags in head-common.html)
		const headHtml = await headPromise;
		mountPartialHtml({
			id: "head-common", // can be absent; we'll create it
			html: headHtml,
			where: "inner",
			tag: "div",
			parent: document.head, // put CSS into <head>
		});
		await waitForStyles(
			document.querySelectorAll("#head-common link[rel='stylesheet']"),
		);

		// 3) Mount DOM partials (order matters for “things that refer to placeholders”)
		const [navHtml, lightboxHtml, footerHtml] = await Promise.all([
			navPromise,
			lightboxPromise,
			footerPromise,
		]);
		mountPartialHtml({
			id: "nav-placeholder",
			html: navHtml,
		});
		setAdminLinkForEnv();
		mountPartialHtml({
			id: "lightbox-placeholder",
			html: lightboxHtml,
		});
		// footer is inside <footer><div id="footer-placeholder"></div></footer> on your pages
		// This will still work even if that wrapper doesn’t exist; it’ll create a div at the bottom.
		mountPartialHtml({
			id: "footer-placeholder",
			html: footerHtml,
			parent: document.querySelector("footer") || document.body,
		});

		// 4) Load scripts in a guaranteed sequence
		// (Put any “defines globals used by others” FIRST)
		await loadScript(`${ASSETS_BASE}/script/sections.js`);

		// Show the page once CSS + sections expansion are done; nav scripts can finish after.
		document.documentElement.classList.add("dom-ready");

		await loadScript(`${ASSETS_BASE}/script/nav-marker.js`);
		await loadScript(`${ASSETS_BASE}/script/nav-close.js`);
		await loadScript(`${ASSETS_BASE}/script/breadcrumbs.js`);
		await loadScript(`${ASSETS_BASE}/script/lightbox.js`);

		if (typeof window.setActiveNav === "function") window.setActiveNav();

		if (typeof window.whenNavReady === "function") {
			window.whenNavReady(() => window.buildBreadcrumbs?.());
		} else {
			window.buildBreadcrumbs?.();
		}

		window.initLightbox?.();
	}
	boot()
		.catch((e) => {
			console.error(e);
			document.documentElement.classList.add("dom-ready"); // fail open
		});
})();
