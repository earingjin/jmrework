const LEGACY_STORAGE_KEY = "ai_career_report_index_v2";
const ACCOUNT_STORAGE_KEY = "ai_career_accounts_v1";
const USAGE_EVENT_STORAGE_KEY = "ai_career_usage_events_v1";
const AUTH_TOKEN_KEY = "REWORK_AUTH_TOKEN";
const NOTICES_CACHE_KEY = "rework_admin_notices_cache_v1";

function authHeaders(headers = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

let adminAuthController = null;
function getAdminAuthController() {
  if (!adminAuthController) {
    adminAuthController = AuthSession.createController({
      storage: localStorage,
      sensitiveKeys: [AUTH_TOKEN_KEY, ACCOUNT_STORAGE_KEY, LEGACY_STORAGE_KEY, USAGE_EVENT_STORAGE_KEY, NOTICES_CACHE_KEY],
      resetSensitiveState: () => {
        state.data = { accounts: [], reports: [], notices: [], successCases: [], successCaseBatches: [], usageEvents: [], geminiErrors: [] };
      },
      onUnauthorized: () => {
        state.user = null;
        state.view = 'login';
        state.authRestoreMessage = '로그인 정보가 만료되었습니다. 다시 로그인해주세요.';
        if (typeof render === 'function') render();
      },
      onForbidden: () => toast('이 작업을 수행할 권한이 없습니다.'),
      onServiceError: () => showAdminServiceUnavailable('서버 문제로 관리자 데이터를 확인할 수 없습니다. 잠시 후 새로고침해주세요.'),
      onNetworkError: () => showAdminServiceUnavailable('네트워크 연결을 확인한 뒤 새로고침해주세요.')
    });
  }
  return adminAuthController;
}

function showAdminServiceUnavailable(message) {
  state.view = 'login';
  state.authRestoreMessage = message;
  state.data = { accounts: [], reports: [], notices: [], successCases: [], successCaseBatches: [], usageEvents: [], geminiErrors: [] };
  if (typeof render === 'function') render();
}

function authFetch(url, options = {}) {
  return getAdminAuthController().authenticatedFetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
}

function parseStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function stripAccountSecrets(accounts) {
  return (Array.isArray(accounts) ? accounts : []).map(({ password, password_hash, passwordHash, ...account }) => account);
}

function normalizeAccountRoleForStorage(role) {
  const value = String(role || "").trim().toLowerCase();
  if (["상담사", "counselor", "user"].includes(value)) return "상담사";
  if (["관리자", "admin", "administrator"].includes(value)) return "관리자";
  return String(role || "").trim();
}

function mergeStoredAccounts(...groups) {
  const map = new Map();
  groups.flat().forEach((account) => {
    const loginId = String(account?.loginId || account?.login_id || "").trim();
    if (!loginId) return;
    map.set(loginId.toLowerCase(), { ...account, loginId });
  });
  return Array.from(map.values());
}

async function migrateLocalCounselorsToServer(localAccounts, serverAccounts) {
  const serverHasCounselors = (serverAccounts || []).some((account) => normalizeAccountRoleForStorage(account.role) === "상담사");
  if (serverHasCounselors) return serverAccounts;

  const counselorAccounts = mergeStoredAccounts(localAccounts)
    .filter((account) => normalizeAccountRoleForStorage(account.role) === "상담사")
    .filter((account) => account.loginId && account.password);

  if (!counselorAccounts.length) return serverAccounts;

  const response = await authFetch("/api/accounts/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accounts: counselorAccounts }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.accounts)) return serverAccounts;
  return data.accounts;
}

function persist() {
  const existing = parseStorage(ACCOUNT_STORAGE_KEY) || {};
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({
    ...existing,
    accounts: stripAccountSecrets(state.data.accounts),
  }));
}

async function loadData() {
  const savedAccounts = parseStorage(ACCOUNT_STORAGE_KEY);
  const legacySaved = parseStorage(LEGACY_STORAGE_KEY);
  const savedUsageEvents = parseStorage(USAGE_EVENT_STORAGE_KEY);
  const localAccounts = mergeStoredAccounts(
    Array.isArray(savedAccounts?.accounts) ? savedAccounts.accounts : [],
    Array.isArray(legacySaved?.accounts) ? legacySaved.accounts : []
  );

  let accounts = [];

  // try to load accounts from server DB first
  try {
    const response = await authFetch("/api/accounts", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    if (!Array.isArray(data?.accounts)) return false;
    accounts = await migrateLocalCounselorsToServer(localAccounts, data.accounts);
  } catch (err) {
    return false;
  }

  const usageEvents = Array.isArray(savedUsageEvents)
    ? savedUsageEvents
    : Array.isArray(savedUsageEvents?.usageEvents)
      ? savedUsageEvents.usageEvents
      : [];

  state.data = {
    accounts: stripAccountSecrets(accounts),
    reports: [],
    notices: [],
    successCases: [],
    successCaseBatches: [],
    usageEvents,
    geminiErrors: [],
  };

  state.data.accounts.forEach((account) => {
    if (!account.status) account.status = "active";
    if (!Number.isFinite(account.loginCount)) account.loginCount = 0;
  });

  persist();
  await loadNotices();
  return true;
}

async function loadUsageEvents() {
  const savedUsageEvents = parseStorage(USAGE_EVENT_STORAGE_KEY);
  const localUsageEvents = Array.isArray(savedUsageEvents)
    ? savedUsageEvents
    : Array.isArray(savedUsageEvents?.usageEvents)
      ? savedUsageEvents.usageEvents
      : [];
  const mergeEvents = (serverEvents) => {
    const seen = new Set();
    state.data.usageEvents = [...serverEvents, ...localUsageEvents].filter((event) => {
      const key = event?.id || `${event?.recordedAt}|${event?.eventName}|${JSON.stringify(event?.payload || {})}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  try {
    const response = await authFetch("/api/usage-events?limit=20000", { cache: "no-store" });
    const data = await response.json();
    mergeEvents(response.ok && Array.isArray(data?.events) ? data.events : []);
  } catch {
    state.data.usageEvents = localUsageEvents;
  }
}

async function loadGeminiErrors() {
  try {
    const response = await authFetch("/api/gemini-errors", { cache: "no-store" });
    const data = await response.json();
    state.data.geminiErrors = response.ok && Array.isArray(data?.errors) ? data.errors : [];
  } catch {
    state.data.geminiErrors = [];
  }
}

async function loadNotices() {
  const cachedNotices = parseStorage(NOTICES_CACHE_KEY);
  if (Array.isArray(cachedNotices) && !state.data.notices.length) {
    state.data.notices = cachedNotices;
  }
  try {
    const response = await authFetch("/api/notices/admin", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok && Array.isArray(data?.notices)) {
      state.data.notices = data.notices;
      localStorage.setItem(NOTICES_CACHE_KEY, JSON.stringify(data.notices));
    }
  } catch {
    if (!Array.isArray(state.data.notices)) state.data.notices = [];
  }
}

async function loadSuccessCases() {
  try {
    const response = await authFetch("/api/success-cases/admin?limit=2000", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    state.data.successCases = response.ok && Array.isArray(data?.cases) ? data.cases : [];
  } catch {
    state.data.successCases = [];
  }
}

async function loadSuccessCaseBatches() {
  try {
    const response = await authFetch("/api/success-cases/import-batches", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    state.data.successCaseBatches = response.ok && Array.isArray(data?.batches) ? data.batches : [];
  } catch {
    state.data.successCaseBatches = [];
  }
}

async function loadSuccessCaseData() {
  await Promise.all([loadSuccessCases(), loadSuccessCaseBatches()]);
}
