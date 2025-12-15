(function () {

  function runDevGate() {
    const USERNAME = "phil";
    const PASSWORD = "polaroid";
    const KEY = "dev-unlocked";

    if (sessionStorage.getItem(KEY) === "true") return;

    const failMsg =
`Nice try, you're not getting hold of my valuables!

p.s. there's nothing valuable in here. I may ultimately push this behind
Cloudflare / AWS, but for now this just holds my _template baseline.
Investigating further will show otherwise 🙂`;

    function askCreds() {
      return new Promise((resolve) => {
        const modal = document.createElement("div");

        modal.innerHTML = `
          <div style="
            position:fixed; inset:0; background:rgba(0,0,0,.65);
            display:flex; align-items:center; justify-content:center;
            z-index:99999; padding:20px;
          ">
            <div style="
              width:min(520px,100%);
              background:#fff; color:#111;
              border-radius:12px;
              padding:22px;
            ">
              <h2>Restricted</h2>

              <label>Username</label>
              <input id="dev-u" style="width:100%;padding:10px;margin-bottom:12px;">

              <label>Password</label>
              <input id="dev-p" type="password" style="width:100%;padding:10px;">

              <div style="margin-top:16px;text-align:right">
                <button id="dev-cancel">Cancel</button>
                <button id="dev-ok">Enter</button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const u = modal.querySelector("#dev-u");
        const p = modal.querySelector("#dev-p");

        modal.querySelector("#dev-ok").onclick = () => {
          modal.remove();
          resolve({ user: u.value, pass: p.value });
        };

        modal.querySelector("#dev-cancel").onclick = () => {
          modal.remove();
          resolve(null);
        };

        u.focus();
      });
    }

    (async () => {
      const creds = await askCreds();
      if (!creds) {
        alert(failMsg);
        location.replace("/admin.html");
        return;
      }

      if (creds.user === USERNAME && creds.pass === PASSWORD) {
        sessionStorage.setItem(KEY, "true");
        alert("Darn! You're a smart one; sadly for you, there's nothing of use in here!");
      } else {
        alert(failMsg);
        location.replace("/admin.html");
      }
    })();
  }

  // 🔒 GUARANTEE body exists
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runDevGate);
  } else {
    runDevGate();
  }

})();