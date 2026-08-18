const ACCOUNT_STORAGE_KEY = 'ai_career_accounts_v1';
const AUTH_ACCOUNT_STORAGE_KEY = 'REWORK_AUTH_ACCOUNT';
const APP_LOCATION_STORAGE_KEY = 'REWORK_APP_LOCATION';
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
  pendingSection: null,
  editingCommunityPostId: null,
  currentReport: null,
  editMode: false,
  reportMenuOpen: true,
  reportGenerationInProgress: false,
  reportGenerationRetryCount: 0,
  history: [],
  authRestoreMessage: '',
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
    }],
    aiHubItems: [
      { id: 'hub_gem_report', type: 'GEM', title: '직업선호도 리포트 작성 보조', url: 'https://gemini.google.com/', description: '검사 결과를 바탕으로 상담 리포트 초안을 준비할 때 참고하는 GEM입니다.', createdAt: today() },
      { id: 'hub_gpt_resume', type: 'GPT', title: '자기소개서 초안 코치', url: 'https://chatgpt.com/gpts', description: '경력 전환 지원서와 자기소개서 초안을 점검하는 GPT입니다.', createdAt: today() }
    ],
    communityPosts: []
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
    aiHubItems: [
      { id: 'hub_gem_report', type: 'GEM', title: '직업선호도 리포트 작성 보조', url: 'https://gemini.google.com/', description: '검사 결과를 바탕으로 상담 리포트 초안을 준비할 때 참고하는 GEM입니다.', createdAt: today() },
      { id: 'hub_gpt_resume', type: 'GPT', title: '자기소개서 초안 코치', url: 'https://chatgpt.com/gpts', description: '경력 전환 지원서와 자기소개서 초안을 점검하는 GPT입니다.', createdAt: today() }
    ],
    communityPosts: [],
    accounts: [],
    notices: []
  };
}

function validAppSection(id) {
  return ['dashboard', 'modules', 'notices', 'ai-hub', 'community', 'account', 'admin'].includes(String(id || ''));
}

function readSavedAppLocation() {
  try {
    const location = JSON.parse(localStorage.getItem(APP_LOCATION_STORAGE_KEY) || 'null');
    return location && typeof location === 'object' ? location : null;
  } catch {
    return null;
  }
}

function applySavedAppLocation(defaultActive = 'dashboard') {
  const location = readSavedAppLocation();
  const active = validAppSection(location?.active) ? location.active : defaultActive;
  state.active = active;
  state.activeModule = location?.activeModule || defaultReportType();
  state.selectedNoticeId = location?.selectedNoticeId || null;
  state.reportMenuOpen = typeof location?.reportMenuOpen === 'boolean'
    ? location.reportMenuOpen
    : active === 'modules';
}

async function loadActiveSectionData() {
  if (state.active === 'community') await loadCommunityPosts();
  else if (state.active === 'notices') await loadNotices();
}

function saveAppLocation() {
  if (!state.user || !['app', 'landing'].includes(state.view)) return;
  localStorage.setItem(APP_LOCATION_STORAGE_KEY, JSON.stringify({
    view: state.view,
    active: state.active,
    activeModule: state.activeModule,
    selectedNoticeId: state.selectedNoticeId || null,
    reportMenuOpen: state.reportMenuOpen
  }));
}

async function load() {
  state.data = storageDefaults();
  clearDeprecatedAccountStorage();
  ensureDefaults();
  state.selectedParticipantId = state.data.participants[0]?.id || 'session_client';
  const restored = await restoreAuthenticatedUser();
  if (!restored) {
    state.view = state.authRestoreMessage ? 'login' : 'landing';
    await loadPublicNotices();
  }
  persist();
}

