// nav-mobile.js
(function () {
	document.addEventListener("click", (e) => {
		const btn = e.target.closest(".nav-close");
		if (!btn) return;

		const nav = document.querySelector("nav.main-nav");
		if (!nav) return;

		// CLOSE the menu — match your existing open mechanism
		nav.classList.remove("open", "is-open", "active");
		document.documentElement.classList.remove("nav-open");
		document.body.classList.remove("nav-open");
	});
})();
