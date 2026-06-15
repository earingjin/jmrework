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
          <button class="${state.active === "statistics" ? "active" : ""}" data-action="set-section" data-id="statistics"><span>리포트 통계</span><span>›</span></button>
        </nav>
        <div class="logout"><button class="btn secondary full" data-action="logout">로그아웃</button></div>
      </aside>
      <main class="main">${adminSection()}${statisticsSection()}</main>
    </div>`;
}

function activateSection(id) {
  document.querySelectorAll(".section").forEach((section) => section.classList.remove("active"));
  document.getElementById(`section-${id}`)?.classList.add("active");
}

function render() {
  app.innerHTML = state.view === "login" ? loginTemplate() : shellTemplate();
  if (state.view === "app") activateSection(state.active);
}

const actions = {
  login: () => login() && render(),
  logout: () => { logout(); render(); },
  "set-section": (id) => { state.active = id; render(); },
  "save-account": () => saveAccount() && render(),
  "reset-account": () => resetAccountForm(),
  "fill-account": (id) => fillAccountForm(id),
  "toggle-account": (id) => toggleAccountStatus(id) && render(),
  "delete-account": (id) => deleteAccount(id) && render(),
  "import-accounts": async () => { await importAccounts(); render(); },
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  actions[target.dataset.action]?.(target.dataset.id);
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-filter-accounts]")) filterAccounts();
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-filter-accounts]")) filterAccounts();
});

loadData();
render();
