import { initPwa } from "./pwa.js";

const THEME_KEY = "vp-theme";
const FONT_KEY = "vp-font";
const themes = ["light", "dark", "night"];

let course = { docs: [] };
let currentId = null;
let readerSize = parseFloat(localStorage.getItem(FONT_KEY) || "0.98");

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
  document.getElementById("reader-body").innerHTML = formatBody(doc.text || "");
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

function goModules() {
  goHome();
  setTimeout(() => {
    document.getElementById("module-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const modules = {};
  for (const d of course.docs) {
    const m = d.module || "Прочее";
    if (!modules[m]) modules[m] = [];
    modules[m].push(d);
  }

  const acc = document.getElementById("module-accordion");
  if (!acc) return;

  acc.innerHTML = sortModules(Object.entries(modules))
    .map(([mod, docs], idx) => {
      const items = sortDocs(docs)
        .map((d) => {
          const goal = (d.goal || "").trim();
          const goalHtml = goal
            ? `<span class="acc-item-goal">${esc(goal.length > 100 ? goal.slice(0, 98) + "…" : goal)}</span>`
            : "";
          return `
        <button type="button" class="acc-item" data-id="${d.id}">
          <span class="acc-item-title">${esc(d.title)}</span>
          ${goalHtml}
        </button>`;
        })
        .join("");
      const open = idx === 0 ? " open" : "";
      return `
      <div class="acc-block${open}" data-mod="${esc(mod)}">
        <button type="button" class="acc-head" aria-expanded="${idx === 0 ? "true" : "false"}">
          <span class="acc-title">${esc(mod)}</span>
          <span class="acc-count">${docs.length}</span>
          <span class="acc-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="acc-body">${items}</div>
      </div>`;
    })
    .join("");

  const navMod = document.getElementById("nav-modules");
  let navHtml = "";
  for (const [mod, docs] of sortModules(Object.entries(modules))) {
    navHtml += `<div class="nav-label">${esc(mod)}</div>`;
    for (const d of sortDocs(docs)) {
      navHtml += `<button type="button" class="nav-item" data-id="${d.id}">${esc(d.title)}</button>`;
    }
  }
  if (navMod) navMod.innerHTML = navHtml;
}

function formatBody(text) {
  if (!text) return "";
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (let raw of lines) {
    const t = raw.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (/^[─\-—]{3,}$/.test(t) || t === "⸻") {
      closeList();
      out.push('<hr class="reader-hr" />');
      continue;
    }
    if (/^\d+[\.\)]\s+\S/.test(t) && t.length < 120 && !t.includes("→")) {
      closeList();
      out.push(`<h3 class="reader-h">${esc(t)}</h3>`);
      continue;
    }
    if (
      /^(СТРАТЕГИЯ|ЧАСТЬ|Урок\s+\d+)/i.test(t) ||
      (t === t.toUpperCase() && t.length > 8 && t.length < 90 && /[А-ЯA-Z]/.test(t) && !t.includes("●"))
    ) {
      closeList();
      out.push(`<h2 class="reader-h2">${esc(t)}</h2>`);
      continue;
    }
    if (/^[●•\-–—\*○◦]\s+/.test(t)) {
      if (!inList) {
        out.push('<ul class="reader-ul">');
        inList = true;
      }
      const item = t.replace(/^[●•\-–—\*○◦]\s+/, "");
      out.push(`<li>${esc(item)}</li>`);
      continue;
    }
    closeList();
    if (/^Цель\s*(урока)?\s*[:：]/i.test(t)) {
      out.push(`<p class="reader-goal-line"><strong>${esc(t)}</strong></p>`);
      continue;
    }
    if (/^Кратко/i.test(t)) {
      out.push(`<p class="reader-summary"><strong>${esc(t)}</strong></p>`);
      continue;
    }
    out.push(`<p>${esc(t)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function renderResults(docs, containerId) {
  const el = document.getElementById(containerId);
  if (!docs.length) {
    el.innerHTML = `<p style="padding:12px;color:var(--text-muted)">Ничего не найдено.</p>`;
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
  readerSize = Math.min(1.4, readerSize + 0.08);
  localStorage.setItem(FONT_KEY, String(readerSize));
  document.getElementById("reader-body").style.setProperty("--reader-size", readerSize + "rem");
});
document.getElementById("btn-font-down").addEventListener("click", () => {
  readerSize = Math.max(0.85, readerSize - 0.08);
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
    else if (go === "modules") goModules();
    else if (go === "search") openSearchModal();
    else if (go === "theme") cycleTheme();
  });
});

document.querySelectorAll("[data-go]").forEach((el) => {
  if (el.closest(".bottom-nav")) return;
  el.addEventListener("click", () => {
    const go = el.dataset.go;
    if (go === "home") goHome();
    else if (go === "modules") goModules();
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

document.addEventListener("click", (e) => {
  const head = e.target.closest(".acc-head");
  if (!head) return;
  e.preventDefault();
  e.stopPropagation();
  const block = head.closest(".acc-block");
  if (!block) return;
  const willOpen = !block.classList.contains("open");
  document.querySelectorAll(".acc-block.open").forEach((b) => {
    if (b !== block) {
      b.classList.remove("open");
      b.querySelector(".acc-head")?.setAttribute("aria-expanded", "false");
    }
  });
  block.classList.toggle("open", willOpen);
  head.setAttribute("aria-expanded", willOpen ? "true" : "false");
});

async function init() {
  const docs = [];
  try {
    const idx = await fetch("data/index.json").then((r) => {
      if (!r.ok) throw new Error("index " + r.status);
      return r.json();
    });
    const names = idx.files || [];
    const loaded = await Promise.all(
      names.map(async (name) => {
        try {
          const r = await fetch("data/docs/" + name);
          if (!r.ok) throw new Error(name + " " + r.status);
          return await r.json();
        } catch (err) {
          console.error("load fail", name, err);
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
    const acc = document.getElementById("module-accordion");
    if (acc) {
      acc.innerHTML =
        "<p style='color:var(--text-muted)'>Не удалось загрузить данные. Обновите с очисткой кэша.</p>";
    }
    return;
  }
  course = { docs };
  renderCards();
  showView("home");
  initPwa();
}
init();
