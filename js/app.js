import { initPwa } from "./pwa.js";

const THEME_KEY = "vp-theme";
const FONT_KEY = "vp-font";
const themes = ["light", "dark", "night"];

let course = { docs: [] };
let currentId = null;
let readerSize = parseFloat(localStorage.getItem(FONT_KEY) || "1.05");

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = t === "light" ? "#f7f4ef" : t === "night" ? "#16130e" : "#121212";
  }
}
function cycleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = themes[(themes.indexOf(cur) + 1) % themes.length];
  applyTheme(next);
}
applyTheme(localStorage.getItem(THEME_KEY) || "light");

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function search(q) {
  const nq = norm(q);
  if (!nq || nq.length < 2) return [];
  const terms = nq.split(" ").filter(Boolean);
  const scored = [];
  for (const d of course.docs) {
    const hay = norm(d.title + " " + (d.tags || []).join(" ") + " " + (d.goal || "") + " " + (d.text || "").slice(0, 3000));
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
      if (norm(d.title).includes(t)) score += 3;
      if ((d.tags || []).some((tag) => norm(tag).includes(t))) score += 2;
    }
    if (score > 0) scored.push({ doc: d, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 20).map((x) => x.doc);
}

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const el = document.getElementById("view-" + name);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll(".bottom-nav .tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.go === name || (name === "reader" && t.dataset.go === "home"));
  });
}

function openDoc(id) {
  const doc = course.docs.find((d) => d.id === id);
  if (!doc) return;
  currentId = id;
  document.getElementById("reader-module").textContent = doc.module || "";
  document.getElementById("reader-title").textContent = doc.title;
  document.getElementById("reader-goal").textContent = doc.goal || "";
  document.getElementById("reader-goal").style.display = doc.goal ? "" : "none";
  document.getElementById("reader-body").textContent = doc.text || "";
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
  document.getElementById("top-title").textContent = doc.title.length > 28 ? doc.title.slice(0, 26) + "…" : doc.title;
  showView("reader");
  document.getElementById("main").scrollTop = 0;
  closeSidebar();
  closeSearchModal();
}

function goHome() {
  currentId = null;
  document.getElementById("top-title").textContent = "Военное право";
  showView("home");
  closeSidebar();
}

