document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".section").forEach(section => {
    const type = section.dataset.type;
    const img = section.dataset.img;
    const caption = section.dataset.caption || "";
    const imgPos = section.dataset.imgPos || "left";
    const lightbox = section.dataset.lightbox === "true";

    let wrapperClass = "";
    let html = "";

    if (type === "imgText") {
      wrapperClass = "img-text-div-wrapper";
    }

    if (type === "split50") {
      wrapperClass = "lrg-img-text-div-wrapper";
    }

    const imgHTML = img
      ? `
        <div class="${type === "split50" ? "lrg-img-text-div-img" : "img-text-div-img"}">
          <img src="${img}" ${lightbox ? 'class="js-lightbox"' : ""}>
          ${caption ? `<p>${caption}</p>` : ""}
        </div>
      `
      : "";

    const textHTML = `
      <div class="${type === "split50" ? "lrg-img-text-div-text" : "img-text-div-text"}">
        ${section.innerHTML}
      </div>
    `;

    html =
      imgPos === "right"
        ? textHTML + imgHTML
        : imgHTML + textHTML;

    section.innerHTML = `
      <div class="div-wrapper">
        <div class="${wrapperClass}">
          ${html}
        </div>
      </div>
    `;
  });
});