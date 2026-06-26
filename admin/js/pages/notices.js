function noticeStatusLabel(status) {
  return {
    published: "게시",
    draft: "임시저장",
    archived: "보관",
  }[status] || status || "임시저장";
}

function noticeStatusPill(status) {
  const color = status === "published" ? "green" : "gray";
  return `<span class="pill ${color}">${escapeHtml(noticeStatusLabel(status))}</span>`;
}

function noticeContentPreview(content) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function noticeForm() {
  return `
    <div class="panel">
      <div class="panel-head"><h3>공지사항 작성</h3></div>
      <div class="panel-body">
        <input type="hidden" id="noticeId">
        <div class="grid-2">
          <div class="field"><label>제목</label><input id="noticeTitle" maxlength="160" placeholder="상담사 사이드바에 표시될 제목"></div>
          <div class="field"><label>상태</label><select id="noticeStatus"><option value="published">게시</option><option value="draft">임시저장</option><option value="archived">보관</option></select></div>
        </div>
        <label class="field checkbox-field"><input id="noticePinned" type="checkbox"> 상단 고정</label>
        <div class="field"><label>본문</label><textarea id="noticeContent" maxlength="20000" placeholder="상담사에게 보여줄 공지 내용을 입력하세요."></textarea></div>
        <div class="actions">
          <button class="btn" data-action="save-notice">공지 저장</button>
          <button class="btn secondary" data-action="reset-notice">입력 초기화</button>
        </div>
      </div>
    </div>`;
}

function noticeRow(notice) {
  const updatedAt = formatDateTime(notice.updatedAt || notice.updated_at || notice.createdAt || notice.created_at);
  const pinned = notice.pinned ? '<span class="pill green">고정</span>' : '<span class="pill gray">일반</span>';
  return `
    <tr>
      <td><strong>${escapeHtml(notice.title)}</strong><br><span class="small">${escapeHtml(noticeContentPreview(notice.content))}</span></td>
      <td>${noticeStatusPill(notice.status)}</td>
      <td>${pinned}</td>
      <td>${escapeHtml(updatedAt)}</td>
      <td class="actions">
        <button class="btn secondary" data-action="fill-notice" data-id="${escapeHtml(notice.id)}">수정</button>
        <button class="btn danger" data-action="delete-notice" data-id="${escapeHtml(notice.id)}">삭제</button>
      </td>
    </tr>`;
}

function noticeList() {
  const notices = Array.isArray(state.data.notices) ? state.data.notices : [];
  const rows = notices.map(noticeRow).join("");
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>공지</th><th>상태</th><th>고정</th><th>수정일</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="empty">등록된 공지사항이 없습니다.</div>';
  return `
    <div class="panel">
      <div class="panel-head">
        <div><h3>공지사항 목록</h3><span class="small">게시 상태인 공지만 상담사 페이지에 노출됩니다.</span></div>
        <button class="btn secondary" data-action="reload-notices">새로고침</button>
      </div>
      <div class="panel-body">${contents}</div>
    </div>`;
}

function noticesSection() {
  const notices = Array.isArray(state.data.notices) ? state.data.notices : [];
  const published = notices.filter((notice) => notice.status === "published");
  const drafts = notices.filter((notice) => notice.status === "draft");
  const pinned = notices.filter((notice) => notice.pinned && notice.status === "published");
  return `
    <section id="section-notices" class="section">
      ${pageTitle("공지사항 관리", "관리자가 작성한 공지 제목과 본문을 상담사 페이지에 노출합니다.")}
      <div class="cards">
        <div class="metric"><span>전체 공지</span><strong>${numberText(notices.length)}</strong></div>
        <div class="metric"><span>게시 중</span><strong>${numberText(published.length)}</strong></div>
        <div class="metric"><span>상단 고정</span><strong>${numberText(pinned.length)}</strong></div>
        <div class="metric"><span>임시저장</span><strong>${numberText(drafts.length)}</strong></div>
      </div>
      ${noticeForm()}
      ${noticeList()}
    </section>`;
}

function noticePayloadFromForm() {
  return {
    title: val("noticeTitle"),
    content: val("noticeContent"),
    status: val("noticeStatus") || "draft",
    pinned: Boolean(document.getElementById("noticePinned")?.checked),
  };
}

async function saveNotice() {
  const id = val("noticeId");
  const payload = noticePayloadFromForm();
  if (!payload.title || !payload.content) {
    toast("공지 제목과 본문을 입력해주세요.");
    return false;
  }

  try {
    const response = await authFetch(id ? `/api/notices/${encodeURIComponent(id)}` : "/api/notices", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.notice) {
      toast(data?.error?.message || "공지사항 저장 중 오류가 발생했습니다.");
      return false;
    }
    const notice = data.notice;
    const index = state.data.notices.findIndex((item) => item.id === notice.id);
    if (index >= 0) state.data.notices[index] = notice;
    else state.data.notices.unshift(notice);
    resetNoticeForm();
    toast("공지사항이 저장되었습니다.");
    return true;
  } catch (err) {
    console.error("saveNotice error", err);
    toast("공지사항 저장 중 오류가 발생했습니다.");
    return false;
  }
}

function fillNoticeForm(id) {
  const notice = state.data.notices.find((item) => item.id === id);
  if (!notice) return;
  document.getElementById("noticeId").value = notice.id;
  document.getElementById("noticeTitle").value = notice.title || "";
  document.getElementById("noticeStatus").value = notice.status || "draft";
  document.getElementById("noticePinned").checked = Boolean(notice.pinned);
  document.getElementById("noticeContent").value = notice.content || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetNoticeForm() {
  ["noticeId", "noticeTitle", "noticeContent"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  const status = document.getElementById("noticeStatus");
  if (status) status.value = "published";
  const pinned = document.getElementById("noticePinned");
  if (pinned) pinned.checked = false;
}

async function deleteNotice(id) {
  const notice = state.data.notices.find((item) => item.id === id);
  if (!notice || !confirm(`"${notice.title}" 공지사항을 삭제할까요?`)) return false;
  try {
    const response = await authFetch(`/api/notices/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast(data?.error?.message || "공지사항 삭제 중 오류가 발생했습니다.");
      return false;
    }
    state.data.notices = state.data.notices.filter((item) => item.id !== id);
    toast("공지사항이 삭제되었습니다.");
    return true;
  } catch (err) {
    console.error("deleteNotice error", err);
    toast("공지사항 삭제 중 오류가 발생했습니다.");
    return false;
  }
}
