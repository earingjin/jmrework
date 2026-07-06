function landingNavLinksHtml() {
  return LANDING_CONTENT.nav
    .map(item => `<a href="${item.href}">${item.label}</a>`)
    .join('');
}

function landingAuthButtonHtml() {
  if (state.user) return '<button class="btn" onclick="logout()">로그아웃</button>';
  return `<button class="btn" onclick="goLogin()">${LANDING_CONTENT.buttons.login}</button>`;
}

function landingStartButtonHtml(className = 'btn') {
  if (state.user) return `<button class="${className}" onclick="goAppHome()">대시보드로 이동</button>`;
  return `<button class="${className}" onclick="goLogin()">${LANDING_CONTENT.buttons.start}</button>`;
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
          <button type="button" class="landing-notice-row" onclick="openLandingNotice('${escapeHtml(notice.id)}')">
            <span>${notice.pinned ? '[고정] ' : ''}${escapeHtml(notice.title)}</span>
            <small>${escapeHtml(landingNoticeDateText(notice.updatedAt || notice.createdAt))}</small>
          </button>`).join('') : '<div class="landing-notice-empty">등록된 공지사항이 없습니다.</div>'}
      </div>
    </section>`;
}

function landingNoticeModalHtml() {
  return `
    <div id="landingNoticeModal" class="landing-notice-modal hidden" role="dialog" aria-modal="true" aria-labelledby="landingNoticeModalTitle" onclick="if(event.target===this)closeLandingNotice()">
      <article class="landing-notice-dialog">
        <div class="landing-notice-dialog-head">
          <button type="button" class="landing-notice-close" aria-label="공지사항 닫기" onclick="closeLandingNotice()">×</button>
          <span>공지사항</span>
          <h3 id="landingNoticeModalTitle"></h3>
          <small id="landingNoticeModalDate"></small>
        </div>
        <div id="landingNoticeModalContent" class="landing-notice-dialog-content"></div>
      </article>
    </div>`;
}

function landingNoticeById(id) {
  return (Array.isArray(state.data.notices) ? state.data.notices : []).find((notice) => String(notice.id) === String(id));
}

function openLandingNotice(id) {
  const notice = landingNoticeById(id);
  if (!notice) return;
  const modal = document.getElementById('landingNoticeModal');
  const title = document.getElementById('landingNoticeModalTitle');
  const date = document.getElementById('landingNoticeModalDate');
  const content = document.getElementById('landingNoticeModalContent');
  if (!modal || !title || !date || !content) return;
  title.textContent = `${notice.pinned ? '[고정] ' : ''}${notice.title || ''}`;
  date.textContent = landingNoticeDateText(notice.updatedAt || notice.createdAt);
  content.innerHTML = escapeHtml(notice.content || '').replace(/\r?\n/g, '<br>');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeLandingNotice() {
  const modal = document.getElementById('landingNoticeModal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function privacyPolicyModalHtml() {
  return `
    <div id="privacyPolicyModal" class="privacy-policy-modal hidden" role="dialog" aria-modal="true" aria-labelledby="privacyPolicyModalTitle" onclick="if(event.target===this)closePrivacyPolicy()">
      <article class="privacy-policy-dialog">
        <header class="privacy-policy-head">
          <button type="button" class="privacy-policy-close" aria-label="개인정보처리방침 닫기" onclick="closePrivacyPolicy()">×</button>
          <span>정책 안내</span>
          <h3 id="privacyPolicyModalTitle">개인정보처리방침</h3>
        </header>
        <iframe class="privacy-policy-frame" src="/privacy.html?embed=1" title="개인정보처리방침"></iframe>
      </article>
    </div>`;
}

function openPrivacyPolicy() {
  const modal = document.getElementById('privacyPolicyModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closePrivacyPolicy() {
  const modal = document.getElementById('privacyPolicyModal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
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
          ${landingAuthButtonHtml()}
        </nav>
      </header>

      <section class="real-hero">
        <div class="real-hero-inner">
          <div class="real-hero-copy">
            <span class="real-hero-badge">${content.hero.badge}</span>
            <h1>${content.hero.title}</h1>
            <p>${content.hero.description}</p>
            <div class="actions">
              ${landingStartButtonHtml()}
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
        ${landingStartButtonHtml('btn secondary')}
      </section>

      <footer class="landing-footer">
        <div class="landing-policy-links"><button type="button" onclick="openPrivacyPolicy()">개인정보처리방침</button></div>
        <div class="landing-footer-brand">
          <strong>${content.footer.brand}</strong><br>
          ${content.footer.description}
        </div>
        <div class="landing-company-info">서울특별시 영등포구 경인로 775 (문래동3가 55-20, 에이스하이테크시티 1동 9층)<br>TEL. (02)703-9900 FAX. (02)703-9182 사업자번호 : 210-81-36536 대표 : 윤종만</div>
        <div class="landing-legal-row">
          <span class="landing-copyright-text">© 2026 JMCAREER. All Rights Reserved.</span>
        </div>
      </footer>
      ${landingNoticeModalHtml()}
      ${privacyPolicyModalHtml()}
    </div>`;
}

window.openLandingNotice = openLandingNotice;
window.closeLandingNotice = closeLandingNotice;
window.openPrivacyPolicy = openPrivacyPolicy;
window.closePrivacyPolicy = closePrivacyPolicy;
