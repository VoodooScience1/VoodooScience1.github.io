// sections-old-classes.js
// Expands <div class="section" data-type="..."> stubs into your EXISTING div/class structure.
// Adds hover-overlay inside polaroids (reuses your .content overlay CSS).
//
// Supported:
//  - data-type="imgText"
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default left)
//  - data-type="split50"
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default right)
//  - data-type="right"
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default right)
//  - data-type="twoCol"
//      expects:
//        <div data-col="left"> ... </div>
//        <div data-col="right"> ... </div>
//
// Optional hover text (otherwise falls back to caption / “Click to view”):
//  - data-overlay-title="..."
//  - data-overlay-text="..."

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

  function moveAllChildren(fromEl, toEl) {
    toArray(fromEl.childNodes).forEach((n) => toEl.appendChild(n));
  }

  function wrapInDivWrapper(inner) {
    const outer = el("div", "div-wrapper");
    outer.appendChild(inner);
    return outer;
  }

  // Polaroid wrapper stays as .img-text-div-img / .lrg-img-text-div-img
  // Inside it we add the same hover-overlay structure as your mini cards.
  function buildImgWrap(className, imgSrc, caption, useLightbox, overlayTitle, overlayText) {
    const imgWrap = el("div", className);

    // If there’s no image, don’t build a broken <img>
    if (!imgSrc) return imgWrap;

    const content = el("div", "content content--full"); // <-- class instead of inline styles
    const overlay = el("div", "content-overlay");

    const img = document.createElement("img");
    img.src = imgSrc;
    img.className = "content-image";
    img.loading = "lazy";

    // IMPORTANT: lightbox + accessibility
    const altText = (caption && caption.trim()) || (overlayTitle && overlayTitle.trim()) || "Image";
    img.alt = altText;

    if (useLightbox) img.classList.add("js-lightbox");

    const details = el("div", "content-details fadeIn-bottom");

    const titleText =
      (overlayTitle && overlayTitle.trim()) ||
      (caption && caption.trim()) ||
      "";

    const bodyText =
      (overlayText && overlayText.trim()) ||
      (useLightbox ? "Click to view" : "");

    // Only render overlay blocks if we actually have something to show
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

    imgWrap.appendChild(content);

    // Caption under the polaroid (keep as you had it)
    if (caption) {
      const p = document.createElement("p");
      p.textContent = caption;
      imgWrap.appendChild(p);
    }

    return imgWrap;
  }

  // --- small img / big text ---
  function sectionImgText(stub) {
    const imgSrc = stub.dataset.img || "";
    const caption = stub.dataset.caption || "";
    const useLightbox = isTrue(stub.dataset.lightbox);
    const pos = (stub.dataset.imgPos || "left").toLowerCase();

    const overlayTitle = stub.dataset.overlayTitle || "";
    const overlayText = stub.dataset.overlayText || "";

    const grid = el("div", "img-text-div-wrapper");
    if (pos === "right") grid.classList.add("reverse");

    const imgCol = buildImgWrap(
      "img-text-div-img",
      imgSrc,
      caption,
      useLightbox,
      overlayTitle,
      overlayText
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

  // --- 50/50 split ---
  function sectionSplit50(stub) {
    const imgSrc = stub.dataset.img || "";
    const caption = stub.dataset.caption || "";
    const useLightbox = isTrue(stub.dataset.lightbox);

    // DEFAULT = LEFT
    const pos = (stub.dataset.imgPos || "left").toLowerCase();

    const overlayTitle = stub.dataset.overlayTitle || "";
    const overlayText = stub.dataset.overlayText || "";

    const grid = el("div", "lrg-img-text-div-wrapper");

    // IMPORTANT: keep your CSS hooks working (mobile separator rules)
    if (pos === "left") grid.classList.add("img-left");

    const imgCol = buildImgWrap(
      "lrg-img-text-div-img",
      imgSrc,
      caption,
      useLightbox,
      overlayTitle,
      overlayText
    );

    const textCol = el("div", "lrg-img-text-div-text");
    moveAllChildren(stub, textCol);

    // the swappy bit
    if (pos === "right") {
      // text | image
      grid.appendChild(textCol);
      if (imgSrc) grid.appendChild(imgCol);
    } else {
      // image | text  (DEFAULT)
      if (imgSrc) grid.appendChild(imgCol);
      grid.appendChild(textCol);
    }

    return wrapInDivWrapper(grid);
  }

  // --- two text columns ---
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

  function run() {
    document.querySelectorAll(".section[data-type]").forEach((stub) => {
      const built = convertStub(stub);
      if (!built) return;
      stub.parentNode.replaceChild(built, stub);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();