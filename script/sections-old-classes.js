// sections-old-classes.js
// Expands <div class="section" data-type="..."> stubs into your EXISTING div/class structure.
//
// Supported:
//  - data-type="imgText"
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default left)
//  - data-type="split50"
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default right, matching your old split layout)
//  - data-type="right"   (your SWOT wrapper)
//      data-img="img/..." data-caption="..." data-lightbox="true|false"
//      data-img-pos="left|right" (default right)
//  - data-type="twoCol"
//      expects:
//        <div data-col="left"> ... </div>
//        <div data-col="right"> ... </div>

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

  function buildImgWrap(className, imgSrc, caption, useLightbox) {
    const imgWrap = el("div", className);
    const img = document.createElement("img");
    img.src = imgSrc || "";
    if (useLightbox) img.classList.add("js-lightbox");
    imgWrap.appendChild(img);

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
    const pos = (stub.dataset.imgPos || "left").toLowerCase(); // left|right

    const grid = el("div", "img-text-div-wrapper");
    if (pos === "right") grid.classList.add("reverse"); // used by CSS to move separator

    const imgCol = buildImgWrap("img-text-div-img", imgSrc, caption, useLightbox);

    const textCol = el("div", "img-text-div-text");
    moveAllChildren(stub, textCol);

    // IMPORTANT: only swap order; do NOT change sizing logic
    if (pos === "right") {
      grid.appendChild(textCol);
      grid.appendChild(imgCol);
    } else {
      grid.appendChild(imgCol);
      grid.appendChild(textCol);
    }

    return wrapInDivWrapper(grid);
  }

  // --- 50/50 split (your lrg-img-text-div-wrapper) ---
  function sectionSplit50(stub) {
    const imgSrc = stub.dataset.img || "";
    const caption = stub.dataset.caption || "";
    const useLightbox = isTrue(stub.dataset.lightbox);
    const pos = (stub.dataset.imgPos || "right").toLowerCase(); // left|right (default right)

    const grid = el("div", "lrg-img-text-div-wrapper");
    if (pos === "left") grid.classList.add("img-left"); // used by CSS to move separator

    const textCol = el("div", "lrg-img-text-div-text");
    moveAllChildren(stub, textCol);

    const imgCol = buildImgWrap("lrg-img-text-div-img", imgSrc, caption, useLightbox);

    // your old default: text then image (image on right)
    if (pos === "left") {
      grid.appendChild(imgCol);
      grid.appendChild(textCol);
    } else {
      grid.appendChild(textCol);
      grid.appendChild(imgCol);
    }

    return wrapInDivWrapper(grid);
  }

  // --- "right" layout wrapper (your SWOT style) ---
  function sectionRight(stub) {
    const imgSrc = stub.dataset.img || "";
    const caption = stub.dataset.caption || "";
    const useLightbox = isTrue(stub.dataset.lightbox);
    const pos = (stub.dataset.imgPos || "right").toLowerCase(); // left|right

    const grid = el("div", "right");
    if (pos === "left") grid.classList.add("img-left"); // used by CSS

    const textCol = el("div", "lrg-img-text-div-text");
    moveAllChildren(stub, textCol);

    const imgCol = buildImgWrap("lrg-img-text-div-img", imgSrc, caption, useLightbox);

    // your old default: text then image (image on right)
    if (pos === "left") {
      grid.appendChild(imgCol);
      grid.appendChild(textCol);
    } else {
      grid.appendChild(textCol);
      grid.appendChild(imgCol);
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
    if (type === "right") return sectionRight(stub);
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