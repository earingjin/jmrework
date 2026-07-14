function goLogin() {
  if (state.user) {
    goDashboard();
    return;
  }
  pushHistory();
  state.view = 'login';
  render();
}

function goLanding() {
  pushHistory();
  state.view = 'landing';
  state.currentReport = null;
  state.editMode = false;
  loadPublicNotices().finally(() => render());
}

function goAppHome() {
  if (!state.user) {
    goLogin();
    return;
  }
  pushHistory();
  state.view = 'app';
  state.active = APP_ROLE === 'admin' ? 'admin' : 'dashboard';
  state.activeModule = defaultReportType();
  state.currentReport = null;
  state.editMode = false;
  state.reportMenuOpen = false;
  loadNotices().finally(() => render());
}

function loginTemplate() {
  const content = LANDING_CONTENT;
  return `<div class="login-screen"><section class="login-hero"><div class="real-hero-copy"><span class="real-hero-badge">${content.hero.badge}</span><h1>${content.hero.title}</h1><p>${content.hero.description}</p></div><div class="real-hero-image"><img src="${LANDING_IMAGES.hero}" alt="${content.hero.imageAlt}"></div></section><section class="login-panel"><div class="login-box"><div class="small">제이엠커리어 임직원 전용(Beta)</div><h2>LOGIN</h2><p>발급받은 상담사 아이디와 비밀번호로 접속합니다.</p><div class="field"><label>아이디</label><input id="loginId" autocomplete="username"></div><div class="field"><label>비밀번호</label><input id="loginPw" type="password" autocomplete="current-password"></div><button type="button" class="btn full" onclick="guardedLogin(this)">접속하기</button><button type="button" class="btn secondary full" onclick="goLanding()" style="margin-top:8px">첫 화면으로 돌아가기</button><div class="demo-info">※ 비밀번호를 변경하신 경우에도 명단 갱신 시 휴대폰 번호 뒷자리 4자리로 초기화될 수 있습니다. 로그인이 되지 않을 경우 먼저 휴대폰 번호 뒷자리 4자리로 다시 시도해 주세요.</div></div></section></div>`;
}

async function login() {
  const loginId = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPw').value;
  const expectedRole = APP_ROLE === 'admin' ? '관리자' : '상담사';
  const errorMessage = '아이디 또는 비밀번호를 확인해주세요';
  if (!loginId || !password) {
    toast(errorMessage);
    return;
  }

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password })
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      const serverAccount = data?.account || null;
      if (serverAccount && normalizeAccountRole(serverAccount.role) === expectedRole) {
        serverAccount.role = normalizeAccountRole(serverAccount.role);
        state.data.accounts = state.data.accounts || [];
        const cacheIndex = state.data.accounts.findIndex((account) => String(account.loginId || '').trim().toLowerCase() === loginId.toLowerCase());
        const cached = {
          id: serverAccount.id,
          loginId: serverAccount.login_id || serverAccount.loginId || loginId,
          name: serverAccount.name || '',
          role: serverAccount.role,
          branch: serverAccount.branch || '미지정',
          status: serverAccount.status || 'active',
          createdAt: serverAccount.created_at || today(),
          lastLoginAt: serverAccount.last_login_at || null,
          loginCount: serverAccount.login_count || 0
        };
        if (data?.token) localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        if (cacheIndex >= 0) {
          state.data.accounts[cacheIndex] = { ...state.data.accounts[cacheIndex], ...cached };
        } else {
          state.data.accounts.push(cached);
        }
        state.user = { accountId: serverAccount.id, loginId: cached.loginId, name: cached.name, role: cached.role };
        pushHistory();
        state.view = 'app';
        state.active = APP_ROLE === 'admin' ? 'admin' : 'dashboard';
        if (!state.selectedParticipantId && state.data.participants[0]) state.selectedParticipantId = state.data.participants[0].id;
        await loadNotices();
        persist();
        render();
        return;
      }
    }
  } catch (err) {
    console.warn('로그인 요청 실패', err);
  }

  toast(errorMessage);
}

async function guardedLogin(button) {
  const oldText = button?.textContent || '접속하기';
  if (button) {
    button.disabled = true;
    button.textContent = '접속 중...';
  }
  try {
    return await login();
  } finally {
    if (button && document.body.contains(button)) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  state.user = null;
  resetSensitiveSessionData();
  state.view = 'landing';
  persist();
  loadPublicNotices().finally(() => render());
}
