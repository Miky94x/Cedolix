// aggiornamento automatico: all'apertura (o quando torni sull'app) cerco la nuova
// versione; appena è pronta ricarico, senza chiedere nulla
(function () {
  if (!("serviceWorker" in navigator) || !/^https?:/.test(location.protocol))
    return;
  const sw = navigator.serviceWorker,
    had = !!sw.controller; // false alla prima installazione: niente da ricaricare
  let reloading = false;
  sw.addEventListener("controllerchange", () => {
    // se stai compilando qualcosa (modale aperto) la nuova versione parte alla prossima apertura
    if (!had || reloading || document.querySelector(".ov")) return;
    reloading = true;
    location.reload();
  });
  sw.register("sw.js", { updateViaCache: "none" })
    .then((reg) => {
      const chk = () => reg.update().catch(warn);
      chk();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") chk();
      });
    })
    .catch(warn);
})();
