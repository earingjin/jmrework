function navButton(id, label) {
  return `<button class="${state.active === id ? 'active' : ''}" onclick="setSection('${id}')"><span>${label}</span><span>›</span></button>`;
}

function subNavButton(definition) {
  const label = definition.menuLabel || definition.title;
  return `<button class="${state.active === 'modules' && state.activeModule === definition.id ? 'active' : ''}" onclick="setReportModule('${definition.id}')"><span>${definition.available ? label : label + ' (준비중)'}</span></button>`;
}

function reportSubNavHtml() {
  return reportMenuDefinitions().map(subNavButton).join('');
}

function setReportModule(module) {
  if (state.active !== 'modules' || state.activeModule !== module) pushHistory();
  state.active = 'modules';
  state.activeModule = module;
  state.currentReport = null;
  state.editMode = false;
  render();
}

function toggleReportMenu() {
  state.reportMenuOpen = !state.reportMenuOpen;
  render();
}

function goDashboard() {
  if (state.active !== 'dashboard') pushHistory();
  state.active = 'dashboard';
  state.activeModule = defaultReportType();
  state.currentReport = null;
  state.editMode = false;
  state.reportMenuOpen = false;
  render();
}

function activeMainSectionHtml() {
  if (state.active === 'modules') return modulesSection();
  if (state.active === 'notices') return noticesSection();
  if (state.active === 'account') return accountSection();
  if (state.active === 'admin') return adminStatsSection();
  return dashboardSection();
}

function shellTemplate() {
  const sideBrand = `<div class="side-brand" role="button" tabindex="0" aria-label="메인 대시보드로 이동" onclick="goDashboard()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goDashboard()}"><img src="${BRAND_LOGO}" alt="${BRAND_NAME}" class="sidebar-logo"><div class="title">${BRAND_NAME}</div><div class="sub">${BRAND_SUBTITLE}</div><div class="role-badge">${escapeHtml(state.user.name)} · ${escapeHtml(state.user.role)}</div></div>`;
  const reportMenuStyle = state.reportMenuOpen ? '' : 'style="display:none"';
  return `<div class="shell"><aside class="sidebar no-print">${sideBrand}<nav class="nav"><button class="${state.active === 'modules' ? 'active' : ''}" onclick="toggleReportMenu()"><span>리포트 생성</span><span>${state.reportMenuOpen ? '⌃' : '⌄'}</span></button><div class="subnav" ${reportMenuStyle}>${reportSubNavHtml()}</div>${navButton('account', '내 계정')}</nav><div style="margin-top:20px;padding:10px"><button class="btn light full" onclick="goLanding()">홈으로</button><button class="btn secondary full" onclick="logout()" style="margin-top:8px">로그아웃</button></div><div class="sidebar-copyright">© 2026 JMCAREER. All Rights Reserved.</div></aside><main class="main">${activeMainSectionHtml()}</main></div>`;
}

function setSection(id) {
  if (state.active !== id) pushHistory();
  state.active = id;
  if (id !== 'modules') {
    state.currentReport = null;
    state.editMode = false;
  }
  render();
}

function activateSection(id) {
  document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
  const el = document.getElementById('section-' + id);
  if (el) el.classList.add('active');
}

function pageTitle(title, desc, actions = '') {
  const backBtn = state.history && state.history.length ? `<button class="btn secondary" onclick="goBack()">← 뒤로가기</button>` : '';
  return `<div class="topbar no-print"><div><h2>${title}</h2><p>${desc}</p></div><div class="actions">${backBtn}${actions}</div></div>`;
}
