

// aggiornamenti: avviso con numero versione e tasto Aggiorna
(function () {
  if (!("serviceWorker" in navigator) || !/^https?:/.test(location.protocol))
    return;
  let shown = null,
    reloading = false,
    silent = false;
  const ver = (w) =>
      new Promise((res) => {
        const c = new MessageChannel();
        c.port1.onmessage = (e) => res(e.data);
        w.postMessage("ver", [c.port2]);
        setTimeout(() => res(null), 1500);
      }),
    ask = async (reg) => {
      const w = reg.waiting;
      // prima installazione: nessun controller, niente da aggiornare
      if (!w || !navigator.serviceWorker.controller) return;
      const v = await ver(w);
      if (v && v === V) {
        // stessa versione già in uso dalla pagina: attivo senza disturbare
        silent = true;
        w.postMessage("skip");
        return;
      }
      if (shown === (v || "?")) return;
      shown = v || "?";
      let e = document.getElementById("upd");
      if (e) e.remove();
      e = document.createElement("div");
      e.id = "upd";
      e.className = "upd";
      e.innerHTML = `<div><b>Nuova versione disponibile</b><small>${v ? "V. " + esc(v) : "Aggiorna per usarla"}</small></div><div class="ba"><button type="button" class="b s" id="updx">Dopo</button><button type="button" class="b" id="updo">Aggiorna</button></div>`;
      document.body.appendChild(e);
      e.querySelector("#updx").onclick = () => e.remove();
      e.querySelector("#updo").onclick = () => {
        e.querySelector("#updo").textContent = "Aggiorno…";
        w.postMessage("skip");
      };
    };
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || silent) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      ask(reg);
      reg.addEventListener("updatefound", () => {
        const n = reg.installing;
        if (n)
          n.addEventListener("statechange", () => {
            if (n.state === "installed") ask(reg);
          });
      });
      const chk = () => reg.update().catch(warn);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") chk();
      });
      setInterval(chk, 30 * 60 * 1000);
    })
    .catch(warn);
})();
