function adminSection() {
  const counselors = state.data.accounts.filter((account) => account.role === "상담사");
  const active = counselors.filter((account) => account.status !== "inactive");
  const used = counselors.filter((account) => Number(account.loginCount) > 0);
  const rows = counselors.map(accountRow).join("");

  return `
    <section id="section-admin" class="section">
      ${pageTitle("상담사 계정 및 사용 현황", "상담사 계정을 생성·삭제하고 서비스 접속 현황을 관리·감독합니다.")}
      <div class="admin-intro"><strong>관리자 페이지 운영 원칙</strong><br>이 화면은 리포트를 만드는 곳이 아닙니다. 상담사 계정과 서비스 사용 현황만 관리합니다.</div>
      <div class="cards">
        <div class="metric"><span>전체 상담사 계정</span><strong>${counselors.length}</strong></div>
        <div class="metric"><span>활성 계정</span><strong>${active.length}</strong></div>
        <div class="metric"><span>접속 이력 있는 계정</span><strong>${used.length}</strong></div>
        <div class="metric"><span>미사용 계정</span><strong>${counselors.length - used.length}</strong></div>
      </div>
      ${accountImportPanel()}
      ${accountForm()}
      ${accountList(rows)}
    </section>`;
}

function accountRow(account) {
  const status = account.status === "inactive" ? "inactive" : "active";
  const branchDisplay = account.branch || "미지정";
  const displayName = maskCounselorName(account.name);
  const search = `${branchDisplay} ${displayName} ${account.loginId} ${status === "active" ? "활성" : "비활성"}`.toLowerCase();
  const passwordSnippet = String(account.password || "").slice(-4);
  return `
    <tr data-account-row data-search="${escapeHtml(search)}" data-status="${status}">
      <td>${escapeHtml(branchDisplay)}</td>
      <td><div class="admin-account-name"><span class="status-dot ${status}"></span><strong>${escapeHtml(displayName)}</strong></div><span class="small">${escapeHtml(account.loginId)} / PW: ****${escapeHtml(passwordSnippet)}</span></td>
      <td>${status === "active" ? '<span class="pill green">활성</span>' : '<span class="pill gray">비활성</span>'}</td>
      <td>${escapeHtml(account.createdAt || "-")}</td>
      <td>${escapeHtml(formatDateTime(account.lastLoginAt))}</td>
      <td>${Number(account.loginCount) || 0}회</td>
      <td class="actions">
        <button class="btn secondary" data-action="fill-account" data-id="${account.id}">수정</button>
        <button class="btn light" data-action="toggle-account" data-id="${account.id}">${status === "active" ? "비활성화" : "활성화"}</button>
        <button class="btn danger" data-action="delete-account" data-id="${account.id}">삭제</button>
      </td>
    </tr>`;
}

function mergeImportedCounselorAccounts(importedAccounts, existingCounselors) {
  const existingByLoginId = new Map(
    existingCounselors
      .map((account) => [normalizeEmail(account.loginId), account])
      .filter(([loginId]) => loginId)
  );

  return importedAccounts.map((importedAccount) => {
    const loginId = normalizeEmail(importedAccount.loginId);
    const existingAccount = existingByLoginId.get(loginId);
    if (!existingAccount) return { ...importedAccount, loginId };

    return {
      ...importedAccount,
      id: existingAccount.id,
      loginId,
      password: existingAccount.password,
      status: existingAccount.status,
      createdAt: existingAccount.createdAt || importedAccount.createdAt,
      lastLoginAt: existingAccount.lastLoginAt || null,
      loginCount: Number(existingAccount.loginCount) || 0,
    };
  });
}

function accountForm() {
  return `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>상담사 계정 생성</h3></div>
        <div class="panel-body">
          <input type="hidden" id="accountId">
          <div class="field"><label>상담사 이름</label><input id="accName" placeholder="예: 홍길동 상담사"></div>
          <div class="field"><label>아이디</label><input id="accLoginId" placeholder="예: counselor02"></div>
          <div class="field"><label>초기 비밀번호</label><input id="accPw" type="password" placeholder="4자 이상"></div>
          <div class="field"><label>지사명</label><input id="accBranch" placeholder="예: 서울지사"></div>
          <div class="actions">
            <button class="btn" data-action="save-account">계정 저장</button>
            <button class="btn secondary" data-action="reset-account">입력 초기화</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>관리 기준</h3></div>
        <div class="panel-body">
          <div class="account-card"><strong>활성 계정</strong><br><span class="small">상담사가 서비스에 로그인할 수 있습니다.</span></div>
          <div class="account-card"><strong>비활성 계정</strong><br><span class="small">계정 정보는 유지하면서 로그인을 차단합니다.</span></div>
          <div class="account-card"><strong>계정 삭제</strong><br><span class="small">더 이상 사용하지 않는 계정을 제거합니다.</span></div>
        </div>
      </div>
    </div>`;
}

function accountImportPanel() {
  const result = state.importResult;
  const summary = result
    ? `<div class="import-result">
         <p>총 행 수: ${result.totalRows}</p>
         <p>등록된 계정 수: ${result.importedCount}</p>
         <p>제외된 행 수: ${result.excludedCount}</p>
       </div>`
    : "";

  return `
    <div class="panel">
      <div class="panel-head"><h3>상담사 계정 엑셀/CSV 업로드</h3></div>
      <div class="panel-body">
        <div class="field"><label>파일 선택</label><input id="accountImportFile" type="file" accept=".csv,.xlsx,.xls"></div>
        <div class="field"><p class="small">지원 파일: CSV, XLSX, XLS. 컬럼명은 이메일, 휴대폰번호, 이름(선택), 지사(선택)를 인식합니다.</p></div>
        <div class="actions"><button class="btn" data-action="import-accounts">업로드 실행</button></div>
        ${summary}
      </div>
    </div>`;
}

