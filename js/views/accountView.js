function accountSection() {
  if (!state.user || state.user.role === '관리자') return `<section id="section-account" class="section"></section>`;
  return `<section id="section-account" class="section">${pageTitle(sc('account').title, sc('account').desc)}<div class="panel"><div class="panel-head"><h3>${sc('account').passwordTitle}</h3></div><div class="panel-body"><div class="account-card"><strong>${escapeHtml(state.user.name)}</strong><br><span class="small">아이디: ${escapeHtml(state.user.loginId)} · 권한: ${escapeHtml(state.user.role)}</span></div><div class="field"><label>현재 비밀번호</label><input id="currentPw" type="password" autocomplete="current-password"></div><div class="field"><label>새 비밀번호</label><input id="newPw" type="password" autocomplete="new-password"></div><div class="field"><label>새 비밀번호 확인</label><input id="newPw2" type="password" autocomplete="new-password"></div><button class="btn" onclick="changeMyPassword()">비밀번호 변경</button></div></div></section>`;
}

async function changeMyPassword() {
  const currentPassword = val('currentPw');
  const newPassword = val('newPw');
  const newPasswordConfirm = val('newPw2');
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    toast('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
    return;
  }
  if (newPassword.length < 4) {
    toast('새 비밀번호는 4자 이상으로 입력해주세요.');
    return;
  }
  if (newPassword !== newPasswordConfirm) {
    toast('새 비밀번호 확인이 일치하지 않습니다.');
    return;
  }
  try {
    const resp = await authenticatedFetch('/api/auth/password', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!resp.ok) {
      toast(resp.status === 401 ? '현재 비밀번호가 일치하지 않습니다.' : '비밀번호 변경에 실패했습니다.');
      return;
    }
    toast('비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해주세요.');
    ['currentPw', 'newPw', 'newPw2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    logout();
  } catch (err) {
    console.warn('비밀번호 변경 요청 실패', err);
    toast('비밀번호 변경에 실패했습니다.');
  }
}
