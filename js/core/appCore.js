const ACCOUNT_STORAGE_KEY = 'ai_career_accounts_v1';
const LEGACY_STORAGE_KEY = 'ai_career_report_index_v2';
const REPORT_TYPES = {
  SUCCESS: 'success'
};
window.REPORT_TYPES = REPORT_TYPES;

const DEVELOPMENT_MODE = false;
const BRAND_NAME = 'RE:WORK CENTER';
const BRAND_SUBTITLE = 'AI Career Solution';
const APP_ROLE = 'counselor';
const BRAND_LOGO = 'assets/brand-logo.png';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

function sc(section) {
  return SCREEN_CONTENT[section] || {};
}

function flowCardsHtml() {
  return (sc('dashboard').flowCards || [])
    .map(card => `<div class="module-card"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.desc)}</p></div>`)
    .join('');
}

function reportDefinition(type) {
  return window.REPORT_REGISTRY?.get(type) || null;
}

function reportMenuDefinitions() {
  return window.REPORT_REGISTRY?.menuItems() || [];
}

function reportQuickDefinitions() {
  return window.REPORT_REGISTRY?.quickActions() || [];
}

function moduleDescription(type) {
  return reportDefinition(type)?.description || (sc('modules').moduleDesc || {})[type] || '';
}

function moduleNoticeTitle(type) {
  return reportDefinition(type)?.noticeTitle || reportTypeName(type);
}

function defaultReportType() {
  return window.REPORT_REGISTRY?.defaultId?.() || 'interest';
}

const state = {
  view: 'landing',
  user: null,
  active: 'dashboard',
  activeModule: defaultReportType(),
  selectedParticipantId: null,
  selectedNoticeId: null,
  currentReport: null,
  editMode: false,
  reportMenuOpen: true,
  reportGenerationInProgress: false,
  reportGenerationRetryCount: 0,
  history: [],
  data: {
    participants: [{
      id: 'session_client',
      name: '내담자',
      age: '미저장',
      status: '검사결과 분석',
      docStatus: '미저장',
      target: '',
      career: '',
      memo: '',
      createdAt: today()
    }]
  }
};
window.state = state;

function normalizeAccountRole(role) {
  const text = String(role || '').trim().toLowerCase();
  if (['상담사', 'counselor', 'user'].includes(text)) return '상담사';
  if (['관리자', 'admin', 'administrator'].includes(text)) return '관리자';
  return String(role || '').trim();
}

function clearDeprecatedAccountStorage() {
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    if (
      legacy &&
      typeof legacy === 'object' &&
      !Array.isArray(legacy) &&
      Object.prototype.hasOwnProperty.call(legacy, 'accounts')
    ) {
      delete legacy.accounts;
      if (Object.keys(legacy).length) localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
      else localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('legacy 계정 캐시 정리 실패', err);
  }
}

function stripReportBrandLogo(html) {
  return String(html || '').replace(/<img\b[^>]*class=["'][^"']*\breport-brand-logo\b[^"']*["'][^>]*>/gi, '');
}

function reportBrandHeader(title = 'AI Career Solution Report') {
  return `<div class="report-brand-header"><div><div class="report-brand-text">${BRAND_SUBTITLE} Report</div><div class="report-brand-name">${escapeHtml(title)}</div></div></div>`;
}

function withReportBrand(html) {
  return stripReportBrandLogo(html);
}

function storageDefaults() {
  return {
    participants: [{
      id: 'session_client',
      name: '내담자',
      age: '미저장',
      status: '검사결과 분석',
      docStatus: '미저장',
      target: '',
      career: '',
      memo: '',
      createdAt: today()
    }],
    accounts: [],
    notices: []
  };
}

async function load() {
  state.data = storageDefaults();
  clearDeprecatedAccountStorage();
  ensureDefaults();
  state.selectedParticipantId = state.data.participants[0]?.id || 'session_client';
  state.view = 'landing';
  await loadPublicNotices();
  persist();
}

function ensureDefaults() {
  if (!Array.isArray(state.data.participants) || !state.data.participants.length) {
    state.data.participants = storageDefaults().participants;
  }
  if (!Array.isArray(state.data.accounts)) state.data.accounts = [];
  if (!Array.isArray(state.data.notices)) state.data.notices = [];
}

function persist() {
  clearDeprecatedAccountStorage();
}

async function loadNotices() {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    state.data.notices = [];
    return [];
  }
  try {
    const response = await fetch('/api/notices', {
      headers: authHeaders(),
      cache: 'no-store'
    });
    const data = await response.json().catch(() => null);
    state.data.notices = response.ok && Array.isArray(data?.notices) ? data.notices : [];
  } catch (err) {
    console.warn('공지사항 불러오기 실패', err);
    state.data.notices = [];
  }
  return state.data.notices;
}

async function loadPublicNotices() {
  try {
    const response = await fetch('/api/notices/public', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    state.data.notices = response.ok && Array.isArray(data?.notices) ? data.notices : [];
  } catch (err) {
    console.warn('공개 공지사항 불러오기 실패', err);
    state.data.notices = [];
  }
  return state.data.notices;
}

function resetSensitiveSessionData() {
  state.data = { ...storageDefaults() };
  state.selectedParticipantId = state.data.participants[0]?.id || 'session_client';
  state.currentReport = null;
  state.editMode = false;
  state.selectedNoticeId = null;
  state.successResults = [];
  state.successQuery = '';
  state.successInsight = '';
  state.selectedSuccessCaseIds = [];
  state.selectedSuccessCaseId = null;
  state.history = [];
}

function normalizeTokenUsage(usageMetadata = {}) {
  return {
    promptTokens: Number(usageMetadata.promptTokenCount) || 0,
    outputTokens: Number(usageMetadata.candidatesTokenCount) || 0,
    totalTokens: Number(usageMetadata.totalTokenCount) || 0,
    thoughtsTokens: Number(usageMetadata.thoughtsTokenCount) || 0
  };
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(() => el.style.display = 'none', String(msg || '').length > 45 ? 6000 : 3200);
}

function getParticipant() {
  return state.data.participants.find(p => p.id === state.selectedParticipantId) || state.data.participants[0] || null;
}

function reportTypeName(type) {
  return reportDefinition(type)?.title || '리포트';
}

function pageSnapshot() {
  return {
    view: state.view,
    user: state.user ? { ...state.user } : null,
    active: state.active,
    activeModule: state.activeModule,
    selectedParticipantId: state.selectedParticipantId,
    selectedNoticeId: state.selectedNoticeId,
    currentReport: null,
    editMode: false,
    reportMenuOpen: state.reportMenuOpen
  };
}

function pushHistory() {
  const snap = pageSnapshot();
  const last = state.history[state.history.length - 1];
  if (!last || JSON.stringify(last) !== JSON.stringify(snap)) {
    state.history.push(snap);
    if (state.history.length > 40) state.history.shift();
  }
}

function restoreSnapshot(snap) {
  state.view = snap.view;
  state.user = snap.user;
  state.active = snap.active;
  state.activeModule = snap.activeModule;
  state.selectedParticipantId = snap.selectedParticipantId;
  state.selectedNoticeId = snap.selectedNoticeId || null;
  state.currentReport = snap.currentReport;
  state.editMode = snap.editMode;
  state.reportMenuOpen = snap.reportMenuOpen;
}

function goBack() {
  if (!state.history.length) {
    toast('이전 페이지가 없습니다.');
    return;
  }
  const snap = state.history.pop();
  restoreSnapshot(snap);
  render();
}
