function noticeDateText(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function noticeBodyHtml(content = '') {
  return escapeHtml(content).replace(/\r?\n/g, '<br>');
}

function sortedPublishedNotices() {
  return (Array.isArray(state.data.notices) ? state.data.notices : [])
    .filter((notice) => notice.status === 'published')
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
    });
}

function selectedNotice() {
  const notices = sortedPublishedNotices();
  return notices.find((notice) => notice.id === state.selectedNoticeId) || null;
}

function openNoticeList() {
  if (state.active !== 'notices' || state.selectedNoticeId) pushHistory();
  state.active = 'notices';
  state.selectedNoticeId = null;
  state.currentReport = null;
  state.editMode = false;
  render();
}

function openNotice(id) {
  if (state.active !== 'notices' || state.selectedNoticeId !== id) pushHistory();
  state.active = 'notices';
  state.selectedNoticeId = id;
  state.currentReport = null;
  state.editMode = false;
  render();
}

async function reloadNotices() {
  await loadNotices();
  if (!selectedNotice()) state.selectedNoticeId = null;
  render();
}

function noticesSection() {
  const notices = sortedPublishedNotices();
  const notice = selectedNotice();
  const actions = '<button class="btn secondary" onclick="reloadNotices()">새로고침</button>';
  if (!notices.length) {
    return `<section id="section-notices" class="section">${pageTitle('공지사항', '관리자가 게시한 공지사항을 확인합니다.', actions)}<div class="empty">게시된 공지사항이 없습니다.</div></section>`;
  }
  const listRows = notices
    .map((item) => `<button class="${notice && item.id === notice.id ? 'active' : ''}" onclick="openNotice('${escapeHtml(item.id)}')"><span>${item.pinned ? '[고정] ' : ''}${escapeHtml(item.title)}</span><span>${escapeHtml(noticeDateText(item.updatedAt || item.createdAt))}</span></button>`)
    .join('');
  const detailHtml = notice
    ? `<article class="panel notice-detail-panel">
          <div class="panel-head">
            <div>
              <h3>${notice.pinned ? '[고정] ' : ''}${escapeHtml(notice.title)}</h3>
              <span class="small">${escapeHtml(noticeDateText(notice.updatedAt || notice.createdAt))}</span>
            </div>
            <button type="button" class="btn secondary" onclick="openNoticeList()">목록으로 돌아가기</button>
          </div>
          <div class="panel-body notice-content">${noticeBodyHtml(notice.content)}</div>
        </article>`
    : '';
  return `
    <section id="section-notices" class="section">
      ${pageTitle('공지사항', '관리자가 게시한 공지사항을 확인합니다.', actions)}
      <div class="notice-layout ${notice ? '' : 'notice-layout-list-only'}">
        <aside class="notice-list-panel no-print">
          <h3>공지 목록</h3>
          <div class="notice-list">${listRows}</div>
        </aside>
        ${detailHtml}
      </div>
    </section>`;
}

window.openNoticeList = openNoticeList;
