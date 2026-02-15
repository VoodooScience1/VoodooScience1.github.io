// /assets/script/dom-loader.js
(() => {
	const PARTIALS_BASE = "/assets/partials";
	const ASSETS_BASE = "/assets"; // keep everything under /assets/...
	const MERMAID_BUNDLE_VERSION = "2026-02-15-elkfix1";

	const qs = (sel) => document.querySelector(sel);

	async function fetchText(url) {
		const VERSION = "2025-03-08"; // bump when needed
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

	async function renderMermaidDiagrams() {
		const isAdmin = document.documentElement.classList.contains("cms-admin");
		const fallbackIcons = {
			prefix: "logos",
			icons: {
				cloud: {
					body: "<defs><linearGradient id=\"SVGZDBLty2B\" x1=\"0%\" x2=\"100%\" y1=\"100%\" y2=\"0%\"><stop offset=\"0%\" stop-color=\"#4D27A8\"/><stop offset=\"100%\" stop-color=\"#A166FF\"/></linearGradient></defs><path fill=\"url(#SVGZDBLty2B)\" d=\"M0 0h256v256H0z\"/><path fill=\"#FFF\" d=\"M176.39 166.794c0-5.293-4.307-9.6-9.6-9.6s-9.6 4.307-9.6 9.6s4.308 9.6 9.6 9.6c5.293 0 9.6-4.308 9.6-9.6m6.4 0c0 8.822-7.177 16-16 16c-8.822 0-16-7.178-16-16c0-8.823 7.178-16 16-16c8.823 0 16 7.177 16 16m-85.536-46.18c0-5.292-4.307-9.6-9.6-9.6c-5.296 0-9.6 4.308-9.6 9.6c0 5.293 4.304 9.6 9.6 9.6c5.293 0 9.6-4.307 9.6-9.6m6.4 0c0 8.823-7.18 16-16 16c-8.822 0-16-7.177-16-16c0-8.822 7.178-16 16-16c8.82 0 16 7.178 16 16m23.482-50.192c0 5.293 4.307 9.6 9.6 9.6c5.296 0 9.6-4.307 9.6-9.6c0-5.296-4.304-9.6-9.6-9.6c-5.293 0-9.6 4.304-9.6 9.6m-6.4 0c0-8.822 7.18-16 16-16c8.822 0 16 7.178 16 16c0 8.823-7.178 16-16 16c-8.82 0-16-7.177-16-16M211.2 128c0-29.674-15.91-57.126-41.562-71.971c-4.598.928-9.046 2.198-14.595 4.205l-2.176-6.02a131 131 0 0 1 7.984-2.61A83 83 0 0 0 128 44.8c-5.405 0-10.723.56-15.92 1.574c3.763 2.202 7.1 4.397 10.342 6.855l-3.868 5.097c-4.57-3.462-9.306-6.396-15.524-9.654c-31.42 9.882-54.05 37.594-57.644 70.138c6.588-1.335 12.915-2.061 19.939-2.234l.157 6.397c-7.36.182-13.684.963-20.596 2.483c-.028.848-.086 1.706-.086 2.544c0 27.706 13.706 53.235 36.246 68.63c-4.01-11.939-6.006-23.222-6.006-34.243c0-6.285 1.082-11.446 2.224-16.909c.266-1.264.534-2.55.797-3.884l6.281 1.238c-.268 1.357-.544 2.672-.812 3.962c-1.12 5.35-2.09 9.97-2.09 15.593c0 12.506 2.746 25.437 8.333 39.479c11.9 6.179 24.752 9.334 38.227 9.334c8.82 0 17.427-1.408 25.638-4.115c3.223-6.359 5.613-12.359 7.61-19.248l6.147 1.782a114 114 0 0 1-5.126 14.147c5.165-2.323 10.051-5.196 14.637-8.55c-1.104-2.707-2.288-5.398-3.597-8.02l5.725-2.863c1.113 2.227 2.134 4.505 3.11 6.797C200.656 175.28 211.2 152.512 211.2 128m6.4 0c0 27.926-12.691 53.757-34.813 70.877c-5.478 4.256-11.42 7.789-17.702 10.633c-2.666 1.21-5.38 2.33-8.17 3.27c-9.216 3.198-18.953 4.82-28.915 4.82c-14.72 0-29.338-3.667-42.278-10.605C56.534 191.38 38.4 161.11 38.4 128c0-2.195.058-3.866.189-5.411c2.179-37.389 27.83-69.75 63.814-80.458C110.598 39.658 119.216 38.4 128 38.4c15.386 0 30.525 3.962 43.789 11.453C200.042 65.68 217.6 95.629 217.6 128m-98.195-46.518l-4.205-4.823c-7.174 6.26-12.755 12.906-19.274 22.944l5.37 3.485c6.17-9.507 11.418-15.766 18.109-21.606m-9.725 41.484l-2.08 6.052c14.698 5.046 27.52 13.097 40.349 25.337l4.419-4.63c-13.523-12.9-27.088-21.402-42.688-26.759m42.787-37.628c12.007 18.31 18.768 38.41 20.093 59.744l-6.387.396c-1.258-20.21-7.667-39.264-19.053-56.63z\"/>",
				},
				user: {
					body: "<defs><linearGradient id=\"SVGhE6sJcGC\" x1=\"0%\" x2=\"100%\" y1=\"100%\" y2=\"0%\"><stop offset=\"0%\" stop-color=\"#BD0816\"/><stop offset=\"100%\" stop-color=\"#FF5252\"/></linearGradient></defs><path fill=\"url(#SVGhE6sJcGC)\" d=\"M0 0h256v256H0z\"/><path fill=\"#FFF\" d=\"M44.8 188.8h166.4V67.2H44.8zM217.6 64v128a3.2 3.2 0 0 1-3.2 3.2H41.6a3.2 3.2 0 0 1-3.2-3.2V64a3.2 3.2 0 0 1 3.2-3.2h172.8a3.2 3.2 0 0 1 3.2 3.2m-76.8 89.6h48v-6.4h-48zm41.6-19.2h16V128h-16zm-41.6 0h25.6V128h-25.6zm-48 12.8c0-1.763-1.434-3.2-3.2-3.2a3.203 3.203 0 0 0-3.2 3.2c0 1.763 1.434 3.2 3.2 3.2s3.2-1.437 3.2-3.2m6.4 0c0 4.166-2.685 7.683-6.4 9.011v6.989h-6.4v-6.992c-3.715-1.325-6.4-4.842-6.4-9.008c0-5.293 4.307-9.6 9.6-9.6s9.6 4.307 9.6 9.6m-38.4 25.578l57.58.022l.007-12.8H105.6v-6.4h12.787l.007-9.6H105.6v-6.4h12.797l.003-9.578L60.82 128zm9.6-51.175l38.4.016V99.2c.003-7.37-8.97-13.834-19.2-13.84h-.013c-10.214 0-19.174 6.467-19.18 13.84zm-16 54.371l.02-51.174a3.2 3.2 0 0 1 3.2-3.2l6.38.003l.006-22.403c.007-11.162 11.482-20.24 25.581-20.24h.013c14.118.006 25.603 9.088 25.6 20.24v22.422l6.4.004a3.2 3.2 0 0 1 3.2 3.2L124.78 176a3.2 3.2 0 0 1-3.2 3.2l-63.98-.026a3.2 3.2 0 0 1-3.2-3.2M192 115.2h6.4v-6.4H192zm-51.2 0H176v-6.4h-35.2z\"/>",
				},
				users: {
					body: "<defs><linearGradient id=\"SVGhE6sJcGC\" x1=\"0%\" x2=\"100%\" y1=\"100%\" y2=\"0%\"><stop offset=\"0%\" stop-color=\"#BD0816\"/><stop offset=\"100%\" stop-color=\"#FF5252\"/></linearGradient></defs><path fill=\"url(#SVGhE6sJcGC)\" d=\"M0 0h256v256H0z\"/><path fill=\"#FFF\" d=\"M44.8 188.8h166.4V67.2H44.8zM217.6 64v128a3.2 3.2 0 0 1-3.2 3.2H41.6a3.2 3.2 0 0 1-3.2-3.2V64a3.2 3.2 0 0 1 3.2-3.2h172.8a3.2 3.2 0 0 1 3.2 3.2m-76.8 89.6h48v-6.4h-48zm41.6-19.2h16V128h-16zm-41.6 0h25.6V128h-25.6zm-48 12.8c0-1.763-1.434-3.2-3.2-3.2a3.203 3.203 0 0 0-3.2 3.2c0 1.763 1.434 3.2 3.2 3.2s3.2-1.437 3.2-3.2m6.4 0c0 4.166-2.685 7.683-6.4 9.011v6.989h-6.4v-6.992c-3.715-1.325-6.4-4.842-6.4-9.008c0-5.293 4.307-9.6 9.6-9.6s9.6 4.307 9.6 9.6m-38.4 25.578l57.58.022l.007-12.8H105.6v-6.4h12.787l.007-9.6H105.6v-6.4h12.797l.003-9.578L60.82 128zm9.6-51.175l38.4.016V99.2c.003-7.37-8.97-13.834-19.2-13.84h-.013c-10.214 0-19.174 6.467-19.18 13.84zm-16 54.371l.02-51.174a3.2 3.2 0 0 1 3.2-3.2l6.38.003l.006-22.403c.007-11.162 11.482-20.24 25.581-20.24h.013c14.118.006 25.603 9.088 25.6 20.24v22.422l6.4.004a3.2 3.2 0 0 1 3.2 3.2L124.78 176a3.2 3.2 0 0 1-3.2 3.2l-63.98-.026a3.2 3.2 0 0 1-3.2-3.2M192 115.2h6.4v-6.4H192zm-51.2 0H176v-6.4h-35.2z\"/>",
				},
			},
		};
		const isMermaidText = (text) =>
			/(^|\n)\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|architecture-beta|architecture)\b/i.test(
				String(text || ""),
			);
		const normalizeMermaidText = (text) => {
			const raw = String(text || "").trim();
			if (!raw) return "";
			const decl = /(^|\n)(\s*)(flowchart|graph)(?:-elk)?\b/i.exec(raw);
			if (!decl) return raw;
			const declStart = decl.index + decl[1].length;
			const preamble = raw.slice(0, declStart);
			if (!/["']?layout["']?\s*:\s*["']?elk["']?/i.test(preamble))
				return raw;
			let normalized = raw;
			const readBool = (key) => {
				const m = new RegExp(
					`["']?${key}["']?\\s*:\\s*(true|false)\\b`,
					"i",
				).exec(preamble);
				if (!m) return undefined;
				return m[1].toLowerCase() === "true";
			};
			const readWord = (key) => {
				const m = new RegExp(
					`["']?${key}["']?\\s*:\\s*["']?([A-Z0-9_]+)["']?\\b`,
					"i",
				).exec(preamble);
				return m ? m[1] : undefined;
			};
			const elkConfig = {};
			const mergeEdges = readBool("mergeEdges");
			const forceNodeModelOrder = readBool("forceNodeModelOrder");
			const nodePlacementStrategy = readWord("nodePlacementStrategy");
			const considerModelOrder = readWord("considerModelOrder");
			if (typeof mergeEdges === "boolean") elkConfig.mergeEdges = mergeEdges;
			if (typeof forceNodeModelOrder === "boolean")
				elkConfig.forceNodeModelOrder = forceNodeModelOrder;
			if (nodePlacementStrategy)
				elkConfig.nodePlacementStrategy = nodePlacementStrategy;
			if (considerModelOrder) elkConfig.considerModelOrder = considerModelOrder;
			const initConfig = { flowchart: { defaultRenderer: "elk" } };
			if (Object.keys(elkConfig).length) initConfig.elk = elkConfig;
			const initDirective = `%%{init: ${JSON.stringify(initConfig)}}%%`;
			const hasElkRendererInit =
				/(^|\n)\s*%%\{init:\s*\{[\s\S]*?defaultRenderer\s*:\s*["']?elk["']?/i.test(
					normalized,
				);
			const hasElkOptionsInit =
				/(^|\n)\s*%%\{init:\s*\{[\s\S]*?["']?elk["']?\s*:\s*\{[\s\S]*?(mergeEdges|nodePlacementStrategy|forceNodeModelOrder|considerModelOrder)\b/i.test(
					normalized,
				);
			if (
				!hasElkRendererInit ||
				(Object.keys(elkConfig).length && !hasElkOptionsInit)
			) {
				normalized =
					`${normalized.slice(0, declStart)}${initDirective}\n` +
					normalized.slice(declStart);
			}
			return normalized.replace(
				/(^|\n)(\s*)(flowchart|graph)\b(?!-elk)/i,
				"$1$2flowchart-elk",
			);
		};
		const installMermaidElkCompat = () => {
			const mermaid = window.mermaid;
			if (!mermaid || mermaid.__elkLayoutCompatInstalled) return;
			mermaid.__elkLayoutCompatInstalled = true;
			const wrapTextArg = (fn, textIndex = 0) => {
				if (typeof fn !== "function") return fn;
				return function (...args) {
					if (args.length > textIndex) {
						args[textIndex] = normalizeMermaidText(args[textIndex]);
					}
					return fn.apply(this, args);
				};
			};
			mermaid.render = wrapTextArg(
				typeof mermaid.render === "function" ? mermaid.render.bind(mermaid) : null,
				1,
			);
			mermaid.parse = wrapTextArg(
				typeof mermaid.parse === "function" ? mermaid.parse.bind(mermaid) : null,
				0,
			);
			if (mermaid.mermaidAPI) {
				mermaid.mermaidAPI.render = wrapTextArg(
					typeof mermaid.mermaidAPI.render === "function"
						? mermaid.mermaidAPI.render.bind(mermaid.mermaidAPI)
						: null,
					1,
				);
				mermaid.mermaidAPI.parse = wrapTextArg(
					typeof mermaid.mermaidAPI.parse === "function"
						? mermaid.mermaidAPI.parse.bind(mermaid.mermaidAPI)
						: null,
					0,
				);
				mermaid.mermaidAPI.getDiagramFromText = wrapTextArg(
					typeof mermaid.mermaidAPI.getDiagramFromText === "function"
						? mermaid.mermaidAPI.getDiagramFromText.bind(mermaid.mermaidAPI)
						: null,
					0,
				);
			}
		};
		const portalRoot = isAdmin ? document.querySelector("#cms-portal") : null;
		const allCodes = Array.from(document.querySelectorAll("pre code")).filter(
			(code) => !(portalRoot && code.closest("#cms-portal")),
		);
		const codeBlocks = allCodes.filter((code) => {
			const cls = code.getAttribute("class") || "";
			const lang =
				(cls.match(/language-([a-z0-9_-]+)/i) || [])[1] ||
				code.getAttribute("data-lang") ||
				"";
			if (String(lang).toLowerCase() === "mermaid") return true;
			return isMermaidText(code.textContent || "");
		});
		codeBlocks.forEach((code) => {
			code.classList.add("nohighlight");
		});
		const adminPreviews = [];
		codeBlocks.forEach((code) => {
			const diagramText = normalizeMermaidText(code.textContent || "");
			if (code.closest(".cms-rte")) return;
			const pre = code.closest("pre");
			if (!pre) return;
			if (isAdmin) {
				if (pre.nextElementSibling?.classList?.contains("mermaid-preview"))
					return;
				const wrapper = document.createElement("div");
				wrapper.className = "mermaid-wrap mermaid-preview is-loading";
				wrapper.setAttribute("data-cms-preview", "true");
				pre.insertAdjacentElement("afterend", wrapper);
				adminPreviews.push({ wrapper, text: diagramText });
				return;
			}
			const wrapper = document.createElement("div");
			wrapper.className = "mermaid-wrap is-loading";
			const container = document.createElement("div");
			container.className = "mermaid";
			container.textContent = diagramText;
			wrapper.appendChild(container);
			pre.replaceWith(wrapper);
		});

		const clearLoading = () => {
			document
				.querySelectorAll(".mermaid-wrap.is-loading")
				.forEach((wrap) => wrap.classList.remove("is-loading"));
		};
		const finalizeLoading = () => {
			document
				.querySelectorAll(".mermaid-wrap.is-loading")
				.forEach((wrap) => {
					if (
						wrap.querySelector("svg") ||
						wrap.querySelector(".mermaid[data-processed='true']") ||
						wrap.querySelector(".cms-mermaid-preview__diagram")
					) {
						wrap.classList.remove("is-loading");
					}
				});
		};
		const scheduleLoadingClear = () => {
			setTimeout(clearLoading, 200);
			setTimeout(clearLoading, 1200);
			setTimeout(clearLoading, 3000);
		};
		const blocks = Array.from(document.querySelectorAll(".mermaid"));
		if (!blocks.length && !adminPreviews.length) {
			clearLoading();
			return;
		}

		const isRendered = (block) =>
			block.getAttribute("data-processed") === "true" ||
			Boolean(block.querySelector("svg"));
		const watchBlock = (block) => {
			const wrap = block.closest(".mermaid-wrap");
			if (!wrap || !wrap.classList.contains("is-loading")) return;
			let observer = null;
			const stop = () => {
				if (!wrap.classList.contains("is-loading")) return;
				wrap.classList.remove("is-loading");
				if (observer) observer.disconnect();
			};
			if (isRendered(block)) {
				stop();
				return;
			}
			observer = new MutationObserver(() => {
				if (isRendered(block)) stop();
			});
			observer.observe(block, {
				attributes: true,
				attributeFilter: ["data-processed"],
				childList: true,
				subtree: true,
			});
			setTimeout(stop, 5000);
		};
		blocks.forEach((block) => watchBlock(block));
		scheduleLoadingClear();

		try {
			await loadScript(
				`${ASSETS_BASE}/script/vendor/mermaid.min.js?v=${MERMAID_BUNDLE_VERSION}`,
			);
		} catch (err) {
			console.error(err);
			clearLoading();
			return;
		}

		if (!window.mermaid) {
			clearLoading();
			return;
		}
		window.mermaid.initialize({
			startOnLoad: false,
			theme: "neutral",
			suppressErrorRendering: true,
		});
		installMermaidElkCompat();
		if (typeof window.mermaid.registerIconPacks === "function") {
			try {
				const iconUrl = `${ASSETS_BASE}/icon-packs/logos.json?v=${Date.now()}`;
				const loadIcons = async () => {
					try {
						const res = await fetch(iconUrl);
						if (res.ok) return await res.json();
					} catch {
						return fallbackIcons;
					}
					return fallbackIcons;
				};
				const result = window.mermaid.registerIconPacks([
					{
						name: "logos",
						loader: loadIcons,
					},
				]);
				if (result && typeof result.then === "function") {
					await result;
				}
			} catch (err) {
				try {
					window.mermaid.registerIconPacks([
						{ name: "logos", loader: async () => fallbackIcons },
					]);
				} catch {
					console.warn("Mermaid icon pack load failed:", err);
				}
			}
		}
		try {
			if (blocks.length) {
				if (typeof window.mermaid.run === "function") {
					await window.mermaid.run({ nodes: blocks });
				} else if (typeof window.mermaid.init === "function") {
					window.mermaid.init(undefined, blocks);
				}
				finalizeLoading();
				setTimeout(finalizeLoading, 200);
				setTimeout(finalizeLoading, 1000);
			}
			if (adminPreviews.length && typeof window.mermaid.render === "function") {
				let counter = 0;
				for (const preview of adminPreviews) {
					const id = `mermaid-admin-${counter++}`;
					try {
						const result = await window.mermaid.render(id, preview.text);
						preview.wrapper.innerHTML = result?.svg || "";
					} catch (err) {
						console.error(err);
						preview.wrapper.textContent = "Mermaid render failed.";
					} finally {
						preview.wrapper.classList.remove("is-loading");
					}
				}
				finalizeLoading();
				setTimeout(finalizeLoading, 200);
				setTimeout(finalizeLoading, 1000);
			}
		} catch (err) {
			console.error(err);
		} finally {
			clearLoading();
			document.documentElement.classList.add("mermaid-ready");
		}
	}

	function copyTextToClipboard(text) {
		const value = String(text ?? "");
		if (!value) return Promise.resolve();
		if (navigator.clipboard?.writeText) {
			return navigator.clipboard.writeText(value);
		}
		return new Promise((resolve, reject) => {
			const area = document.createElement("textarea");
			area.value = value;
			area.setAttribute("readonly", "true");
			area.style.position = "fixed";
			area.style.top = "-9999px";
			area.style.left = "-9999px";
			document.body.appendChild(area);
			area.select();
			try {
				document.execCommand("copy");
				resolve();
			} catch (err) {
				reject(err);
			} finally {
				document.body.removeChild(area);
			}
		});
	}

	function setupCodeCopyButtons() {
		if (document.documentElement.dataset.codeCopyReady) return;
		document.documentElement.dataset.codeCopyReady = "1";

		const attachButton = (pre) => {
			if (!pre || !(pre instanceof HTMLElement)) return;
			if (pre.dataset.codeCopyReady === "1") return;
			if (pre.closest(".cms-rte")) return;
			const code = pre.querySelector("code");
			if (!code) return;
			pre.dataset.codeCopyReady = "1";

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "code-copy-btn";
			btn.setAttribute("aria-label", "Copy code");
			btn.setAttribute("title", "Copy");
			btn.textContent = "content_copy";
			btn.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const text = code.textContent || "";
				copyTextToClipboard(text)
					.then(() => {
						btn.classList.add("is-copied");
						btn.textContent = "check";
						window.setTimeout(() => {
							btn.classList.remove("is-copied");
							btn.textContent = "content_copy";
						}, 1200);
					})
					.catch(() => {
						btn.textContent = "error";
						window.setTimeout(() => {
							btn.textContent = "content_copy";
						}, 1200);
					});
			});
			pre.appendChild(btn);
		};

		const scan = (root) => {
			if (!root) return;
			if (root.matches?.("pre")) attachButton(root);
			root.querySelectorAll?.("pre").forEach((pre) => attachButton(pre));
		};

		scan(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (!(node instanceof HTMLElement)) return;
					scan(node);
				});
			});
		});
		observer.observe(document.body, { childList: true, subtree: true });
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
		const headCommon = document.querySelector("#head-common");
		if (headCommon) {
			const atom = headCommon.querySelector(
				'link[rel="stylesheet"][href*="atom-one-dark"]',
			);
			const overrides = headCommon.querySelector(
				'link[rel="stylesheet"][href*="highlight-overrides.css"]',
			);
			if (atom && overrides && atom.nextSibling !== overrides) {
				atom.parentNode.insertBefore(overrides, atom.nextSibling);
			}
		}
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
		await loadScript(`${ASSETS_BASE}/script/breadcrumbs.js`);
		window.buildBreadcrumbs?.();

		await loadScript(`${ASSETS_BASE}/script/sections.js`);
		document.documentElement.classList.add("sections-ready");

		await renderMermaidDiagrams();

		// Show the page once CSS + sections expansion are done; nav scripts can finish after.
		document.documentElement.classList.add("dom-ready");

		try {
			await loadScript(
				"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
			);
			if (window.hljs?.configure) {
				window.hljs.configure({ ignoreUnescapedHTML: true });
			}
			const disableHighlight =
				window.__CMS_DISABLE_HIGHLIGHT__ ||
				document.documentElement.classList.contains("cms-admin");
			if (!disableHighlight && window.hljs?.highlightAll) {
				window.hljs.highlightAll();
				document.querySelectorAll("pre code").forEach((code) => {
					const cls = code.getAttribute("class") || "";
					const match = cls.match(/language-([a-z0-9_-]+)/i);
					if (match) code.setAttribute("data-lang", match[1]);
				});
			}
		} catch (err) {
			console.error(err);
		}

		setupCodeCopyButtons();

		await loadScript(`${ASSETS_BASE}/script/nav-marker.js`);
		await loadScript(`${ASSETS_BASE}/script/nav-close.js`);
		await loadScript(`${ASSETS_BASE}/script/lightbox.js`);
		await loadScript(`${ASSETS_BASE}/script/doc-modal.js`);

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
			document.documentElement.classList.add("sections-ready");
			document.documentElement.classList.add("dom-ready"); // fail open
		});
})();
