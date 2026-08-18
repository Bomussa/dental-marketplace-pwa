(() => {
  if (!("serviceWorker" in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  };

  if (document.readyState === "loading") {
    window.addEventListener("load", register, { once: true });
  } else {
    register();
  }
})();
