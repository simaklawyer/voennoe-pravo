const INSTALL_DISMISS_KEY = "vp-install-dismissed";
let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

export function setupInstallUI() {
  const card = document.getElementById("install-card");
  if (!card) return;
  if (isStandalone() || localStorage.getItem(INSTALL_DISMISS_KEY) === "1") {
    card.classList.add("hidden");
    return;
  }
  const btnInstall = document.getElementById("btn-install");
  const btnHow = document.getElementById("btn-install-how");
  const btnDismiss = document.getElementById("btn-install-dismiss");
  const steps = document.getElementById("install-steps");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    card.classList.add("hidden");
  });

  btnInstall?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.hidden = true;
  });

  btnHow?.addEventListener("click", () => {
    steps?.classList.toggle("hidden");
  });

  btnDismiss?.addEventListener("click", () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    card.classList.add("hidden");
  });
}

export function setupOfflineBar() {
  const bar = document.getElementById("offline-bar");
  if (!bar) return;
  const sync = () => {
    bar.classList.toggle("hidden", navigator.onLine);
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
}

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("sw.js", window.location.href).href;
  navigator.serviceWorker.register(swUrl).then((reg) => {
    reg.update().catch(() => {});
  }).catch((err) => {
    console.warn("SW register failed", err);
  });
}

export function initPwa() {
  setupInstallUI();
  setupOfflineBar();
  registerSW();
}