function goCheats() {
  goHome();
  setTimeout(() => {
    document.getElementById("cheat-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}

const MODULE_ORDER = [
  "Модуль 1. Законодательство",
  "Модуль 2. СВО-клиент и СОЧ",
  "Модуль 3. Отсрочки и освобождение",
  "Модуль 4. Снятие с воинского учёта",
  "Модуль 5. Уголовка: СОЧ, приказы, СК",
  "Модуль 6. Контракт: заключение и расторжение",
  "Модуль 7. Обжалование и процесс",
  "База знаний",
  "Книга решений",
];

function sortModules(entries) {
  return entries.sort((a, b) => {
    const ia = MODULE_ORDER.indexOf(a[0]);
    const ib = MODULE_ORDER.indexOf(b[0]);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return a[0].localeCompare(b[0], "ru");
  });
}

function sortDocs(docs) {
  return docs.slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
}

function renderCards() {
  const cheats = course.docs.filter((d) => d.type === "cheat");
  const others = course.docs.filter((d) => d.type !== "cheat");

  const cheatGrid = document.getElementById("cheat-grid");
  if (!cheats.length) {
    cheatGrid.innerHTML = "";
  } else {
    cheatGrid.innerHTML = sortDocs(cheats)
      .map(
        (d) => `
    <button type="button" class="card" data-id="${d.id}">
      <div class="card-title">${esc(d.title)}</div>
      <div class="card-meta">${esc(d.module)}</div>
      <div class="card-goal">${esc(d.goal || "")}</div>
    </button>`
      )
      .join("");
  }

  const modules = {};
  for (const d of others) {
    const m = d.module || "Прочее";
    if (!modules[m]) modules[m] = [];
    modules[m].push(d);
  }
  const moduleGrid = document.getElementById("module-grid");
  moduleGrid.innerHTML = sortModules(Object.entries(modules))
    .map(([mod, docs]) => {
      return (
        `<div class="module-block"><div class="module-heading">${esc(mod)}</div>` +
        sortDocs(docs)
          .map(
            (d) => `
      <button type="button" class="card" data-id="${d.id}">
        <div class="card-title">${esc(d.title)}</div>
        <div class="card-meta">${esc(mod)}</div>
        <div class="card-goal">${esc(d.goal || "")}</div>
      </button>`
          )
          .join("") +
        `</div>`
      );
    })
    .join("");

  const navMod = document.getElementById("nav-modules");
  let navHtml = "";
  const byMod = {};
  for (const d of course.docs) {
    const m = d.module || "Прочее";
    if (!byMod[m]) byMod[m] = [];
    byMod[m].push(d);
  }
  for (const [mod, docs] of sortModules(Object.entries(byMod))) {
    navHtml += `<div class="nav-label">${esc(mod)}</div>`;
    for (const d of sortDocs(docs)) {
      navHtml += `<button type="button" class="nav-item" data-id="${d.id}">${esc(d.title)}</button>`;
    }
  }
  navMod.innerHTML = navHtml;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function renderResults(docs, containerId) {
  const el = document.getElementById(containerId);
  if (!docs.length) {
    el.innerHTML = `<p style="padding:12px;color:var(--text-muted)">Ничего не найдено. Попробуйте «ФЗ-53», «мобилизация», «категория».</p>`;
    return;
  }
  el.innerHTML = docs
    .map(
      (d) => `
    <button type="button" class="result-item" data-id="${d.id}">
      <div class="result-mod">${esc(d.module)}</div>
      <div class="result-title">${esc(d.title)}</div>
      <div class="result-snippet">${esc((d.goal || d.text || "").slice(0, 120))}…</div>
    </button>`
    )
    .join("");
}

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("overlay").classList.add("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

function openSearchModal() {
  document.getElementById("search-modal").classList.remove("hidden");
  const input = document.getElementById("modal-search");
  input.value = "";
  document.getElementById("modal-results").innerHTML = "";
  setTimeout(() => input.focus(), 50);
}
function closeSearchModal() {
  document.getElementById("search-modal").classList.add("hidden");
}

document.addEventListener("click", (e) => {
  const hit = e.target.closest("[data-id]");
  if (!hit) return;
  const id = hit.dataset.id;
  if (id) openDoc(id);
});

document.getElementById("btn-menu").addEventListener("click", openSidebar);
document.getElementById("btn-close-menu").addEventListener("click", closeSidebar);
document.getElementById("overlay").addEventListener("click", closeSidebar);
document.getElementById("btn-theme").addEventListener("click", cycleTheme);
document.getElementById("btn-search").addEventListener("click", openSearchModal);
document.getElementById("btn-close-search").addEventListener("click", closeSearchModal);

document.getElementById("btn-font-up").addEventListener("click", () => {
  readerSize = Math.min(1.5, readerSize + 0.1);
  localStorage.setItem(FONT_KEY, String(readerSize));
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
});
document.getElementById("btn-font-down").addEventListener("click", () => {
  readerSize = Math.max(0.85, readerSize - 0.1);
  localStorage.setItem(FONT_KEY, String(readerSize));
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
});

document.getElementById("btn-prev").addEventListener("click", () => {
  if (!currentId) return goHome();
  const idx = course.docs.findIndex((d) => d.id === currentId);
  if (idx > 0) openDoc(course.docs[idx - 1].id);
  else goHome();
});
document.getElementById("btn-next").addEventListener("click", () => {
  if (!currentId) return;
  const idx = course.docs.findIndex((d) => d.id === currentId);
  if (idx < course.docs.length - 1) openDoc(course.docs[idx + 1].id);
});

document.querySelectorAll(".bottom-nav .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const go = tab.dataset.go;
    if (go === "home") goHome();
    else if (go === "cheats") goCheats();
    else if (go === "search") openSearchModal();
    else if (go === "theme") cycleTheme();
  });
});

document.querySelectorAll("[data-go]").forEach((el) => {
  if (el.closest(".bottom-nav")) return;
  el.addEventListener("click", () => {
    const go = el.dataset.go;
    if (go === "home") goHome();
    else if (go === "cheats") goCheats();
  });
});

document.getElementById("quick-chips").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-q]");
  if (!btn) return;
  const q = btn.dataset.q;
  const results = search(q);
  if (results.length === 1) openDoc(results[0].id);
  else if (results.length > 1) {
    showView("search");
    document.getElementById("top-title").textContent = "Поиск: " + q;
    renderResults(results, "search-results");
  } else {
    openSearchModal();
    document.getElementById("modal-search").value = q;
    renderResults(search(q), "modal-results");
  }
});

document.getElementById("home-search").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (q.length < 2) return;
  clearTimeout(window._hs);
  window._hs = setTimeout(() => {
    const results = search(q);
    showView("search");
    document.getElementById("top-title").textContent = "Поиск";
    renderResults(results, "search-results");
  }, 200);
});
document.getElementById("home-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = e.target.value.trim();
    const results = search(q);
    if (results.length === 1) openDoc(results[0].id);
    else {
      showView("search");
      renderResults(results, "search-results");
    }
  }
});

document.getElementById("modal-search").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(window._ms);
  window._ms = setTimeout(() => renderResults(search(q), "modal-results"), 150);
});

async function init() {
  const docs = [];
  try {
    const idx = await fetch("data/index.json").then((r) => {
      if (!r.ok) throw new Error("index " + r.status);
      return r.json();
    });
    for (const name of idx.files || []) {
      try {
        const r = await fetch("data/docs/" + name);
        if (!r.ok) throw new Error(name + " " + r.status);
        const doc = await r.json();
        if (doc && doc.id) docs.push(doc);
      } catch (err) {
        console.error("load fail", name, err);
      }
    }
  } catch (err) {
    console.error(err);
  }
  if (!docs.length) {
    document.getElementById("cheat-grid").innerHTML =
      "<p style='color:var(--text-muted)'>Не удалось загрузить данные. Обновите страницу с очисткой кэша.</p>";
    return;
  }
  course = { docs };
  renderCards();
  showView("home");
  initPwa();
}
init();
