// sections.js
// Expands <div class="section" data-type="..."> stubs into EXISTING div/class structure.
// Also expands inline media stubs: <div class="img-stub" ...></div>
//
// IMPORTANT:
// - This file is the *only* renderer for stub expansion.
// - Divider/doc/grid/hover-cards are already final HTML and are intentionally ignored.
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
		if (type === "imgText") return sectionImgText(stub);
		if (type === "split50") return sectionSplit50(stub);
		if (type === "twoCol") return sectionTwoCol(stub);
		return null;
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
