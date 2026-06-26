const LEGACY_STORAGE_KEY = "ai_career_report_index_v2";
const ACCOUNT_STORAGE_KEY = "ai_career_accounts_v1";
const USAGE_EVENT_STORAGE_KEY = "ai_career_usage_events_v1";
const AUTH_TOKEN_KEY = "REWORK_AUTH_TOKEN";

function authHeaders(headers = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function authFetch(url, options = {}) {
  return fetch(url, {
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

  let accounts = Array.isArray(savedAccounts?.accounts)
    ? savedAccounts.accounts
    : Array.isArray(legacySaved?.accounts)
      ? legacySaved.accounts
      : [];

  // try to load accounts from server DB first
  try {
    const response = await authFetch("/api/accounts", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.accounts)) {
        accounts = await migrateLocalCounselorsToServer(localAccounts, data.accounts);
      }
    }
  } catch (err) {
    // fallback to localStorage if server fetch fails
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
    usageEvents,
    geminiErrors: [],
  };

  state.data.accounts.forEach((account) => {
    if (!account.status) account.status = "active";
    if (!Number.isFinite(account.loginCount)) account.loginCount = 0;
  });

  persist();
  await loadNotices();
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
  try {
    const response = await authFetch("/api/notices/admin", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    state.data.notices = response.ok && Array.isArray(data?.notices) ? data.notices : [];
  } catch {
    state.data.notices = [];
  }
}