async function restoreAuthenticatedUser() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/me', {
      headers: authHeaders(),
      cache: 'no-store'
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401 || response.status === 403) {
      clearAuthenticatedSession('로그인 정보가 만료되었거나 더 이상 유효하지 않습니다. 다시 로그인해주세요.');
      return false;
    }

    const account = data?.account;
    if (!response.ok || !account) {
      blockAuthenticatedSession('서버 문제로 로그인 상태를 확인할 수 없습니다. 연결이 복구되면 새로고침해 다시 확인해주세요.');
      return false;
    }
    if (account.roleKey && account.roleKey !== APP_ROLE) {
      clearAuthenticatedSession('이 계정은 상담사 화면에 접근할 수 없습니다.');
      return false;
    }

    const cached = {
      id: account.id,
      loginId: account.login_id || account.loginId || '',
      name: account.name || '',
      role: normalizeAccountRole(account.role),
      branch: account.branch || '미지정',
      status: account.status || 'active',
      createdAt: account.created_at || today(),
      lastLoginAt: account.last_login_at || null,
      loginCount: account.login_count || 0
    };

    state.data.accounts = [cached];
    state.user = { accountId: account.id, loginId: cached.loginId, name: cached.name, role: cached.role };
    state.authRestoreMessage = '';
    localStorage.setItem(AUTH_ACCOUNT_STORAGE_KEY, JSON.stringify(cached));
    if (readSavedAppLocation()?.view === 'landing') {
      state.view = 'landing';
      await loadPublicNotices();
      return true;
    }
    state.view = 'app';
    applySavedAppLocation('dashboard');
    state.pendingSection = null;
    state.currentReport = null;
    state.editMode = false;
    await loadNotices();
    await loadActiveSectionData();
    return true;
  } catch (err) {
    console.warn('로그인 상태 복원 실패', err);
    blockAuthenticatedSession('네트워크 문제로 로그인 상태를 확인할 수 없습니다. 연결이 복구되면 새로고침해 다시 확인해주세요.');
    return false;
  }
}

function clearAuthenticatedSession(message = '') {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ACCOUNT_STORAGE_KEY);
  localStorage.removeItem(APP_LOCATION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem('ai_career_usage_events_v1');
  state.user = null;
  resetSensitiveSessionData();
  state.authRestoreMessage = message;
}

function blockAuthenticatedSession(message = '') {
  localStorage.removeItem(AUTH_ACCOUNT_STORAGE_KEY);
  localStorage.removeItem(APP_LOCATION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem('ai_career_usage_events_v1');
  state.user = null;
  resetSensitiveSessionData();
  state.authRestoreMessage = message;
}

let authenticatedRequestController = null;
function getAuthenticatedRequestController() {
  if (!authenticatedRequestController) {
    authenticatedRequestController = AuthSession.createController({
      storage: localStorage,
      sensitiveKeys: [AUTH_TOKEN_KEY, AUTH_ACCOUNT_STORAGE_KEY, APP_LOCATION_STORAGE_KEY, LEGACY_STORAGE_KEY, 'ai_career_usage_events_v1'],
      resetSensitiveState: () => resetSensitiveSessionData(),
      onUnauthorized: () => {
        state.user = null;
        state.authRestoreMessage = '로그인 정보가 만료되었습니다. 다시 로그인해주세요.';
        state.view = 'login';
        if (document.getElementById('app')) render();
      },
      onForbidden: () => toast('이 작업을 수행할 권한이 없습니다.'),
      onServiceError: () => toast('서버 문제로 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.'),
      onNetworkError: () => toast('네트워크 연결을 확인한 뒤 다시 시도해주세요.')
    });
  }
  return authenticatedRequestController;
}

function authenticatedFetch(input, init = {}, context = {}) {
  return getAuthenticatedRequestController().authenticatedFetch(input, init, context);
}

function resetAuthenticatedRequestGuard() {
  getAuthenticatedRequestController().resetInvalidation();
}

function ensureDefaults() {
  if (!Array.isArray(state.data.participants) || !state.data.participants.length) {
    state.data.participants = storageDefaults().participants;
  }
  if (!Array.isArray(state.data.aiHubItems)) state.data.aiHubItems = storageDefaults().aiHubItems;
  if (!Array.isArray(state.data.communityPosts)) state.data.communityPosts = [];
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
    const response = await authenticatedFetch('/api/notices', {
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

async function loadCommunityPosts() {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    state.data.communityPosts = [];
    return [];
  }
  try {
    const response = await authenticatedFetch('/api/community-posts', {
      headers: authHeaders(),
      cache: 'no-store'
    });
    const data = await response.json().catch(() => null);
    state.data.communityPosts = response.ok && Array.isArray(data?.posts) ? data.posts : [];
  } catch (err) {
    console.warn('커뮤니티 게시글 불러오기 실패', err);
    state.data.communityPosts = [];
  }
  return state.data.communityPosts;
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
  state.pendingSection = null;
  state.editingCommunityPostId = null;
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
