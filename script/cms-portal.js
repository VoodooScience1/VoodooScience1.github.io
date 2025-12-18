/* cms-portal.js
 * MVP (read-only):
 * - Runs on /admin.html
 * - Loads a target page via your Cloudflare Worker:
 *     GET {WORKER_BASE}/api/repo/file?path=about/working-style.html
 * - Extracts:
 *     <!-- CMS:START hero --> ... <!-- CMS:END hero -->
 *     <!-- CMS:START main --> ... <!-- CMS:END main -->
 * - Renders:
 *     Left: block list (detected types + small summary)
 *     Right: preview (hero + main rendered in an iframe via srcdoc)
 *
 * Next iterations:
 * - Add/Edit/Delete/Reorder blocks
 * - Dirty tracking + Commit modal + POST /api/pr
 */

(() => {
	// -------------------------
	// CONFIG (edit these)
	// -------------------------
	const WORKER_BASE =
		"https://sa-portfolio-cms.voodoo-science-programming.workers.dev";
	const MANAGED_PAGES = [
		{ label: "Working Style", path: "about/working-style.html" },
	];

	// -------------------------
	// Utilities
	// -------------------------
	const qs = (sel, root = document) => root.querySelector(sel);
	const el = (tag, attrs = {}, children = []) => {
		const n = document.createElement(tag);
		Object.entries(attrs || {}).forEach(([k, v]) => {
			if (k === "class") n.className = v;
			else if (k === "html") n.innerHTML = v;
			else if (k.startsWith("on") && typeof v === "function")
				n.addEventListener(k.slice(2), v);
			else n.setAttribute(k, String(v));
		});
		(children || []).forEach((c) =>
			n.appendChild(typeof c === "string" ? document.createTextNode(c) : c),
		);
		return n;
	};

	async function fetchJson(url) {
		const res = await fetch(url, { headers: { Accept: "application/json" } });
		const text = await res.text();
		let json;
		try {
			json = text ? JSON.parse(text) : null;
		} catch {
			json = { raw: text };
		}
		if (!res.ok) {
			const msg = json?.error || json?.message || `HTTP ${res.status}`;
			throw new Error(`${msg}`);
		}
		return json;
	}

	function extractRegion(html, name) {
		// name: "hero" or "main"
		const start = `<!-- CMS:START ${name} -->`;
		const end = `<!-- CMS:END ${name} -->`;
		const i = html.indexOf(start);
		const j = html.indexOf(end);
		if (i === -1 || j === -1 || j <= i) return { found: false, inner: "" };
		return {
			found: true,
			inner: html.slice(i + start.length, j).trim(),
			startIndex: i,
			endIndex: j + end.length,
		};
	}

	function parseBlocks(mainHtml) {
		// We treat each top-level element in main as a "block".
		// Later we’ll support “managed blocks” inside wrappers too.
		const doc = new DOMParser().parseFromString(
			`<div id="__wrap__">${mainHtml}</div>`,
			"text/html",
		);
		const wrap = doc.querySelector("#__wrap__");
		const nodes = Array.from(wrap.children);

		return nodes.map((node, idx) => {
			const info = detectBlock(node);
			return {
				idx,
				type: info.type,
				summary: info.summary,
				html: node.outerHTML,
			};
		});
	}

	function detectBlock(node) {
		// Recognisers for your “Day-1” blocks, plus a fallback.
		// (You can expand this as you add more templates.)
		const cls = node.classList;

		// inline-polaroid stub
		if (cls.contains("img-stub") && node.getAttribute("data-img")) {
			const cap = node.getAttribute("data-caption") || "";
			return {
				type: "inline-polaroid",
				summary: cap || node.getAttribute("data-img"),
			};
		}

		// section stubs that sections.js expands
		if (cls.contains("section")) {
			const t = (node.getAttribute("data-type") || "").trim();
			if (t === "twoCol")
				return { type: "two-col", summary: headingText(node) || "Two column" };
			if (t === "split50") {
				const pos = node.getAttribute("data-img-pos") || "left";
				return {
					type: "50-50-split",
					summary: `${headingText(node) || "Split"} (img ${pos})`,
				};
			}
			if (t === "imgText") {
				const pos = node.getAttribute("data-img-pos") || "left";
				return {
					type: "small-img-lrg-txt",
					summary: `${headingText(node) || "ImgText"} (img ${pos})`,
				};
			}
			return {
				type: `section:${t || "unknown"}`,
				summary: headingText(node) || "Section",
			};
		}

		// std-container (your wrapper)
		if (cls.contains("div-wrapper")) {
			const h = node.querySelector("h1,h2,h3");
			return {
				type: "std-container",
				summary: h?.textContent?.trim() || "Container",
			};
		}

		// std-image
		if (cls.contains("img-text-div-img")) {
			const img = node.querySelector("img");
			return {
				type: "std-image",
				summary: img?.getAttribute("src") || "Image",
			};
		}

		// hover cards / grid wrapper
		if (cls.contains("grid-wrapper")) {
			return {
				type: "grid-wrapper",
				summary: `Grid (${node.querySelectorAll("img").length} imgs)`,
			};
		}

		return {
			type: node.tagName.toLowerCase(),
			summary: (node.textContent || "").trim().slice(0, 60) || "Block",
		};
	}

	function headingText(node) {
		const h = node.querySelector("h1,h2,h3");
		return h?.textContent?.trim() || "";
	}

	function buildPreviewSrcdoc(heroInner, mainInner) {
		// A lightweight page wrapper that uses your real CSS + sections.js.
		// We intentionally omit your nav partial injection for now (keeps preview stable).
		return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Preview</title>

  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/accordian.css">
  <link rel="stylesheet" href="/css/grid-panel.css">
  <link rel="stylesheet" href="/css/nav.css">
  <link rel="stylesheet" href="/css/modal.css">

  <style>
    /* Preview watermark + safety */
    body { position: relative; }
    .__cms_watermark {
      position: fixed;
      top: 10px;
      right: 10px;
      font: 700 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,183,3,.25);
      border: 1px solid rgba(255,183,3,.5);
      z-index: 999999;
      pointer-events: none;
    }
  </style>

  <script src="/script/sections.js" defer></script>
  <script src="/script/lightbox.js" defer></script>
</head>
<body>
  <div class="__cms_watermark">DEV PORTAL PREVIEW</div>

  <div class="container">
    <div><img class="cover-img" src="/img/cover-photo.png" alt="Cover"></div>
  </div>

  ${heroInner || ""}

  ${mainInner || ""}

</body>
</html>`;
	}

	// -------------------------
	// UI Shell
	// -------------------------
	function mountShell(root) {
		const style = el("style", {
			html: `
#cms-portal { font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; }
.cms-banner {
  position: sticky; top: 0; z-index: 50;
  display: flex; gap: 12px; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255,183,3,.18);
  border-bottom: 1px solid rgba(255,183,3,.35);
  backdrop-filter: blur(8px);
}
.cms-banner h1 { font-size: 14px; margin: 0; letter-spacing: .2px; }
.cms-pill { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,183,3,.55); }
.cms-pill.ok { background: rgba(60, 200, 120, .15); border-color: rgba(60, 200, 120, .35); }
.cms-pill.warn { background: rgba(255,183,3,.18); }
.cms-pill.err { background: rgba(255, 90, 90, .16); border-color: rgba(255, 90, 90, .35); }

