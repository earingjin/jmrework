function workspaceIcon(name) {
  const icons = {
    intake: '<path d="M7 4h10v4H7z"></path><path d="M6 8h12v12H6z"></path><path d="M9 12h6"></path><path d="M9 16h4"></path>',
    analyze: '<circle cx="11" cy="11" r="5"></circle><path d="M15 15l4 4"></path><path d="M11 8v6"></path><path d="M8 11h6"></path>',
    draft: '<path d="M5 4h10l4 4v12H5z"></path><path d="M15 4v4h4"></path><path d="M8 13h8"></path><path d="M8 17h6"></path>',
    deliver: '<path d="M4 5h16v14H4z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path><path d="M16 16l2 2 3-4"></path>',
    interest: '<path d="M12 3l8 5v8l-8 5-8-5V8z"></path><path d="M12 7v10"></path><path d="M7.5 10l9 4"></path><path d="M16.5 10l-9 4"></path>',
    success: '<path d="M4 18V6"></path><path d="M4 18h16"></path><path d="M7 15l3-4 3 2 5-7"></path><path d="M16 6h2v2"></path>'
  };
  const svgContent = String(name || '').includes('<path') ? name : icons[name] || icons.draft;
  return `<svg class="workspace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgContent}</svg>`;
}

function workflowStep(icon, title, desc) {
  return `<div class="workflow-step"><span class="workflow-icon">${workspaceIcon(icon)}</span><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></div></div>`;
}

function dashboardQuickCard(module, icon, title, desc) {
  return `<button class="quick-card" onclick="setReportModule('${module}')"><span class="quick-icon">${workspaceIcon(icon)}</span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></button>`;
}

function dashboardQuickActionsHtml() {
  return reportQuickDefinitions().map((definition) => {
    const quick = definition.quickAction;
    return dashboardQuickCard(definition.id, quick.icon, quick.title, quick.description);
  }).join('');
}

function dashboardNoticeBoardHtml() {
  const notices = sortedPublishedNotices().slice(0, 4);
  const rows = notices.map((notice) => {
    const date = noticeDateText(notice.updatedAt || notice.createdAt);
    const pinned = notice.pinned ? '<em>고정</em>' : '';
    return `<button type="button" class="dashboard-notice-row" onclick="openNotice('${escapeHtml(notice.id)}')"><span>${pinned}${escapeHtml(notice.title)}</span><small>${escapeHtml(date)}</small></button>`;
  }).join('');
  const body = rows || '<div class="dashboard-notice-empty">게시된 공지사항이 없습니다.</div>';
  return `<div class="workspace-block dashboard-notice-board"><div class="workspace-head"><div><h3><span class="dashboard-notice-icon">${workspaceIcon('draft')}</span>공지사항</h3><p>관리자가 공유한 최신 안내를 확인하세요.</p></div><button type="button" class="dashboard-notice-refresh" onclick="reloadNotices()">새로고침</button></div><div class="dashboard-notice-list">${body}</div></div>`;
}

function dashboardSection() {
  const name = state.user?.name || '상담사';
  return `<section id="section-dashboard" class="section"><div class="ai-workspace"><div class="workspace-hero"><div><div class="workspace-kicker">RE:WORK AI COUNSELING</div><h1>안녕하세요, ${escapeHtml(name)}님.<br><span class="hero-emphasis">오늘도 AI와 함께 상담 리포트를 빠르게 생성해보세요.</span></h1><p>AI가 초안을 만들고, 상담사가 바로 편집 가능한 리포트를 생성합니다.</p></div><div class="workspace-visual"><div class="workspace-logo-card"><img src="${BRAND_LOGO}" alt="${BRAND_NAME}" class="workspace-logo"><div class="workspace-report-lines"><span></span><span></span><span></span></div></div></div></div>${dashboardNoticeBoardHtml()}<div class="workspace-block"><div class="workspace-head"><div><h3>상담 워크플로우</h3><p>내담자 정보 확인부터 리포트 전달까지 한 화면에서 빠르게 이어갑니다.</p></div></div><div class="workflow-grid">${workflowStep('intake', '정보 입력', '검사 결과 및 상담 메모를 입력합니다.')}${workflowStep('analyze', 'AI 분석', '검사 결과와 경력 조건을 통합합니다.')}${workflowStep('draft', '초안 편집', 'AI 리포트 초안을 상담사가 다듬습니다.')}${workflowStep('deliver', '상담 진행', '더욱 체계적인 상담 진행을 돕습니다.')}</div></div><div class="workspace-block"><div class="workspace-head"><div><h3>빠른 실행</h3><p>자주 사용하는 AI 리포트 생성 화면으로 바로 이동합니다.</p></div></div><div class="quick-grid">${dashboardQuickActionsHtml()}</div></div><div class="workspace-block"><div class="workspace-head"><div><h3>AI 지원 기능</h3><p>생성부터 편집, 저장까지 상담사 업무 흐름에 맞춰 지원합니다.</p></div></div><div class="ai-support-tags"><span class="ai-support-tag">검사 결과 통합 분석</span><span class="ai-support-tag">AI 초안 자동 생성</span><span class="ai-support-tag">상담사 편집 가능</span><span class="ai-support-tag">PDF 저장</span></div></div></div></section>`;
}
