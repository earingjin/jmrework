const app = document.getElementById("app");

function shellTemplate() {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="side-brand">
          <div class="title">RE:WORK CENTER</div>
          <div class="sub">Administration</div>
          <div class="role-badge">${escapeHtml(state.user.name)} · 관리자</div>
        </div>
        <nav class="nav">
          <button class="${state.active === "admin" ? "active" : ""}" data-action="set-section" data-id="admin"><span>계정 관리</span><span>›</span></button>
          <button class="${state.active === "notices" ? "active" : ""}" data-action="set-section" data-id="notices"><span>공지사항</span><span>›</span></button>
          <button class="${state.active === "success-cases" ? "active" : ""}" data-action="set-section" data-id="success-cases"><span>성공사례 DB</span><span>›</span></button>
          <button class="${state.active === "statistics" ? "active" : ""}" data-action="set-section" data-id="statistics"><span>리포트 통계</span><span>›</span></button>
        </nav>
        <div class="logout"><button class="btn secondary full" data-action="logout">로그아웃</button></div>
        <div class="sidebar-copyright">© 2026 JMCAREER. All Rights Reserved.</div>
      </aside>
      <main class="main">${adminSection()}${noticesSection()}${successCasesSection()}${statisticsSection()}</main>
    </div>`;
}

function activateSection(id) {
  document.querySelectorAll(".section").forEach((section) => section.classList.remove("active"));
  document.getElementById(`section-${id}`)?.classList.add("active");
}

function render() {
  app.innerHTML = state.view === "login" ? loginTemplate() : shellTemplate();
  if (state.view === "login") clearLoginAutofill();
  if (state.view === "app") activateSection(state.active);
}

const actions = {
  login: async () => { if (await login()) { await loadData(); render(); } },
  logout: () => { logout(); render(); },
  "set-section": async (id) => { state.active = id; if (id === "statistics") { await loadUsageEvents(); await loadGeminiErrors(); } if (id === "notices") await loadNotices(); if (id === "success-cases") await loadSuccessCaseData(); render(); },
  "reload-gemini-errors": async () => { await loadGeminiErrors(); render(); },
  "reload-notices": async () => { await loadNotices(); render(); },
  "reload-success-cases": async () => { await loadSuccessCaseData(); render(); },
  "save-success-case": async () => { const ok = await saveSuccessCase(); if (ok) render(); },
  "reset-success-case": () => resetSuccessCaseForm(),
  "fill-success-case": (id) => fillSuccessCaseForm(id),
  "delete-success-case": async (id) => { const ok = await deleteSuccessCase(id); if (ok) render(); },
  "download-success-case-file": (id) => downloadSuccessCaseImportFile(id),
  "delete-success-case-file": async (id) => { const ok = await deleteSuccessCaseImportFile(id); if (ok) render(); },
  "set-statistics-period": (id) => { setStatisticsPeriod(id); render(); },
  "apply-statistics-period": () => { applyCustomStatisticsPeriod(); render(); },
  "download-statistics": (id) => downloadStatisticsExcel(id),
  "save-account": () => saveAccount() && render(),
  "reset-account": () => resetAccountForm(),
  "change-admin-password": async () => { await changeAdminPassword(); },
  "fill-account": (id) => fillAccountForm(id),
  "toggle-account": (id) => toggleAccountStatus(id) && render(),
  "delete-account": async (id) => { const ok = await deleteAccount(id); if (ok) render(); },
  "import-accounts": async () => { await importAccounts(); render(); },
  "save-notice": async () => { const ok = await saveNotice(); if (ok) render(); },
  "reset-notice": () => resetNoticeForm(),
  "fill-notice": (id) => fillNoticeForm(id),
  "delete-notice": async (id) => { const ok = await deleteNotice(id); if (ok) render(); },
  "import-success-cases": async () => { const ok = await importSuccessCases(); if (ok) render(); },
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  actions[target.dataset.action]?.(target.dataset.id);
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-filter-accounts]")) filterAccounts();
  if (event.target.matches("[data-filter-success-cases]")) filterSuccessCases();
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-filter-accounts]")) filterAccounts();
  if (event.target.matches("[data-filter-success-cases]")) filterSuccessCases();
});

restoreAdminLogin().then(() => loadData()).then(() => {
  render();
  Promise.all([loadUsageEvents(), loadGeminiErrors()]).then(render);
});
