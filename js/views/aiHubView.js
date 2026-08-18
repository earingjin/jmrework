function aiHubTypeOptions(selected = 'GEM') {
  return ['GEM', 'GPT', 'APP']
    .map((type) => `<option value="${type}" ${selected === type ? 'selected' : ''}>${type}</option>`)
    .join('');
}

function aiHubCardsHtml() {
  const items = Array.isArray(state.data.aiHubItems) ? state.data.aiHubItems : [];
  if (!items.length) return '<div class="empty">등록된 AI 도구가 없습니다.</div>';
  return items.map((item) => `
    <article class="resource-card">
      <div class="resource-card-head">
        <span class="pill">${escapeHtml(item.type || 'AI')}</span>
        <small>${escapeHtml(item.createdAt || '')}</small>
      </div>
      <h3>${escapeHtml(item.title || '제목 없음')}</h3>
      <p>${escapeHtml(item.description || '설명이 없습니다.')}</p>
      ${item.url ? `<a class="btn secondary full" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">열기</a>` : ''}
    </article>`).join('');
}

function aiHubSection() {
  return `
    <section id="section-ai-hub" class="section">
      <div class="empty" style="background:transparent;border-color:transparent;min-height:360px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:var(--muted)">
        더 좋은 서비스를 위해 점검중입니다.<br>AI 도구와 활용 자료를 한곳에 모아 상담 업무에 쉽게 참고할 수 있는 공간입니다.
      </div>
    </section>`;
}

function addAiHubItem() {
  const type = val('aiHubType') || 'GEM';
  const title = val('aiHubTitle');
  const url = val('aiHubUrl');
  const description = val('aiHubDescription');
  if (!title || !url) {
    toast('AI 도구 이름과 링크를 입력해주세요.');
    return;
  }
  state.data.aiHubItems = Array.isArray(state.data.aiHubItems) ? state.data.aiHubItems : [];
  state.data.aiHubItems.unshift({ id: uid(), type, title, url, description, createdAt: today() });
  render();
  toast('AI허브에 등록되었습니다.');
}
