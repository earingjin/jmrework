function loginTemplate() {
  return `
    <div class="login-screen">
      <section class="login-hero">
        <div class="login-brand">RE:WORK CENTER</div>
        <h1>관리자 페이지</h1>
        <p>상담사 계정을 생성·삭제하고 서비스 사용 현황과 리포트 생성 통계를 관리합니다.</p>
        <div class="login-copyright">© 2026 JMCareer. All Rights Reserved.</div>
      </section>
      <section class="login-panel">
        <div class="login-box">
          <h2>관리자 로그인</h2>
          <p>관리자 계정으로 접속해주세요.</p>
          <div class="field"><label>아이디</label><input id="loginId" value="admin"></div>
          <div class="field"><label>비밀번호</label><input id="loginPw" type="password" value="admin123"></div>
          <button class="btn full" data-action="login">접속하기</button>
          <div class="demo-info">시연용 계정: admin / admin123</div>
        </div>
      </section>
    </div>`;
}

function isAdminRole(role) {
  return ["admin", "administrator", "관리자"].includes(String(role || "").trim().toLowerCase());
}

async function login() {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: val("loginId"), password: val("loginPw") }),
    });
    const data = await response.json().catch(() => null);
    const account = data?.account;

    if (!response.ok || !account || !isAdminRole(account.role) || !data?.token) {
      toast("관리자 계정 정보가 올바르지 않습니다.");
      return false;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    state.user = { accountId: account.id, name: account.name, role: account.role };
    state.view = "app";
    state.active = "admin";
    return true;
  } catch {
    toast("관리자 계정 정보가 올바르지 않습니다.");
    return false;
  }
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  state.user = null;
  state.view = "login";
}
