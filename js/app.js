import { initPwa } from "./pwa.js";

const THEME_KEY = "vp-theme";
const THEME_V = "vp-theme-v2";
const FONT_KEY = "vp-font";
const themes = ["light", "dark", "night"];

let course = { docs: [] };
let currentId = null;
let readerSize = parseFloat(localStorage.getItem(FONT_KEY) || "1.02");

function applyTheme(t) {
  if (!themes.includes(t)) t = "light";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = t === "light" ? "#f7f4ef" : t === "night" ? "#16130e" : "#121212";
  }
}
function cycleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(themes[(themes.indexOf(cur) + 1) % themes.length]);
}
if (!localStorage.getItem(THEME_V)) {
  localStorage.setItem(THEME_V, "1");
  localStorage.setItem(THEME_KEY, "light");
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
    const hay = norm(
      d.title + " " + (d.tags || []).join(" ") + " " + (d.goal || "") + " " + (d.text || "").slice(0, 4000)
    );
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
    t.classList.toggle("active", t.dataset.go === name || (name === "reader" && t.dataset.go === "modules"));
  });
}

function formatBody(text) {
  if (!text) return "";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let listBuf = [];
  let listType = null;
  function flushList() {
    if (!listBuf.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    out.push("<" + tag + ">" + listBuf.map((x) => "<li>" + esc(x) + "</li>").join("") + "</" + tag + ">");
    listBuf = [];
    listType = null;
  }
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (/^(цель урока|цель:|для каких дел|входные данные|пошаговый маршрут|развилки|связка)/i.test(line)) {
      flushList();
      out.push('<h3 class="rb-h">' + esc(line.replace(/:$/, "")) + "</h3>");
      continue;
    }
    if (/^\d+\.\s+\S/.test(line) && line.length < 140) {
      flushList();
      out.push('<h3 class="rb-h">' + esc(line) + "</h3>");
      continue;
    }
    if (/^(шаг\s+\d+|стратегия\s*№?\s*\d+)/i.test(line) && line.length < 120) {
      flushList();
      out.push('<h3 class="rb-h">' + esc(line) + "</h3>");
      continue;
    }
    if (/^(что регулирует|на практике|особенности|пример из практики|нормативная база|алгоритм|важно|правило)/i.test(line) && line.length < 80) {
      flushList();
      out.push('<h4 class="rb-sub">' + esc(line.replace(/:$/, "")) + "</h4>");
      continue;
    }
    if (/^[-•●]\s+/.test(line)) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuf.push(line.replace(/^[-•●]\s+/, ""));
      continue;
    }
    if (line.includes(";") && line.length < 400 && (line.match(/;/g) || []).length >= 2) {
      flushList();
      const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
      out.push("<ul>" + parts.map((p) => "<li>" + esc(p.replace(/\.$/, "")) + "</li>").join("") + "</ul>");
      continue;
    }
    flushList();
    out.push("<p>" + esc(line) + "</p>");
  }
  flushList();
  return out.join("\n");
}