.cms-layout { display: grid; grid-template-columns: 360px 1fr; gap: 12px; padding: 12px; }
.cms-left, .cms-right { border: 1px solid rgba(255,183,3,.25); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,.03); }
.cms-left-header { padding: 10px 12px; border-bottom: 1px solid rgba(255,183,3,.18); display:flex; gap: 8px; align-items:center; }
.cms-left-header select { width: 100%; padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,183,3,.22); background: rgba(0,0,0,.15); color: inherit; }
.cms-btn { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,183,3,.25); background: rgba(255,183,3,.12); color: inherit; cursor: pointer; }
.cms-btn:disabled { opacity: .5; cursor: not-allowed; }

.cms-blocks { padding: 10px; display: grid; gap: 10px; }
.cms-card { border: 1px solid rgba(255,183,3,.18); border-radius: 14px; padding: 10px; background: rgba(0,0,0,.10); }
.cms-card .t { font-size: 12px; opacity: .8; margin-bottom: 4px; }
.cms-card .s { font-size: 13px; }

.cms-preview { width: 100%; height: calc(100vh - 86px); border: 0; background: transparent; }
.cms-error { padding: 10px 12px; color: #ffb4b4; }
      `,
		});

		const banner = el("div", { class: "cms-banner" }, [
			el("div", {}, [
				el("h1", {}, ["Development Portal"]),
				el("div", { id: "cms-sub", style: "font-size:12px; opacity:.8;" }, [
					"Loading…",
				]),
			]),
			el("div", { style: "display:flex; gap:10px; align-items:center;" }, [
				el("span", { id: "cms-status", class: "cms-pill warn" }, ["Idle"]),
				el("button", { class: "cms-btn", id: "cms-commit", disabled: "true" }, [
					"Commit",
				]),
			]),
		]);

		const pageSelect = el(
			"select",
			{ id: "cms-page" },
			MANAGED_PAGES.map((p) => el("option", { value: p.path }, [p.label])),
		);

		const leftHeader = el("div", { class: "cms-left-header" }, [
			pageSelect,
			el("button", { class: "cms-btn", id: "cms-load" }, ["Load"]),
		]);

		const left = el("div", { class: "cms-left" }, [
			leftHeader,
			el("div", { id: "cms-blocks", class: "cms-blocks" }, []),
		]);

		const iframe = el("iframe", {
			id: "cms-preview",
			class: "cms-preview",
			sandbox: "allow-same-origin allow-scripts",
		});

		const right = el("div", { class: "cms-right" }, [iframe]);

		const layout = el("div", { class: "cms-layout" }, [left, right]);

		root.appendChild(style);
		root.appendChild(banner);
		root.appendChild(layout);
	}

	// -------------------------
	// App state
	// -------------------------
	const state = {
		path: MANAGED_PAGES[0].path,
		originalHtml: "",
		heroInner: "",
		mainInner: "",
		blocks: [],
	};

	function setStatus(kind, text) {
		const pill = qs("#cms-status");
		pill.classList.remove("ok", "warn", "err");
		pill.classList.add(kind);
		pill.textContent = text;
	}

	function renderBlocks() {
		const wrap = qs("#cms-blocks");
		wrap.innerHTML = "";

		if (!state.blocks.length) {
			wrap.appendChild(
				el("div", { class: "cms-card" }, [
					el("div", { class: "t" }, ["No blocks detected"]),
					el("div", { class: "s" }, ["(Your CMS main region is empty)"]),
				]),
			);
			return;
		}

		state.blocks.forEach((b) => {
			wrap.appendChild(
				el("div", { class: "cms-card" }, [
					el("div", { class: "t" }, [`${b.idx + 1}. ${b.type}`]),
					el("div", { class: "s" }, [b.summary || "—"]),
				]),
			);
		});
	}

	function renderPreview() {
		const iframe = qs("#cms-preview");
		iframe.srcdoc = buildPreviewSrcdoc(state.heroInner, state.mainInner);
	}

	async function loadSelectedPage() {
		const path = qs("#cms-page").value;
		state.path = path;

		setStatus("warn", "Loading…");
		qs("#cms-sub").textContent = `Target: ${path}`;

		const url = `${WORKER_BASE}/api/repo/file?path=${encodeURIComponent(path)}`;
		const data = await fetchJson(url);

		// Worker returns { text, sha, ... }
		state.originalHtml = data.text || "";

		const hero = extractRegion(state.originalHtml, "hero");
		const main = extractRegion(state.originalHtml, "main");

		state.heroInner = hero.found ? hero.inner : "";
		state.mainInner = main.found ? main.inner : "";

		state.blocks = parseBlocks(state.mainInner);

		renderBlocks();
		renderPreview();

		const missing = [];
		if (!hero.found) missing.push("hero markers");
		if (!main.found) missing.push("main markers");

		if (missing.length) setStatus("err", `Missing ${missing.join(" + ")}`);
		else setStatus("ok", "Loaded");
	}

	function bindUI() {
		qs("#cms-page").addEventListener("change", (e) => {
			state.path = e.target.value;
			qs("#cms-sub").textContent = `Target: ${state.path}`;
		});

		qs("#cms-load").addEventListener("click", async () => {
			try {
				await loadSelectedPage();
			} catch (err) {
				setStatus("err", "Error");
				const wrap = qs("#cms-blocks");
				wrap.prepend(
					el("div", { class: "cms-error" }, [
						`Load failed: ${String(err?.message || err)}`,
						`\n\nIf this is a CORS error in the browser, tell me and I’ll give you the 3-line Worker fix.`,
					]),
				);
			}
		});
	}

	// -------------------------
	// Boot
	// -------------------------
	function boot() {
		const root = qs("#cms-portal");
		if (!root) return;

		mountShell(root);
		bindUI();

		// auto-load working style
		qs("#cms-sub").textContent = `Target: ${state.path}`;
		qs("#cms-load").click();
	}

	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", boot);
	else boot();
})();
