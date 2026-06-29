function landingNavLinksHtml() {
  return LANDING_CONTENT.nav
    .map(item => `<a href="${item.href}">${item.label}</a>`)
    .join('');
}

function landingCheckListHtml(items) {
  return items.map(item => `<li>${item}</li>`).join('');
}

function landingChipRowHtml(items) {
  return items.map(item => `<span class="real-chip">${item}</span>`).join('');
}

function landingReportSectionHtml(report) {
  return `
    <section class="real-report-section" id="${report.id}">
      <div class="${report.layoutClass}">
        <div class="real-report-copy">
          <div class="kicker">${report.kicker}</div>
          <h2>${report.title}</h2>
          <p>${report.description}</p>
          <ul class="check-list">
            ${landingCheckListHtml(report.checks)}
          </ul>
          <div class="real-chip-row">
            ${landingChipRowHtml(report.chips)}
          </div>
        </div>
        <div class="real-report-image">
          <img src="${LANDING_IMAGES[report.imageKey]}" alt="${report.imageAlt}">
        </div>
      </div>
    </section>`;
}

function landingQualityCardsHtml() {
  return LANDING_CONTENT.quality.cards
    .map(card => `
      <div class="quality-card">
        <span class="num">${card.number}</span>
        <h3>${card.title}</h3>
        <p>${card.description}</p>
      </div>`)
    .join('');
}

function landingFeatureStripHtml() {
  return LANDING_CONTENT.featureStrip
    .map(item => `
      <div class="real-feature-item">
        <strong>${item.title}</strong>
        <span>${item.description}</span>
      </div>`)
    .join('');
}

function landingNoticeDateText(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function landingNoticeBoardHtml() {
  const notices = (Array.isArray(state.data.notices) ? state.data.notices : [])
    .filter((notice) => notice.status === 'published')
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    })
    .slice(0, 5);
  return `
    <section class="landing-notice-board" aria-label="공지사항">
      <div class="landing-notice-head">
        <strong>공지사항</strong>
        <span>최근 안내</span>
      </div>
      <div class="landing-notice-list">
        ${notices.length ? notices.map((notice) => `
          <div class="landing-notice-row">
            <span>${notice.pinned ? '[고정] ' : ''}${escapeHtml(notice.title)}</span>
            <small>${escapeHtml(landingNoticeDateText(notice.updatedAt || notice.createdAt))}</small>
          </div>`).join('') : '<div class="landing-notice-empty">등록된 공지사항이 없습니다.</div>'}
      </div>
    </section>`;
}

function landingTemplate() {
  const content = LANDING_CONTENT;
  const reports = content.reports;

  return `
    <div class="landing pro-landing">
      <header class="landing-nav">
        <div class="logo">
          <img src="${BRAND_LOGO}" alt="${BRAND_NAME}" class="brand-logo landing-logo">
        </div>
        <nav class="landing-nav-links">
          ${landingNavLinksHtml()}
          <button class="btn" onclick="goLogin()">${content.buttons.login}</button>
        </nav>
      </header>

      <section class="real-hero">
        <div class="real-hero-inner">
          <div class="real-hero-copy">
            <span class="real-hero-badge">${content.hero.badge}</span>
            <h1>${content.hero.title}</h1>
            <p>${content.hero.description}</p>
            <div class="actions">
              <button class="btn" onclick="goLogin()">${content.buttons.start}</button>
              <a class="btn secondary" href="#success-report">${content.buttons.viewReport}</a>
            </div>
            ${landingNoticeBoardHtml()}
          </div>
          <div class="real-hero-image">
            <img src="${LANDING_IMAGES.hero}" alt="${content.hero.imageAlt}">
          </div>
        </div>
      </section>

      ${landingReportSectionHtml(reports.interest)}
      ${landingReportSectionHtml(reports.success)}

      <section class="pro-section" id="${content.quality.id}">
        <div class="pro-section-header">
          <h2>${content.quality.title}</h2>
          <p>${content.quality.description}</p>
        </div>
        <div class="quality-grid">
          ${landingQualityCardsHtml()}
        </div>
      </section>

      <section class="real-feature-strip">
        ${landingFeatureStripHtml()}
      </section>

      <section class="landing-cta">
        <div>
          <h2>${content.cta.title}</h2>
          <p>${content.cta.description}</p>
        </div>
        <button class="btn secondary" onclick="goLogin()">${content.buttons.start}</button>
      </section>

      <footer class="landing-footer">
        <strong>${content.footer.brand}</strong><br>
        ${content.footer.description}
        <div class="landing-copyright">© 2026 JM Career. All Rights Reserved.</div>
      </footer>
    </div>`;
}