function openDoc(id) {
  const doc = course.docs.find((d) => d.id === id);
  if (!doc) return;
  currentId = id;
  document.getElementById("reader-module").textContent = doc.module || "";
  document.getElementById("reader-title").textContent = doc.title;
  const goalEl = document.getElementById("reader-goal");
  if (doc.goal) { goalEl.textContent = doc.goal; goalEl.style.display = ""; }
  else goalEl.style.display = "none";
  const body = document.getElementById("reader-body");
  body.innerHTML = formatBody(doc.text || "");
  body.style.setProperty("--reader-size", readerSize + "rem");
  document.getElementById("top-title").textContent =
    doc.title.length > 28 ? doc.title.slice(0, 26) + "…" : doc.title;
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

function goModules() {
  goHome();
  setTimeout(() => {
    document.getElementById("module-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 40);
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
  return docs.slice().sort((a, b) => {
    const na = (a.id || "").replace(/\D/g, "");
    const nb = (b.id || "").replace(/\D/g, "");
    if (na && nb && na !== nb) return Number(na) - Number(nb);
    return (a.title || "").localeCompare(b.title || "", "ru");
  });
}

function isVisibleDoc(d) {
  if (!d || !d.id) return false;
  if (d.type === "cheat") return false;
  const mod = d.module || "";
  if (/введение/i.test(mod)) return false;
  if (d.id === "intro" || d.id === "path-lawyer") return false;
  if (/^strategy-\d/.test(d.id)) return false;
  if (d.id === "strategy-navigator") return false;
  if (d.id === "m1-kategorii" || d.id === "m1-zakon") return false;
  if (d.id === "m-soch-posledstviya" || d.id === "m-vyplaty") return false;
  if (d.id === "kb-gospital" || d.id === "kb-vvk-instr") return false;
  return true;
}

function renderCards() {
  const others = course.docs.filter(isVisibleDoc);
  const cheatGrid = document.getElementById("cheat-grid");
  if (cheatGrid) cheatGrid.innerHTML = "";
  const modules = {};
  for (const d of others) {
    const m = d.module || "Прочее";
    if (!modules[m]) modules[m] = [];
    modules[m].push(d);
  }
  const moduleGrid = document.getElementById("module-grid");
  const accHtml = sortModules(Object.entries(modules))
    .map(([mod, docs]) => {
      const items = sortDocs(docs)
        .map(
          (d) =>
            '<button type="button" class="lesson-row" data-id="' +
            esc(d.id) +
            '"><span class="lesson-title">' +
            esc(d.title) +
            "</span>" +
            (d.goal ? '<span class="lesson-goal">' + esc(d.goal) + "</span>" : "") +
            "</button>"
        )
        .join("");
      return (
        '<div class="acc" data-mod="' +
        esc(mod) +
        '"><button type="button" class="acc-head" aria-expanded="false"><span class="acc-title">' +
        esc(mod) +
        '</span><span class="acc-count">' +
        docs.length +
        '</span><span class="acc-chev" aria-hidden="true"></span></button><div class="acc-body">' +
        items +
        "</div></div>"
      );
    })
    .join("");
  moduleGrid.innerHTML =
    '<div class="acc-toolbar">' +
    '<button type="button" class="text-btn" id="btn-acc-expand">Развернуть все</button>' +
    '<button type="button" class="text-btn" id="btn-acc-collapse">Свернуть все</button>' +
    "</div>" +
    accHtml;
  const navMod = document.getElementById("nav-modules");
  let navHtml =
    '<div class="nav-label-row"><div class="nav-label">Модули</div>' +
    '<button type="button" class="text-btn nav-collapse-all" id="btn-nav-collapse">Свернуть</button></div>';
  for (const [mod, docs] of sortModules(Object.entries(modules))) {
    navHtml +=
      '<div class="nav-acc"><button type="button" class="nav-acc-head">' +
      esc(mod) +
      " <span>" +
      docs.length +
      '</span></button><div class="nav-acc-body">';
    for (const d of sortDocs(docs)) {
      navHtml +=
        '<button type="button" class="nav-item" data-id="' +
        esc(d.id) +
        '">' +
        esc(d.title) +
        "</button>";
    }
    navHtml += "</div></div>";
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
    el.innerHTML =
      '<p style="padding:12px;color:var(--text-muted)">Ничего не найдено. Попробуйте «ФЗ-53», «мобилизация», «категория».</p>';
    return;
  }
  el.innerHTML = docs
    .map(
      (d) =>
        '<button type="button" class="result-item" data-id="' +
        esc(d.id) +
        '"><div class="result-mod">' +
        esc(d.module) +
        '</div><div class="result-title">' +
        esc(d.title) +
        '</div><div class="result-snippet">' +
        esc((d.goal || d.text || "").slice(0, 120)) +
        "…</div></button>"
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
  if (e.target.closest("#btn-acc-collapse")) {
    document.querySelectorAll(".acc").forEach((acc) => {
      acc.classList.remove("open");
      const h = acc.querySelector(".acc-head");
      if (h) h.setAttribute("aria-expanded", "false");
    });
    e.stopPropagation();
    return;
  }
  if (e.target.closest("#btn-acc-expand")) {
    document.querySelectorAll(".acc").forEach((acc) => {
      acc.classList.add("open");
      const h = acc.querySelector(".acc-head");
      if (h) h.setAttribute("aria-expanded", "true");
    });
    e.stopPropagation();
    return;
  }
  if (e.target.closest("#btn-nav-collapse")) {
    const anyOpen = document.querySelector(".nav-acc.open");
    document.querySelectorAll(".nav-acc").forEach((acc) => {
      acc.classList.toggle("open", !anyOpen);
    });
    const btn = document.getElementById("btn-nav-collapse");
    if (btn) btn.textContent = anyOpen ? "Развернуть" : "Свернуть";
    e.stopPropagation();
    return;
  }
  const head = e.target.closest(".acc-head");
  if (head) {
    const acc = head.closest(".acc");
    const open = acc.classList.toggle("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    e.stopPropagation();
    return;
  }
  const navHead = e.target.closest(".nav-acc-head");
  if (navHead) {
    navHead.closest(".nav-acc")?.classList.toggle("open");
    e.stopPropagation();
    return;
  }
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
  readerSize = Math.min(1.4, readerSize + 0.08);
  localStorage.setItem(FONT_KEY, String(readerSize));
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
});
document.getElementById("btn-font-down").addEventListener("click", () => {
  readerSize = Math.max(0.88, readerSize - 0.08);
  localStorage.setItem(FONT_KEY, String(readerSize));
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
});

document.getElementById("btn-prev").addEventListener("click", () => {
  if (!currentId) return goHome();
  const list = course.docs.filter(isVisibleDoc);
  const idx = list.findIndex((d) => d.id === currentId);
  if (idx > 0) openDoc(list[idx - 1].id);
  else goHome();
});
document.getElementById("btn-next").addEventListener("click", () => {
  if (!currentId) return;
  const list = course.docs.filter(isVisibleDoc);
  const idx = list.findIndex((d) => d.id === currentId);
  if (idx >= 0 && idx < list.length - 1) openDoc(list[idx + 1].id);
});

document.querySelectorAll(".bottom-nav .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const go = tab.dataset.go;
    if (go === "home") goHome();
    else if (go === "cheats" || go === "modules") goModules();
    else if (go === "search") openSearchModal();
    else if (go === "theme") cycleTheme();
  });
});

document.querySelectorAll("[data-go]").forEach((el) => {
  if (el.closest(".bottom-nav")) return;
  el.addEventListener("click", () => {
    const go = el.dataset.go;
    if (go === "home") goHome();
    else if (go === "cheats" || go === "modules") goModules();
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
    const files = idx.files || [];
    const loaded = await Promise.all(
      files.map(async (name) => {
        try {
          const r = await fetch("data/docs/" + name);
          if (!r.ok) return null;
          return await r.json();
        } catch {
          return null;
        }
      })
    );
    for (const doc of loaded) {
      if (doc && doc.id) docs.push(doc);
    }
  } catch (err) {
    console.error(err);
  }
  if (!docs.length) {
    document.getElementById("module-grid").innerHTML =
      "<p style='color:var(--text-muted)'>Не удалось загрузить данные. Обновите страницу с очисткой кэша.</p>";
    return;
  }
  course = { docs };
  renderCards();
  showView("home");
  initPwa();
}
init();
