(function () {

	const DOC_MODAL_ID = "docModal";
	const DOC_LOCK_CLASS = "lb-lock";
	const ICON_MAP = [
		{ exts: ["pdf"], icon: "picture_as_pdf", label: "PDF" },
		{ exts: ["doc", "docx"], icon: "description", label: "Word" },
		{ exts: ["xls", "xlsx", "csv"], icon: "table_chart", label: "Spreadsheet" },
		{ exts: ["ppt", "pptx"], icon: "slideshow", label: "Slides" },
		{ exts: ["md", "txt", "rtf"], icon: "code", label: "Text" },
		{ exts: ["zip", "rar", "7z"], icon: "archive", label: "Archive" },
	];

	const qs = (sel, root = document) => root.querySelector(sel);

	const getDocExt = (href) => {
		const raw = String(href || "").trim();
		if (!raw) return "";
		const clean = raw.split("?")[0].split("#")[0];
		const parts = clean.split(".");
		return parts.length > 1 ? parts.pop().toLowerCase() : "";
	};

	const pickDocIcon = (ext) => {
		for (const entry of ICON_MAP) {
			if (entry.exts.includes(ext)) return entry;
		}
		return { icon: "insert_drive_file", label: "Document" };
	};

	const ensureModal = () => {
		let modal = document.getElementById(DOC_MODAL_ID);
		if (modal) return modal;
		modal = document.createElement("div");
		modal.id = DOC_MODAL_ID;
		modal.className = "modal doc-modal";
		modal.setAttribute("aria-hidden", "true");
		modal.innerHTML = [
			'<div class="modal-content doc-modal__content">',
			'<button class="cursor close" type="button" data-doc-close aria-label="Close">&times;</button>',
			'<div class="doc-modal__title" id="doc-modal-title"></div>',
			'<iframe class="doc-modal__frame" id="doc-modal-frame" src="" title="" loading="lazy"></iframe>',
			"</div>",
		].join("");
		document.body.appendChild(modal);
		return modal;
	};

	const openModal = ({ href, title }) => {
		const modal = ensureModal();
		const frame = qs("#doc-modal-frame", modal);
		const label = qs("#doc-modal-title", modal);
		if (label) label.textContent = title || "Document preview";
		if (frame) {
			frame.setAttribute("title", title || "Document preview");
			frame.src = href || "";
		}
		modal.classList.add("is-open");
		document.documentElement.classList.add(DOC_LOCK_CLASS);
		document.body.classList.add(DOC_LOCK_CLASS);
		modal.setAttribute("aria-hidden", "false");
	};

	const closeModal = () => {
		const modal = document.getElementById(DOC_MODAL_ID);
		if (!modal) return;
		const frame = qs("#doc-modal-frame", modal);
		if (frame) frame.src = "";
		modal.classList.remove("is-open");
		document.documentElement.classList.remove(DOC_LOCK_CLASS);
		document.body.classList.remove(DOC_LOCK_CLASS);
		modal.setAttribute("aria-hidden", "true");
	};

	const applyDocCardMeta = (card) => {
		const link = card.querySelector(".doc-card__link");
		if (!link) return;
		const href = link.getAttribute("href") || "";
		const ext = getDocExt(href);
		card.dataset.docExt = ext || "";
		const icon = pickDocIcon(ext);
		const typeIcon = card.querySelector(".doc-card__type-icon");
		if (typeIcon) typeIcon.textContent = icon.icon;
		const overlayLabel = card.querySelector(".doc-card__overlay-label");
		if (overlayLabel) {
			overlayLabel.textContent = ext === "pdf" ? "Open PDF" : "Open document";
		}
	};

	const scanDocCards = () => {
		document.querySelectorAll(".doc-card").forEach((card) => {
			applyDocCardMeta(card);
		});
	};

	const observeDocCards = () => {
		const root = document.body;
		if (!root || !window.MutationObserver) return;
		const observer = new MutationObserver((mutations) => {
			const next = new Set();
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (!(node instanceof HTMLElement)) return;
					if (node.classList.contains("doc-card")) next.add(node);
					node.querySelectorAll?.(".doc-card").forEach((card) => next.add(card));
				});
				if (
					mutation.type === "attributes" &&
					mutation.target?.closest?.(".doc-card")
				) {
					next.add(mutation.target.closest(".doc-card"));
				}
			});
			next.forEach((card) => applyDocCardMeta(card));
		});
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["href"],
		});
	};

	document.addEventListener("click", (event) => {
		const target = event.target.closest(".doc-card__link");
		if (!target) return;
		if (event.defaultPrevented) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const href = target.getAttribute("href") || "";
		const ext = getDocExt(href);
		if (ext !== "pdf") return;
		event.preventDefault();
		const title =
			target.querySelector(".doc-card__title")?.textContent?.trim() || "Document";
		openModal({ href, title });
	});

	document.addEventListener("click", (event) => {
		const modal = document.getElementById(DOC_MODAL_ID);
		if (!modal) return;
		if (event.target.closest("[data-doc-close]")) {
			closeModal();
			return;
		}
		if (event.target === modal) closeModal();
	});

	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		const modal = document.getElementById(DOC_MODAL_ID);
		if (!modal || !modal.classList.contains("is-open")) return;
		closeModal();
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			scanDocCards();
			observeDocCards();
		});
	} else {
		scanDocCards();
		observeDocCards();
	}
})();
