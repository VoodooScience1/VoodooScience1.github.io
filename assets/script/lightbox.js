(() => {
	let items = [];
	let index = 0;

	// Thumbs: build once per open, then just toggle active class
	let thumbsBuilt = false;

	// Preload to reduce flicker
	const cache = new Map(); // src -> Promise<HTMLImageElement>

	function qs(sel, root = document) {
		return root.querySelector(sel);
	}
	function qsa(sel, root = document) {
		return Array.from(root.querySelectorAll(sel));
	}

	function getModal() {
		// If duplicates ever happen, take the LAST one (most recently injected)
		const all = document.querySelectorAll("#myModal");
		return all.length ? all[all.length - 1] : null;
	}

	function rebuildItems() {
		// Collect all images that should open the lightbox
		items = qsa("img.js-lightbox").map((img) => ({
			src: img.getAttribute("src"),
			alt: img.getAttribute("alt") || "",
		}));
	}

	function preload(src) {
		if (!src) return Promise.reject(new Error("No src"));
		if (!cache.has(src)) {
			cache.set(
				src,
				new Promise((resolve, reject) => {
					const im = new Image();
					im.onload = () => resolve(im);
					im.onerror = reject;
					im.src = src;
				}),
			);
		}
		return cache.get(src);
	}

	function openAt(i) {
		const modal = getModal();
		if (!modal) {
			console.warn("Lightbox: #myModal not found");
			return;
		}

		rebuildItems();
		thumbsBuilt = false;
		if (!items.length) return;

		index = Math.max(0, Math.min(i, items.length - 1));
		modal.classList.add("is-open");
		document.documentElement.classList.add("lb-lock");
		document.body.classList.add("lb-lock");
		modal.setAttribute("aria-hidden", "false");

		render();
	}

	function close() {
		const modal = getModal();
		if (!modal) return;

		modal.classList.remove("is-open");
		document.documentElement.classList.remove("lb-lock");
		document.body.classList.remove("lb-lock");
		modal.setAttribute("aria-hidden", "true");
	}

	function next(n = 1) {
		if (!items.length) return;
		index = (index + n + items.length) % items.length;
		render();
	}

	function buildThumbs(modal) {
		const thumbsWrap = qs("#lb-thumbs", modal);
		if (!thumbsWrap) return;

		thumbsWrap.innerHTML = "";
		items.forEach((it, i) => {
			const t = document.createElement("img");
			t.src = it.src;
			t.alt = it.alt;
			t.dataset.i = String(i);

			t.addEventListener("click", (evt) => {
				evt.preventDefault();
				evt.stopPropagation(); // stops backdrop-close logic
				index = i;
				render();
			});

			thumbsWrap.appendChild(t);
		});

		thumbsBuilt = true;
	}

	function updateThumbActive(modal) {
		const thumbsWrap = qs("#lb-thumbs", modal);
		if (!thumbsWrap) return;

		thumbsWrap.querySelectorAll("img").forEach((img) => {
			img.classList.toggle("is-active", img.dataset.i === String(index));
		});
	}

	function render() {
		const modal = getModal();
		if (!modal) return;

		const mainImg = qs("#lb-main-img", modal);
		const caption = qs("#caption", modal);
		const number = qs("#lb-number", modal);

		if (!mainImg || !caption || !number) return;

		if (!items.length) return;
		const item = items[index];
		const src = item?.src;

		// Build thumbs once per open, then only toggle active class
		if (!thumbsBuilt) buildThumbs(modal);
		updateThumbActive(modal);

		caption.textContent = item.alt || "";
		number.textContent = `${index + 1} / ${items.length}`;

		// Fade swap to reduce flicker
		mainImg.style.opacity = "0";

		preload(src)
			.then(() => {
				// only swap if we're still on the same image by the time it loads
				if (items[index]?.src !== src) return;

				mainImg.src = src;
				mainImg.alt = item.alt || "";

				requestAnimationFrame(() => {
					mainImg.style.opacity = "1";
				});
			})
			.catch(() => {
				// If preload fails, still try to show something
				mainImg.src = src || "";
				mainImg.alt = item.alt || "";
				mainImg.style.opacity = "1";
			});
	}

	function bind() {
		let sx = 0,
			sy = 0;

		// Swipe listeners ONCE (NOT inside click)
		document.addEventListener(
			"touchstart",
			(e) => {
				const modal = getModal();
				if (!modal || !modal.classList.contains("is-open")) return;
				const t = e.touches[0];
				sx = t.clientX;
				sy = t.clientY;
			},
			{ passive: true },
		);

		document.addEventListener(
			"touchend",
			(e) => {
				const modal = getModal();
				if (!modal || !modal.classList.contains("is-open")) return;
				const t = e.changedTouches[0];
				const dx = t.clientX - sx;
				const dy = t.clientY - sy;

				if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
					if (dx < 0) next(1);
					else next(-1);
				}
			},
			{ passive: true },
		);

		// Click any js-lightbox image to open + controls + backdrop-close
		document.addEventListener("click", (e) => {
			const img = e.target.closest("img.js-lightbox");
			if (img) {
				e.preventDefault();
				const all = qsa("img.js-lightbox");
				const i = all.indexOf(img);
				openAt(i >= 0 ? i : 0);
				return;
			}

			if (e.target.closest("[data-lb-close]")) {
				e.preventDefault();
				close();
				return;
			}
			if (e.target.closest("[data-lb-prev]")) {
				e.preventDefault();
				next(-1);
				return;
			}
			if (e.target.closest("[data-lb-next]")) {
				e.preventDefault();
				next(1);
				return;
			}

			const modal = getModal();
			if (modal && modal.classList.contains("is-open")) {
				// ONLY close on actual backdrop click
				if (e.target === modal) close();
			}
		});

		// Esc closes, arrows navigate
		document.addEventListener("keydown", (e) => {
			const modal = getModal();
			if (!modal || !modal.classList.contains("is-open")) return;

			if (e.key === "Escape") close();
			if (e.key === "ArrowLeft") next(-1);
			if (e.key === "ArrowRight") next(1);
		});
	}

	let bound = false;

	function initLightbox() {
		if (bound) return;
		bound = true;
		bind();
	}

	// expose for your dom-loader to call explicitly (optional but nice)
	window.initLightbox = initLightbox;

	// run immediately if DOM is already ready (because dom-loader loads this late)
	if (document.readyState === "loading") {
		window.addEventListener("DOMContentLoaded", initLightbox, { once: true });
	} else {
		initLightbox();
	}
})();