function accountList(rows) {
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>지사명</th><th>상담사</th><th>상태</th><th>생성일</th><th>최근 로그인</th><th>누적 접속</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div><div id="accountSearchEmpty" class="empty" style="display:none">검색 조건에 맞는 계정이 없습니다.</div>`
    : '<div class="empty">등록된 상담사 계정이 없습니다.</div>';
  return `
    <div class="panel">
      <div class="panel-head">
        <h3>상담사 계정 목록</h3>
        <div class="admin-tools">
          <input id="accountSearch" data-filter-accounts placeholder="상담사 이름 또는 아이디 검색">
          <select id="accountStatusFilter" data-filter-accounts><option value="all">전체 상태</option><option value="active">활성</option><option value="inactive">비활성</option></select>
        </div>
      </div>
      <div class="panel-body">${contents}</div>
    </div>`;
}

function filterAccounts() {
  const query = val("accountSearch").toLowerCase();
  const status = val("accountStatusFilter") || "all";
  let visible = 0;
  document.querySelectorAll("[data-account-row]").forEach((row) => {
    const show = (row.dataset.search || "").includes(query) && (status === "all" || row.dataset.status === status);
    row.style.display = show ? "" : "none";
    if (show) visible += 1;
  });
  const empty = document.getElementById("accountSearchEmpty");
  if (empty) empty.style.display = visible ? "none" : "block";
}

function saveAccount() {
  const id = val("accountId");
  const nameInput = document.getElementById("accName");
  const enteredName = val("accName");
  const originalName = nameInput?.dataset.originalName || "";
  const name = originalName && enteredName === maskCounselorName(originalName) ? originalName : enteredName;
  const loginId = normalizeEmail(val("accLoginId"));
  const password = val("accPw");
  const branch = val("accBranch") || "미지정";

  if (!name || !loginId || !password) return toast("이름, 아이디, 비밀번호를 모두 입력해주세요."), false;
  if (password.length < 4) return toast("비밀번호는 4자 이상이어야 합니다."), false;
  if (state.data.accounts.some((account) => normalizeEmail(account.loginId) === loginId && account.id !== id)) {
    toast("이미 사용 중인 아이디입니다.");
    return false;
  }

  const old = id ? state.data.accounts.find((account) => account.id === id) : null;
  const item = {
    id: id || uid(), name, loginId, password, role: "상담사", branch,
    createdAt: old?.createdAt || today(), status: old?.status || "active",
    lastLoginAt: old?.lastLoginAt || null, loginCount: Number(old?.loginCount) || 0,
  };
  if (old) state.data.accounts[state.data.accounts.findIndex((account) => account.id === id)] = item;
  else state.data.accounts.push(item);
  persist();
  toast("상담사 계정이 저장되었습니다.");
  return true;
}

function fillAccountForm(id) {
  const account = state.data.accounts.find((item) => item.id === id && item.role === "상담사");
  if (!account) return;
  document.getElementById("accountId").value = account.id;
  const nameInput = document.getElementById("accName");
  nameInput.value = maskCounselorName(account.name);
  nameInput.dataset.originalName = account.name;
  document.getElementById("accLoginId").value = account.loginId;
  document.getElementById("accPw").value = account.password;
  document.getElementById("accBranch").value = account.branch || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAccountForm() {
  ["accountId", "accName", "accLoginId", "accPw", "accBranch"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  const nameInput = document.getElementById("accName");
  if (nameInput) delete nameInput.dataset.originalName;
}

function toggleAccountStatus(id) {
  const account = state.data.accounts.find((item) => item.id === id && item.role === "상담사");
  if (!account) return false;
  account.status = account.status === "inactive" ? "active" : "inactive";
  persist();
  toast(account.status === "active" ? "계정을 활성화했습니다." : "계정을 비활성화했습니다.");
  return true;
}

function deleteAccount(id) {
  const account = state.data.accounts.find((item) => item.id === id && item.role === "상담사");
  if (!account || !confirm(`${maskCounselorName(account.name)} 계정을 삭제할까요?`)) return false;
  state.data.accounts = state.data.accounts.filter((item) => item.id !== id);
  persist();
  toast("계정이 삭제되었습니다.");
  return true;
}

async function importAccounts() {
  const fileInput = document.getElementById("accountImportFile");
  const file = fileInput?.files?.[0];
  if (!file) {
    toast("업로드할 파일을 선택해주세요.");
    return false;
  }

  try {
    const result = await parseCounselorAccountsFromFile(file);
    const adminAccounts = state.data.accounts.filter((account) => account.role === "관리자");
    const existingCounselors = state.data.accounts.filter((account) => account.role === "상담사");
    const counselorAccounts = mergeImportedCounselorAccounts(result.accounts, existingCounselors);
    state.data.accounts = [...adminAccounts, ...counselorAccounts];
    persist();
    state.importResult = result;
    state.active = "admin";
    render();
    const searchInput = document.getElementById("accountSearch");
    const statusFilter = document.getElementById("accountStatusFilter");
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    filterAccounts();
    toast("기존 상담사 명단이 삭제되고 신규 명단으로 교체되었습니다.");
    return true;
  } catch (error) {
    toast(error.message || "파일 업로드 중 오류가 발생했습니다.");
    return false;
  }
}
