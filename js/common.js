const API = window.APP_CONFIG.API_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PALETTE = ["#5b5bf0", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#14b8a6", "#64748b"];

/* ---------- session ---------- */
const getToken = () => localStorage.getItem("et_token");
const getUser = () => { try { return JSON.parse(localStorage.getItem("et_user")); } catch { return null; } };
function saveSession(d) {
  localStorage.setItem("et_token", d.token);
  localStorage.setItem("et_user", JSON.stringify({ name: d.name, email: d.email }));
}
function logout() {
  localStorage.removeItem("et_token");
  localStorage.removeItem("et_user");
  location.href = "login.html";
}
function requireAuth() { if (!getToken()) location.href = "login.html"; }

/* ---------- http ---------- */
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (getToken()) headers.Authorization = "Bearer " + getToken();
  let res;
  try { res = await fetch(API + path, { ...opts, headers }); }
  catch { throw new Error("Cannot reach the server. Is the backend running?"); }
  if (res.status === 401 && !path.startsWith("/auth")) { logout(); throw new Error("Session expired"); }
  if (!res.ok) {
    let msg = "Request failed (" + res.status + ")";
    try { const j = await res.json(); msg = j.message || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return (res.headers.get("content-type") || "").includes("json") ? res.json() : res;
}

/* ---------- helpers ---------- */
const fmt = n => APP_CONFIG.CURRENCY + Number(n || 0).toLocaleString(APP_CONFIG.LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = n => APP_CONFIG.CURRENCY + Number(n || 0).toLocaleString(APP_CONFIG.LOCALE, { maximumFractionDigits: 0 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fmtDate(s) { const [y, m, d] = s.split("-"); return new Date(y, m - 1, d).toLocaleDateString(APP_CONFIG.LOCALE, { day: "2-digit", month: "short", year: "numeric" }); }
function monthLabel(ym) { const [y, m] = ym.split("-"); return new Date(y, m - 1, 1).toLocaleDateString(APP_CONFIG.LOCALE, { month: "short", year: "2-digit" }); }

function rangeFor(key) {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth();
  switch (key) {
    case "month": return { from: iso(new Date(y, m, 1)), to: iso(t) };
    case "lastmonth": return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "30": { const f = new Date(t); f.setDate(f.getDate() - 29); return { from: iso(f), to: iso(t) }; }
    case "year": return { from: iso(new Date(y, 0, 1)), to: iso(t) };
    default: return { from: "2000-01-01", to: "2100-01-01" };
  }
}

function toast(msg, type = "ok") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- theme ---------- */
function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); localStorage.setItem("et_theme", t); }
applyTheme(localStorage.getItem("et_theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
function toggleTheme() { applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); if (window.onThemeChange) window.onThemeChange(); }

/* ---------- app shell ---------- */
function buildShell(active, title) {
  const u = getUser() || { name: "User" };
  const links = [["dashboard", "dashboard.html", "📊", "Dashboard"], ["expenses", "expenses.html", "💸", "Expenses"], ["analysis", "analysis.html", "📈", "Analysis & Budgets"]];
  $("#sidebar").innerHTML = `<div class="brand">💰 ExpenseTracker</div>` +
    links.map(l => `<a class="nav ${l[0] === active ? "active" : ""}" href="${l[1]}">${l[2]} ${l[3]}</a>`).join("") +
    `<div style="flex:1"></div><a class="nav" href="#" id="logoutLink">🚪 Logout</a>`;
  $("#topbar").innerHTML = `<div style="display:flex;gap:10px;align-items:center">
      <button class="btn ghost sm menu-btn" id="menuBtn">☰</button><h1 style="font-size:1.45rem">${esc(title)}</h1></div>
    <div class="right"><button class="btn ghost sm" id="themeBtn" title="Toggle dark mode">🌓</button>
      <span style="font-weight:600">${esc(u.name)}</span><div class="avatar">${esc(u.name.charAt(0).toUpperCase())}</div></div>`;
  $("#logoutLink").onclick = e => { e.preventDefault(); logout(); };
  $("#themeBtn").onclick = toggleTheme;
  $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
}

/* ---------- charts ---------- */
const charts = {};
function mkChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  Chart.defaults.color = dark ? "#9aa1b7" : "#6b7385";
  Chart.defaults.borderColor = dark ? "#272c45" : "#e5e8f0";
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
  charts[id] = new Chart(document.getElementById(id), cfg);
}
const moneyTick = v => APP_CONFIG.CURRENCY + Number(v).toLocaleString(APP_CONFIG.LOCALE);
const moneyTip = { callbacks: { label: c => " " + fmt(c.parsed.y ?? c.parsed) } };

function drawCategoryChart(id, d) {
  mkChart(id, { type: "doughnut", data: { labels: d.byCategory.map(c => c.category), datasets: [{ data: d.byCategory.map(c => c.total), backgroundColor: PALETTE, borderWidth: 0 }] },
    options: { cutout: "62%", plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)}` } } } } });
}
function drawMonthlyChart(id, d) {
  mkChart(id, { type: "bar", data: { labels: d.monthly.map(m => monthLabel(m.month)), datasets: [{ data: d.monthly.map(m => m.total), backgroundColor: "#5b5bf0", borderRadius: 6 }] },
    options: { plugins: { legend: { display: false }, tooltip: moneyTip }, scales: { y: { ticks: { callback: moneyTick }, beginAtZero: true } } } });
}
function drawDailyChart(id, d) {
  const rows = d.daily.slice(-60);
  mkChart(id, { type: "line", data: { labels: rows.map(r => fmtDate(r.date).slice(0, 6)), datasets: [{ data: rows.map(r => r.total), borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,.15)", fill: true, tension: .3, pointRadius: 2 }] },
    options: { plugins: { legend: { display: false }, tooltip: moneyTip }, scales: { y: { ticks: { callback: moneyTick }, beginAtZero: true } } } });
}

function renderBudgets(el, list, onDelete) {
  if (!list.length) { el.innerHTML = `<div class="empty">No budgets yet. Set one on the Analysis page.</div>`; return; }
  el.innerHTML = list.map(b => `<div class="budget-row">
    <div class="head"><b>${b.category === "ALL" ? "Overall budget" : esc(b.category)}</b>
      <span>${fmt0(b.spent)} / ${fmt0(b.limit)} <small style="color:var(--muted)">(${b.percent}%)</small>
      ${onDelete ? `<a href="#" data-del="${b.id}" title="Remove">✕</a>` : ""}</span></div>
    <div class="bar"><i class="${b.status}" style="width:${Math.min(b.percent, 100)}%"></i></div></div>`).join("");
  if (onDelete) $$("[data-del]", el).forEach(a => a.onclick = e => { e.preventDefault(); onDelete(a.dataset.del); });
}
function renderInsights(el, list) { el.innerHTML = list.map(i => `<li>💡 ${esc(i)}</li>`).join(""); }

/* ---------- backend status (login / register pages) ---------- */
async function showBackendStatus(el) {
  try {
    const r = await fetch(API + "/health", { cache: "no-store" });
    if (!r.ok) throw 0;
    el.innerHTML = "🟢 Backend connected"; el.style.color = "var(--green)";
  } catch {
    el.innerHTML = "🔴 Backend not reachable at " + esc(API) + "<br><small>Start the Spring Boot app (Run ExpenseTrackerApplication.java) and wait for “Started ExpenseTrackerApplication”, then refresh.</small>";
    el.style.color = "var(--red)";
  }
}
