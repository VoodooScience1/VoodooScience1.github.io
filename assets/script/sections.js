// sections.js
// Expands <div class="section" data-type="..."> stubs into EXISTING div/class structure.
// Also expands inline media stubs: <div class="img-stub" ...></div>
//
// IMPORTANT:
// - This file is the *only* renderer for stub expansion.
// - Divider/doc/grid/hover-cards are already final HTML and are intentionally ignored.
// - Portfolio grids are data-driven and rendered from JSON below.
//
// Supported section stubs:
//  - data-type="imgText"
//  - data-type="split50"
//  - data-type="twoCol"
//
// Inline image stubs:
//  - <div class="img-stub"
//        data-img="/assets/img/..."
//        data-caption="..."
//        data-lightbox="true|false"
//        data-overlay-title="..."
//        data-overlay-text="..."
//        data-size="sml|lrg"></div>
//
// Inline video stubs:
//  - <div class="video-stub"
//        data-video="https://www.youtube.com/watch?v=..."
//        data-caption="..."
//        data-scale="sm|md|lg|full"></div>
//
// Notes:
// - We intentionally DO NOT support `data-class` anymore (keeps authoring deterministic).
// - If lightbox is enabled, we add `js-lightbox` to the generated <img>.

(function () {
	function el(tag, className) {
		const n = document.createElement(tag);
		if (className) n.className = className;
		return n;
	}

	function toArray(list) {
		return Array.prototype.slice.call(list || []);
	}

	function isTrue(val) {
		return String(val || "").toLowerCase() === "true";
	}

	function getYouTubeVideoId(value) {
		const raw = String(value || "").trim();
		if (!raw) return "";
		if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
		let url = null;
		try {
			url = new URL(raw);
		} catch {
			return "";
		}
		const host = url.hostname.toLowerCase();
		if (host.includes("youtu.be")) {
			return url.pathname.replace(/^\/+/, "").split("/")[0] || "";
		}
		if (!host.includes("youtube.com")) return "";
		if (url.pathname === "/watch") {
			return url.searchParams.get("v") || "";
		}
		const parts = url.pathname.split("/").filter(Boolean);
		if (parts[0] === "embed" && parts[1]) return parts[1];
		if (parts[0] === "shorts" && parts[1]) return parts[1];
		if (parts[0] === "live" && parts[1]) return parts[1];
		return "";
	}

	function getYouTubeEmbedSrc(value) {
		const id = getYouTubeVideoId(value);
		return id ? `https://www.youtube.com/embed/${id}` : "";
	}

	function moveAllChildren(fromEl, toEl) {
		toArray(fromEl.childNodes).forEach((n) => toEl.appendChild(n));
	}

	function wrapInDivWrapper(inner) {
		const outer = el("div", "div-wrapper");
		outer.appendChild(inner);
		return outer;
	}

	// Build a “polaroid frame” wrapper with optional hover-overlay.
	// This is used for both inline stubs and section stubs.
	function buildImgWrap(
		className,
		imgSrc,
		caption,
		useLightbox,
		overlayEnabled,
		overlayTitle,
		overlayText,
		scale,
	) {
		const imgWrap = el("div", className);
		const scaleValue = String(scale || "").trim().toLowerCase();
		if (scaleValue && scaleValue !== "auto") {
			imgWrap.classList.add(`img-scale-${scaleValue}`);
		}

		// No image? No broken <img>.
		if (!imgSrc) return imgWrap;

		// Reuse your hover-card overlay CSS inside the polaroid frame.
		const content = el("div", "content content--full");

		const img = document.createElement("img");
		img.src = imgSrc;
		img.className = "content-image";

		// iOS/Safari can be a bit funny with lazy images inside transforms/overlays.
		// We still allow lazy when not lightbox, but keep decoding async.
		img.loading = useLightbox ? "eager" : "lazy";
		img.decoding = "async";

		// Accessibility: use caption/title as alt fallback.
		const altText =
			(caption && caption.trim()) ||
			(overlayTitle && overlayTitle.trim()) ||
			"Image";
		img.alt = altText;

		if (useLightbox) img.classList.add("js-lightbox");

		let titleText = (overlayTitle && overlayTitle.trim()) || "";
		let bodyText = (overlayText && overlayText.trim()) || "";
		if (overlayEnabled && !titleText && !bodyText && useLightbox) {
			bodyText = "Click to view";
		}

		if (overlayEnabled) {
			const overlay = el("div", "content-overlay");
			const details = el("div", "content-details fadeIn-bottom");

			if (titleText) {
				const h3 = document.createElement("h3");
				h3.className = "content-title";
				h3.textContent = titleText;
				details.appendChild(h3);
			}

			if (bodyText) {
				const p = document.createElement("p");
				p.className = "content-text";
				p.textContent = bodyText;
				details.appendChild(p);
			}

			content.appendChild(overlay);
			content.appendChild(img);
			if (titleText || bodyText) content.appendChild(details);
		} else {
			content.appendChild(img);
		}

		imgWrap.appendChild(content);

		// Caption under the polaroid frame (if provided)
		if (caption) {
			const p = document.createElement("p");
			p.textContent = caption;
			imgWrap.appendChild(p);
		}

		return imgWrap;
	}

	function buildVideoWrap(className, videoSrc, caption, scale) {
		const videoWrap = el("div", className);
		const scaleValue = String(scale || "").trim().toLowerCase();
		if (scaleValue && scaleValue !== "auto") {
			videoWrap.classList.add(`img-scale-${scaleValue}`);
		}

		if (!videoSrc) return videoWrap;

		const content = el("div", "content content--full");
		const embedSrc = getYouTubeEmbedSrc(videoSrc);
		if (!embedSrc) return videoWrap;

		const iframe = document.createElement("iframe");
		iframe.src = embedSrc;
		iframe.className = "content-video";
		iframe.loading = "lazy";
		iframe.allow =
			"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
		iframe.allowFullscreen = true;
		iframe.title = caption ? `Video: ${caption}` : "Embedded video";
		content.appendChild(iframe);
		videoWrap.appendChild(content);

		if (caption) {
			const p = document.createElement("p");
			p.textContent = caption;
			videoWrap.appendChild(p);
		}

		return videoWrap;
	}

	// Expand inline .img-stub elements anywhere in the document.
	function expandInlineImgStubs(root = document) {
		root.querySelectorAll(".img-stub[data-img]").forEach((stub) => {
			const imgSrc = stub.dataset.img || "";
			const caption = stub.dataset.caption || "";
			const useLightbox = isTrue(stub.dataset.lightbox);
			const overlayEnabled = stub.dataset.overlay !== "false";
			const overlayTitle = stub.dataset.overlayTitle || "";
			const overlayText = stub.dataset.overlayText || "";
			const scale = stub.dataset.scale || "";

			const size = (stub.dataset.size || "sml").toLowerCase();
			const className =
				size === "lrg" ? "lrg-img-text-div-img" : "img-text-div-img";

			const built = buildImgWrap(
				className,
				imgSrc,
				caption,
				useLightbox,
				overlayEnabled,
				overlayTitle,
				overlayText,
				scale,
			);

			// Replace stub with fully-rendered structure.
			stub.replaceWith(built);
		});
	}

	// Expand inline .video-stub elements anywhere in the document.
	function expandInlineVideoStubs(root = document) {
		root.querySelectorAll(".video-stub[data-video]").forEach((stub) => {
			const videoSrc = stub.dataset.video || "";
			const caption = stub.dataset.caption || "";
			const scale = stub.dataset.scale || "";

			const built = buildVideoWrap("img-text-div-img", videoSrc, caption, scale);
			stub.replaceWith(built);
		});
	}

	function normalizePortfolioKey(value) {
		return String(value || "")
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+/, "")
			.replace(/-+$/, "");
	}

	function normalizePortfolioBool(value, fallback) {
		if (value === undefined || value === null) return fallback;
		if (typeof value === "string")
			return String(value).toLowerCase() !== "false";
		return Boolean(value);
	}

	function normalizePortfolioTags(value) {
		const raw = Array.isArray(value) ? value : String(value || "").split(",");
		const seen = new Set();
		const output = [];
		raw.forEach((item) => {
			const tag = String(item || "").trim();
			if (!tag || seen.has(tag)) return;
			seen.add(tag);
			output.push(tag);
		});
		return output;
	}

	function normalizePortfolioHref(value) {
		const raw = String(value || "").trim();
		if (!raw) return "";
		if (raw.startsWith("/")) return raw;
		if (raw.startsWith("https://")) return raw;
		return "";
	}

	function normalizePortfolioLinks(value) {
		const raw = value && typeof value === "object" ? value : {};
		const keys = ["site", "github", "youtube", "facebook"];
		const output = {};
		keys.forEach((key) => {
			const href = normalizePortfolioHref(raw[key] || "");
			if (href) output[key] = href;
		});
		return output;
	}

	function normalizePortfolioGallery(value) {
		const raw = Array.isArray(value) ? value : [];
		const seen = new Set();
		const output = [];
		raw.forEach((item) => {
			let src =
				typeof item === "string" ? item : item?.src || item?.path || "";
			src = String(src || "").trim();
			if (!src) return;
			if (!src.startsWith("https://") && !src.startsWith("/")) {
				src = `/${src}`;
			}
			if (!src.startsWith("https://") && !src.startsWith("/assets/")) return;
			if (seen.has(src)) return;
			seen.add(src);
			output.push(src);
		});
		return output;
	}

	function stripHtml(value) {
		const raw = String(value || "");
		return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
	}

	function hashText(value) {
		const text = String(value || "");
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
		}
		return hash;
	}

	function getPortfolioTypeColor(typeKey) {
		if (!typeKey) return "";
		const base = {
			work: "#2563eb",
			academic: "#dc2626",
			personal: "#16a34a",
		};
		if (base[typeKey]) return base[typeKey];
		const hue = hashText(typeKey) % 360;
		return `hsl(${hue} 70% 42%)`;
	}

	function parseMonthYear(value) {
		const raw = String(value || "").trim();
		if (!raw) return null;
		const lower = raw.toLowerCase();
		if (
			lower === "present" ||
			lower === "current" ||
			lower === "on-going" ||
			lower === "ongoing"
		) {
			const now = new Date();
			return { year: now.getFullYear(), month: now.getMonth() + 1 };
		}
		const match = raw.match(/(\d{1,2})\D+(\d{4})/);
		if (!match) return null;
		const month = Math.max(1, Math.min(12, Number(match[1] || 0)));
		const year = Number(match[2] || 0);
		if (!year) return null;
		return { year, month };
	}

	function formatPortfolioDate(start, end) {
		const s = String(start || "").trim();
		const e = String(end || "").trim();
		if (s && e && s !== e) return `${s} - ${e}`;
		return s || e;
	}

	function isPortfolioCardEmpty(card) {
		const safe = card && typeof card === "object" ? card : {};
		const hasLinks =
			safe.links && typeof safe.links === "object"
				? Object.values(safe.links).some((value) => String(value || "").trim())
				: false;
		const hasTags = Array.isArray(safe.tags)
			? safe.tags.filter(Boolean).length > 0
			: false;
		const hasGallery = Array.isArray(safe.gallery)
			? safe.gallery.filter(Boolean).length > 0
			: false;
		return (
			!safe.title &&
			!safe.type &&
			!safe.start &&
			!safe.end &&
			!safe.summary &&
			!hasTags &&
			!hasLinks &&
			!hasGallery
		);
	}

	function parsePortfolioGridData(grid) {
		const maxAttr = Number(grid.getAttribute("data-max-visible"));
		const attrs = {
			maxVisible: Number.isFinite(maxAttr) ? maxAttr : 3,
			showSearch: grid.getAttribute("data-show-search") !== "false",
			showTypeFilters: grid.getAttribute("data-show-types") !== "false",
			showTagFilters: grid.getAttribute("data-show-tags") !== "false",
			showLinkFilters: grid.getAttribute("data-show-links") !== "false",
		};
		const headerEl = grid.querySelector(".portfolio-grid__header h1,h2,h3");
		const headerText = headerEl?.textContent?.trim() || "";
		const headerStyle = headerEl?.getAttribute("style") || "";
		const alignMatch = String(headerStyle).match(
			/text-align\s*:\s*(left|center)/i,
		);
		const headerAlign = alignMatch ? alignMatch[1].toLowerCase() : "";
		const introHtml = grid.querySelector(".portfolio-grid__intro")?.innerHTML || "";
		const script = grid.querySelector(
			'script[type="application/json"][data-cms="portfolio"]',
		);
		let data = null;
		if (script) {
			try {
				data = JSON.parse(script.textContent || "{}");
			} catch {
				data = null;
			}
		}
		const raw = data && typeof data === "object" ? data : {};
		let cards = Array.isArray(raw.cards) ? raw.cards : null;
		if (!cards) {
			cards = Array.from(grid.querySelectorAll(".portfolio-card")).map(
				(card) => {
					const links = {};
					card
						.querySelectorAll(".portfolio-card__icon[data-link]")
						.forEach((icon) => {
							const key = icon.getAttribute("data-link") || "";
							if (!key || key === "gallery") return;
							const href =
								icon.getAttribute("href") || icon.dataset.href || "";
							if (href) links[key] = href;
						});
					return {
						title:
							card
								.querySelector(".portfolio-card__title")
								?.textContent?.trim() || "",
						type:
							card.querySelector(".portfolio-card__type")?.textContent?.trim() ||
							card.getAttribute("data-type-label") ||
							"",
						start: card.getAttribute("data-start") || "",
						end: card.getAttribute("data-end") || "",
						summary:
							card
								.querySelector(".portfolio-card__summary")
								?.innerHTML?.trim() || "",
						tags: Array.from(
							card.querySelectorAll(".portfolio-card__tag"),
						).map((tag) => tag.textContent || ""),
						links,
						gallery: String(card.getAttribute("data-gallery") || "")
							.split(",")
							.map((item) => item.trim())
							.filter(Boolean),
					};
				},
			);
		}
		cards = Array.isArray(cards)
			? cards.filter((card) => !isPortfolioCardEmpty(card))
			: [];

		const maxVisible = Number(raw.maxVisible);
		return {
			title: raw.title ?? headerText,
			titleAlign: raw.titleAlign ?? headerAlign,
			intro: raw.intro ?? introHtml,
			maxVisible: Number.isFinite(maxVisible) ? maxVisible : attrs.maxVisible,
			showSearch: normalizePortfolioBool(raw.showSearch, attrs.showSearch),
			showTypeFilters: normalizePortfolioBool(
				raw.showTypeFilters,
				attrs.showTypeFilters,
			),
			showTagFilters: normalizePortfolioBool(
				raw.showTagFilters,
				attrs.showTagFilters,
			),
			showLinkFilters: normalizePortfolioBool(
				raw.showLinkFilters,
				attrs.showLinkFilters,
			),
			cards,
		};
	}

	function ensurePortfolioModal() {
		let modal = document.getElementById("portfolio-gallery-modal");
		if (modal) return modal;
		modal = document.createElement("div");
		modal.id = "portfolio-gallery-modal";
		modal.className = "modal portfolio-modal";
		modal.setAttribute("aria-hidden", "true");
		modal.innerHTML = [
			'<div class="modal-content portfolio-modal__content" role="dialog" aria-modal="true">',
			'<button class="portfolio-modal__close" type="button" data-portfolio-close aria-label="Close">×</button>',
			'<div class="portfolio-modal__header">',
			'<div class="portfolio-modal__title" id="portfolio-modal-title"></div>',
			'<div class="portfolio-modal__meta" id="portfolio-modal-meta"></div>',
			"</div>",
			'<div class="portfolio-modal__body">',
			'<div class="portfolio-modal__media">',
			'<button class="portfolio-modal__nav portfolio-modal__nav--prev" type="button" data-portfolio-prev aria-label="Previous image">&lt;</button>',
			'<img class="portfolio-modal__main" id="portfolio-modal-main" alt="" />',
			'<button class="portfolio-modal__nav portfolio-modal__nav--next" type="button" data-portfolio-next aria-label="Next image">&gt;</button>',
			"</div>",
			'<div class="portfolio-modal__thumbs" id="portfolio-modal-thumbs"></div>',
			"</div>",
			"</div>",
		].join("");
		document.body.appendChild(modal);
		modal.addEventListener("click", (event) => {
			if (event.target === modal) closePortfolioModal();
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") closePortfolioModal();
		});
		return modal;
	}

	let portfolioModalState = { images: [], index: 0, title: "", meta: "" };
	let portfolioScrollY = 0;
	let portfolioScrollLocked = false;
	let portfolioBodyStyles = null;

	const getPortfolioScrollTop = () =>
		document.scrollingElement
			? document.scrollingElement.scrollTop
			: window.scrollY || 0;

	const restorePortfolioScrollTop = () => {
		if (!Number.isFinite(portfolioScrollY)) return;
		const scroller = document.scrollingElement;
		if (scroller) scroller.scrollTop = portfolioScrollY;
		else window.scrollTo({ top: portfolioScrollY, left: 0, behavior: "auto" });
	};

	const lockPortfolioScroll = () => {
		if (portfolioScrollLocked) return;
		portfolioScrollY = getPortfolioScrollTop();
		const body = document.body;
		portfolioBodyStyles = body
			? {
					position: body.style.position || "",
					top: body.style.top || "",
					width: body.style.width || "",
				}
			: null;
		if (body) {
			body.style.position = "fixed";
			body.style.top = `-${portfolioScrollY}px`;
			body.style.width = "100%";
		}
		portfolioScrollLocked = true;
	};

	const unlockPortfolioScroll = () => {
		const body = document.body;
		if (body && portfolioBodyStyles) {
			body.style.position = portfolioBodyStyles.position;
			body.style.top = portfolioBodyStyles.top;
			body.style.width = portfolioBodyStyles.width;
		}
		portfolioBodyStyles = null;
		requestAnimationFrame(() => restorePortfolioScrollTop());
		portfolioScrollLocked = false;
	};

	function closePortfolioModal() {
		const modal = document.getElementById("portfolio-gallery-modal");
		if (!modal || !modal.classList.contains("is-open")) return;
		modal.classList.remove("is-open");
		document.documentElement.classList.remove("lb-lock");
		document.body.classList.remove("lb-lock");
		modal.setAttribute("aria-hidden", "true");
		unlockPortfolioScroll();
		portfolioModalState = { images: [], index: 0, title: "", meta: "" };
	}

	function openPortfolioModal({ title, meta, images }) {
		const modal = ensurePortfolioModal();
		const mainImg = modal.querySelector("#portfolio-modal-main");
		const titleEl = modal.querySelector("#portfolio-modal-title");
		const metaEl = modal.querySelector("#portfolio-modal-meta");
		const thumbs = modal.querySelector("#portfolio-modal-thumbs");
		const prevBtn = modal.querySelector("[data-portfolio-prev]");
		const nextBtn = modal.querySelector("[data-portfolio-next]");
		if (!mainImg || !titleEl || !metaEl || !thumbs) return;
		const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
		if (!safeImages.length) return;
		portfolioModalState = {
			images: safeImages,
			index: 0,
			title: title || "",
			meta: meta || "",
		};
		titleEl.textContent = portfolioModalState.title;
		metaEl.textContent = portfolioModalState.meta;
		thumbs.innerHTML = "";
		safeImages.forEach((src, idx) => {
			const thumb = document.createElement("img");
			thumb.src = src;
			thumb.alt = title || "Gallery image";
			thumb.dataset.idx = String(idx);
			thumb.addEventListener("click", (event) => {
				event.preventDefault();
				portfolioModalState.index = idx;
				updatePortfolioModal();
			});
			thumbs.appendChild(thumb);
		});
		updatePortfolioModal();
		lockPortfolioScroll();
		modal.classList.add("is-open");
		document.documentElement.classList.add("lb-lock");
		document.body.classList.add("lb-lock");
		modal.setAttribute("aria-hidden", "false");
		const closeBtn = modal.querySelector("[data-portfolio-close]");
		if (closeBtn) closeBtn.addEventListener("click", closePortfolioModal);
		if (prevBtn) {
			prevBtn.onclick = (event) => {
				event.preventDefault();
				stepPortfolioModal(-1);
			};
		}
		if (nextBtn) {
			nextBtn.onclick = (event) => {
				event.preventDefault();
				stepPortfolioModal(1);
			};
		}
	}

	function updatePortfolioModal() {
		const modal = document.getElementById("portfolio-gallery-modal");
		if (!modal) return;
		const mainImg = modal.querySelector("#portfolio-modal-main");
		const thumbs = modal.querySelector("#portfolio-modal-thumbs");
		const prevBtn = modal.querySelector("[data-portfolio-prev]");
		const nextBtn = modal.querySelector("[data-portfolio-next]");
		if (!mainImg || !thumbs) return;
		const images = portfolioModalState.images || [];
		const idx = Math.max(
			0,
			Math.min(portfolioModalState.index, images.length - 1),
		);
		mainImg.src = images[idx] || "";
		mainImg.alt = portfolioModalState.title || "Gallery image";
		if (prevBtn && nextBtn) {
			const disabled = images.length <= 1;
			prevBtn.disabled = disabled;
			nextBtn.disabled = disabled;
		}
		thumbs.querySelectorAll("img").forEach((thumb) => {
			thumb.classList.toggle("is-active", thumb.dataset.idx === String(idx));
		});
	}

	function stepPortfolioModal(delta) {
		const images = portfolioModalState.images || [];
		if (images.length <= 1) return;
		const next =
			(portfolioModalState.index + delta + images.length) % images.length;
		portfolioModalState.index = next;
		updatePortfolioModal();
	}

	function initPortfolioGrids(root = document) {
		root.querySelectorAll(".portfolio-grid").forEach((grid) => {
			const data = parsePortfolioGridData(grid);
			const cards = (data.cards || []).map((card) => {
				const title = String(card.title || "").trim();
				const type = String(card.type || "").trim();
				const typeKey = normalizePortfolioKey(type);
				const tags = normalizePortfolioTags(card.tags);
				const tagKeys = tags.map((tag) => normalizePortfolioKey(tag));
				const summary = String(card.summary || "").trim();
				const summaryText = stripHtml(summary);
				const links = normalizePortfolioLinks(card.links);
				const gallery = normalizePortfolioGallery(card.gallery);
				const linkKeys = Array.from(
					new Set([
						...Object.keys(links || {}),
						...(gallery.length ? ["gallery"] : []),
					]),
				);
				const dateValue =
					parseMonthYear(card.end || "") || parseMonthYear(card.start || "");
				const sortValue = dateValue
					? dateValue.year * 100 + dateValue.month
					: 0;
				const searchText = [title, summaryText, type, tags.join(" ")]
					.join(" ")
					.toLowerCase();
				return {
					title,
					type,
					typeKey,
					start: String(card.start || "").trim(),
					end: String(card.end || "").trim(),
					summary,
					tags,
					tagKeys,
					links,
					gallery,
					linkKeys,
					sortValue,
					searchText,
				};
			});
			const cardsWrap =
				grid.querySelector(".portfolio-grid__cards") ||
				grid.appendChild(el("div", "portfolio-grid__cards"));
			const controlsWrap =
				grid.querySelector(".portfolio-grid__controls") ||
				grid.insertBefore(el("div", "portfolio-grid__controls"), cardsWrap);
			const filtersWrap =
				grid.querySelector(".portfolio-grid__filters") ||
				grid.insertBefore(el("div", "portfolio-grid__filters"), cardsWrap);
			const anchor = controlsWrap || filtersWrap || cardsWrap;

			const renderHeader = () => {
				const title = String(data.title || "").trim();
				let header = grid.querySelector(".portfolio-grid__header");
				if (!title) {
					if (header) header.remove();
					return;
				}
				if (!header) {
					header = el("div", "portfolio-grid__header");
					grid.insertBefore(header, anchor);
				}
				header.innerHTML = "";
				const h2 = document.createElement("h2");
				h2.textContent = title;
				const align = String(data.titleAlign || "").toLowerCase();
				if (align === "left" || align === "center") {
					h2.style.textAlign = align;
				}
				header.appendChild(h2);
			};

			const renderIntro = () => {
				const introRaw = String(data.intro || "").trim();
				let intro = grid.querySelector(".portfolio-grid__intro");
				if (!introRaw) {
					if (intro) intro.remove();
					return;
				}
				if (!intro) {
					intro = el("div", "portfolio-grid__intro");
					grid.insertBefore(intro, anchor);
				}
				if (/<[a-z][\s\S]*>/i.test(introRaw)) {
					intro.innerHTML = introRaw;
				} else {
					intro.innerHTML = "";
					const p = document.createElement("p");
					p.textContent = introRaw;
					intro.appendChild(p);
				}
			};

			const renderDivider = () => {
				const needsDivider = Boolean(
					String(data.title || "").trim() || String(data.intro || "").trim(),
				);
				let divider = grid.querySelector(".portfolio-grid__divider");
				if (!needsDivider) {
					if (divider) divider.remove();
					return;
				}
				if (!divider) {
					divider = el("div", "portfolio-grid__divider");
					grid.insertBefore(divider, anchor);
				}
			};

			renderHeader();
			renderIntro();
			renderDivider();

			const allTypes = Array.from(
				new Set(cards.map((card) => card.type).filter(Boolean)),
			).sort((a, b) => a.localeCompare(b));
			const allTags = Array.from(
				new Set(cards.flatMap((card) => card.tags)),
			).sort((a, b) => a.localeCompare(b));
			const linkOrder = ["site", "github", "youtube", "facebook", "gallery"];
			const githubSvg =
				'<svg class="portfolio-icon portfolio-icon--github" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0.3c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4 0.6 0.1 0.8-0.3 0.8-0.6v-2.2c-3.3 0.7-4-1.4-4-1.4-0.5-1.3-1.2-1.7-1.2-1.7-1-0.7 0.1-0.7 0.1-0.7 1.1 0.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 0.9 0.1-0.7 0.4-1.2 0.7-1.5-2.6-0.3-5.4-1.3-5.4-5.9 0-1.3 0.5-2.4 1.2-3.2-0.1-0.3-0.5-1.5 0.1-3.1 0 0 1-0.3 3.3 1.2 1-0.3 2-0.4 3-0.4s2.1 0.1 3 0.4c2.3-1.5 3.3-1.2 3.3-1.2 0.6 1.6 0.2 2.8 0.1 3.1 0.8 0.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9 0.4 0.4 0.8 1 0.8 2v3c0 0.3 0.2 0.7 0.8 0.6 4.8-1.6 8.2-6.1 8.2-11.4 0-6.6-5.4-12-12-12z"/></svg>';
			const linkIconMap = {
				site: { icon: "link", label: "Website" },
				github: { icon: "github", label: "GitHub" },
				youtube: { icon: "smart_display", label: "YouTube" },
				facebook: { icon: "chat_bubble", label: "Message" },
				gallery: { icon: "collections", label: "Gallery" },
			};
			const allLinkKeys = linkOrder.filter((key) =>
				cards.some((card) => card.linkKeys.includes(key)),
			);

			let activeType = "";
			const activeTags = new Set();
			const activeLinks = new Set();
			let searchTerm = "";

			const updateFilterUi = () => {
				filtersWrap
					.querySelectorAll(".portfolio-filter-pill[data-type]")
					.forEach((pill) => {
						const key = normalizePortfolioKey(pill.dataset.type || "");
						pill.classList.toggle("is-active", key === activeType);
					});
				filtersWrap
					.querySelectorAll(".portfolio-filter-pill[data-tag]")
					.forEach((pill) => {
						const key = normalizePortfolioKey(pill.dataset.tag || "");
						pill.classList.toggle("is-active", activeTags.has(key));
					});
				filtersWrap
					.querySelectorAll(".portfolio-filter-icon[data-link]")
					.forEach((btn) => {
						const key = btn.dataset.link || "";
						btn.classList.toggle("is-active", activeLinks.has(key));
					});
			};

			const buildPortfolioCard = (card, onTagClick) => {
				const cardEl = el("article", "portfolio-card");
				cardEl.dataset.type = card.typeKey || "";
				cardEl.dataset.typeLabel = card.type || "";
				cardEl.dataset.tags = card.tags.join(", ");
				cardEl.dataset.start = card.start || "";
				cardEl.dataset.end = card.end || "";
				cardEl.dataset.gallery = card.gallery.join(",");
				const typeColor = getPortfolioTypeColor(card.typeKey);
				if (typeColor) cardEl.style.setProperty("--portfolio-type-bg", typeColor);

				const head = el("div", "portfolio-card__head");
				const headInfo = document.createElement("div");
				const title = el("div", "portfolio-card__title");
				title.textContent = card.title || "";
				const date = el("div", "portfolio-card__date");
				date.textContent = formatPortfolioDate(card.start, card.end);
				headInfo.appendChild(title);
				headInfo.appendChild(date);
				const icons = el("div", "portfolio-card__icons");

				linkOrder.forEach((key) => {
					if (key === "gallery") return;
					const meta = linkIconMap[key];
					if (!meta) return;
					const href = card.links[key];
					if (!href) return;
					const link = document.createElement("a");
					link.className = `portfolio-card__icon portfolio-card__icon--${key}`;
					link.href = href;
					link.target = "_blank";
					link.rel = "noopener noreferrer";
					link.dataset.link = key;
					link.dataset.tooltip = meta.label;
					link.setAttribute("aria-label", meta.label);
					if (meta.icon === "github") link.innerHTML = githubSvg;
					else {
						const span = el("span", "material-icons");
						span.textContent = meta.icon;
						link.appendChild(span);
					}
					icons.appendChild(link);
				});
				if (card.gallery.length) {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "portfolio-card__icon portfolio-card__icon--gallery";
					btn.dataset.link = "gallery";
					btn.dataset.tooltip = "Gallery";
					btn.setAttribute("aria-label", "Gallery");
					const span = el("span", "material-icons");
					span.textContent = "collections";
					btn.appendChild(span);
					btn.addEventListener("click", () => {
						openPortfolioModal({
							title: card.title || "Gallery",
							meta: formatPortfolioDate(card.start, card.end),
							images: card.gallery,
						});
					});
					icons.appendChild(btn);
				}

				head.appendChild(headInfo);
				head.appendChild(icons);

				const typeBadge = el("div", "portfolio-card__type");
				typeBadge.textContent = card.type || "";

				const summary = el("div", "portfolio-card__summary");
				if (card.summary) {
					if (/<[a-z][\s\S]*>/i.test(card.summary)) {
						summary.innerHTML = card.summary;
					} else {
						const summaryParts = card.summary
							.split(/\n{2,}/)
							.map((part) => part.trim())
							.filter(Boolean);
						summaryParts.forEach((part) => {
							const p = document.createElement("p");
							const lines = part.split("\n");
							lines.forEach((line, idx) => {
								if (idx > 0) p.appendChild(document.createElement("br"));
								p.appendChild(document.createTextNode(line));
							});
							summary.appendChild(p);
						});
					}
				}

				const tagWrap = el("div", "portfolio-card__tags");
				card.tags.forEach((tag, idx) => {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "portfolio-card__tag";
					btn.dataset.tag = tag;
					btn.textContent = tag;
					btn.addEventListener("click", () => {
						if (typeof onTagClick === "function") {
							onTagClick(card.tagKeys[idx]);
						}
					});
					tagWrap.appendChild(btn);
				});

				const hasSummary = Boolean(card.summary);
				const hasTags = Boolean(card.tags.length);
				const makeDivider = () => el("div", "portfolio-card__divider");
				cardEl.appendChild(head);
				cardEl.appendChild(typeBadge);
				if (hasSummary) {
					cardEl.appendChild(makeDivider());
					cardEl.appendChild(summary);
				}
				if (hasTags) {
					if (hasSummary || card.type) cardEl.appendChild(makeDivider());
					cardEl.appendChild(tagWrap);
				}
				return cardEl;
			};

			const renderCards = (list) => {
				cardsWrap.innerHTML = "";
				if (!list.length) {
					const empty = el("div", "portfolio-grid__empty");
					empty.textContent = "No projects match your filters.";
					cardsWrap.appendChild(empty);
					return;
				}
				list.forEach((card) => {
					cardsWrap.appendChild(
						buildPortfolioCard(card, (tagKey) => {
							if (!tagKey) return;
							if (activeTags.has(tagKey)) activeTags.delete(tagKey);
							else activeTags.add(tagKey);
							applyFilters();
						}),
					);
				});
			};

			const applyFilters = () => {
				const normalizedSearch = String(searchTerm || "")
					.trim()
					.toLowerCase();
				const sorted = cards.slice().sort((a, b) => b.sortValue - a.sortValue);
				let filtered = sorted;
				if (activeType) {
					filtered = filtered.filter((card) => card.typeKey === activeType);
				}
				if (activeTags.size) {
					const required = Array.from(activeTags);
					filtered = filtered.filter((card) =>
						required.every((tag) => card.tagKeys.includes(tag)),
					);
				}
				if (activeLinks.size) {
					const required = Array.from(activeLinks);
					filtered = filtered.filter((card) =>
						required.every((key) => card.linkKeys.includes(key)),
					);
				}
				if (normalizedSearch) {
					filtered = filtered.filter((card) =>
						card.searchText.includes(normalizedSearch),
					);
				}
				if (
					!activeType &&
					!activeTags.size &&
					!activeLinks.size &&
					!normalizedSearch
				) {
					const limit =
						Number.isFinite(data.maxVisible) && data.maxVisible > 0
							? data.maxVisible
							: sorted.length;
					filtered = sorted.slice(0, limit);
				}
				renderCards(filtered);
				updateFilterUi();
			};

			const buildSearch = () => {
				controlsWrap.innerHTML = "";
				if (!data.showSearch) return;
				const input = document.createElement("input");
				input.type = "search";
				input.className = "portfolio-grid__search-input";
				input.placeholder = "Search projects";
				input.setAttribute("aria-label", "Search projects");
				input.addEventListener("input", () => {
					searchTerm = input.value;
					applyFilters();
				});
				const wrap = el("div", "portfolio-grid__search");
				wrap.appendChild(input);
				controlsWrap.appendChild(wrap);
			};

			const buildFilters = () => {
				filtersWrap.innerHTML = "";
				const showTypes = data.showTypeFilters && allTypes.length;
				const showTags = data.showTagFilters && allTags.length;
				const showLinks = data.showLinkFilters && allLinkKeys.length;
				if (!showTypes && !showTags && !showLinks) return;

				const title = el("div", "portfolio-grid__filters-title");
				title.textContent = "Filters";
				filtersWrap.appendChild(title);

				if (showTypes) {
					const row = el("div", "portfolio-grid__filter-row");
					row.dataset.filterRow = "type";
					const label = el("div", "portfolio-grid__filter-label");
					label.textContent = "Categories";
					const group = el("div", "portfolio-grid__filter-group");
					group.dataset.filter = "type";
					const allBtn = el("button", "portfolio-filter-pill");
					allBtn.type = "button";
					allBtn.dataset.type = "";
					allBtn.textContent = "All";
					allBtn.addEventListener("click", () => {
						activeType = "";
						applyFilters();
					});
					group.appendChild(allBtn);
					allTypes.forEach((type) => {
						const btn = el("button", "portfolio-filter-pill");
						btn.type = "button";
						btn.dataset.type = type;
						btn.textContent = type;
						btn.addEventListener("click", () => {
							const key = normalizePortfolioKey(type);
							activeType = activeType === key ? "" : key;
							applyFilters();
						});
						group.appendChild(btn);
					});
					row.appendChild(label);
					row.appendChild(group);
					filtersWrap.appendChild(row);
				}

				if (showTags) {
					const row = el("div", "portfolio-grid__filter-row");
					row.dataset.filterRow = "tag";
					const label = el("div", "portfolio-grid__filter-label");
					label.textContent = "Skills";
					const group = el("div", "portfolio-grid__filter-group");
					group.dataset.filter = "tag";
					allTags.forEach((tag) => {
						const btn = el("button", "portfolio-filter-pill");
						btn.type = "button";
						btn.dataset.tag = tag;
						btn.textContent = tag;
						btn.addEventListener("click", () => {
							const key = normalizePortfolioKey(tag);
							if (activeTags.has(key)) activeTags.delete(key);
							else activeTags.add(key);
							applyFilters();
						});
						group.appendChild(btn);
					});
					row.appendChild(label);
					row.appendChild(group);
					filtersWrap.appendChild(row);
				}

				if (showLinks) {
					const row = el("div", "portfolio-grid__filter-row");
					row.dataset.filterRow = "link";
					const label = el("div", "portfolio-grid__filter-label");
					label.textContent = "Links";
					const group = el("div", "portfolio-grid__filter-group");
					group.dataset.filter = "link";
					allLinkKeys.forEach((key) => {
						const meta = linkIconMap[key];
						if (!meta) return;
						const btn = el(
							"button",
							`portfolio-filter-icon portfolio-filter-icon--${key}`,
						);
						btn.type = "button";
						btn.dataset.link = key;
						btn.dataset.tooltip = meta.label;
						btn.setAttribute("aria-label", meta.label);
						if (meta.icon === "github") btn.innerHTML = githubSvg;
						else {
							const span = el("span", "material-icons");
							span.textContent = meta.icon;
							btn.appendChild(span);
						}
						btn.addEventListener("click", () => {
							if (activeLinks.has(key)) activeLinks.delete(key);
							else activeLinks.add(key);
							applyFilters();
						});
						group.appendChild(btn);
					});
					row.appendChild(label);
					row.appendChild(group);
					filtersWrap.appendChild(row);
				}
			};

			buildSearch();
			buildFilters();
			applyFilters();
		});
	}

	// Small image / big text.
	function sectionImgText(stub) {
		const imgSrc = stub.dataset.img || "";
		const caption = stub.dataset.caption || "";
		const useLightbox = isTrue(stub.dataset.lightbox);
		const pos = (stub.dataset.imgPos || "left").toLowerCase();
		const overlayEnabled = stub.dataset.overlay !== "false";

		const overlayTitle = stub.dataset.overlayTitle || "";
		const overlayText = stub.dataset.overlayText || "";
		const scale = stub.dataset.scale || "";

		const grid = el("div", "img-text-div-wrapper");
		if (pos === "right") grid.classList.add("reverse");

		const imgCol = buildImgWrap(
			"img-text-div-img",
			imgSrc,
			caption,
			useLightbox,
			overlayEnabled,
			overlayTitle,
			overlayText,
			scale,
		);

		const textCol = el("div", "img-text-div-text");
		moveAllChildren(stub, textCol);

		if (pos === "right") {
			grid.appendChild(textCol);
			if (imgSrc) grid.appendChild(imgCol);
		} else {
			if (imgSrc) grid.appendChild(imgCol);
			grid.appendChild(textCol);
		}

		return wrapInDivWrapper(grid);
	}

	// 50/50 split.
	function sectionSplit50(stub) {
		const imgSrc = stub.dataset.img || "";
		const caption = stub.dataset.caption || "";
		const useLightbox = isTrue(stub.dataset.lightbox);
		const overlayEnabled = stub.dataset.overlay !== "false";

		// DEFAULT = LEFT
		const pos = (stub.dataset.imgPos || "left").toLowerCase();

		const overlayTitle = stub.dataset.overlayTitle || "";
		const overlayText = stub.dataset.overlayText || "";
		const scale = stub.dataset.scale || "";

		const grid = el("div", "lrg-img-text-div-wrapper");

		// Keeps your CSS hooks working for mobile separators.
		if (pos === "left") grid.classList.add("img-left");

		const imgCol = buildImgWrap(
			"lrg-img-text-div-img",
			imgSrc,
			caption,
			useLightbox,
			overlayEnabled,
			overlayTitle,
			overlayText,
			scale,
		);

		const textCol = el("div", "lrg-img-text-div-text");
		moveAllChildren(stub, textCol);

		if (pos === "right") {
			grid.appendChild(textCol);
			if (imgSrc) grid.appendChild(imgCol);
		} else {
			if (imgSrc) grid.appendChild(imgCol);
			grid.appendChild(textCol);
		}

		return wrapInDivWrapper(grid);
	}

	// Two text columns.
	function sectionTwoCol(stub) {
		const wrapper = el("div", "two-text-columns-wrapper");

		const leftCol = el("div", "two-text-columns-text-left");
		const rightCol = el("div", "two-text-columns-text-right");

		const leftSrc = stub.querySelector('[data-col="left"]');
		const rightSrc = stub.querySelector('[data-col="right"]');

		if (leftSrc) moveAllChildren(leftSrc, leftCol);
		if (rightSrc) moveAllChildren(rightSrc, rightCol);

		wrapper.appendChild(leftCol);
		wrapper.appendChild(rightCol);

		return wrapInDivWrapper(wrapper);
	}

	function convertStub(stub) {
		const type = (stub.dataset.type || "").trim();
		let built = null;
		if (type === "imgText") built = sectionImgText(stub);
		else if (type === "split50") built = sectionSplit50(stub);
		else if (type === "twoCol") built = sectionTwoCol(stub);
		if (!built) return null;

		// Preserve CMS IDs for admin parity (runSections replaces the stub).
		const cmsId = stub.getAttribute("data-cms-id") || "";
		if (cmsId && built instanceof Element) {
			built.setAttribute("data-cms-id", cmsId);
		}
		return built;
	}

	// Optional: tidy up any plain <img class="js-lightbox"> so it behaves consistently.
	// (Doesn't change layout; just keeps loading/decoding predictable.)
	function normalizePlainLightboxImgs(root = document) {
		root.querySelectorAll("img.js-lightbox").forEach((img) => {
			if (!img.loading) img.loading = "eager";
			if (!img.decoding) img.decoding = "async";
		});
	}

	function run() {
		// Expand section stubs first (they may contain inline img-stubs inside their text)
		document.querySelectorAll(".section[data-type]").forEach((stub) => {
			const built = convertStub(stub);
			if (!built) return;
			stub.parentNode.replaceChild(built, stub);
		});

		// Then expand inline image stubs anywhere (including inside twoCol)
		expandInlineImgStubs(document);
		expandInlineVideoStubs(document);
		initPortfolioGrids(document);

		// Finally, normalize any raw js-lightbox <img> (used by square grids etc.)
		normalizePlainLightboxImgs(document);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", run);
	} else {
		run();
	}
	window.runSections = run;
})();
