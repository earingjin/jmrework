const LEGACY_STORAGE_KEY = "ai_career_report_index_v2";
const ACCOUNT_STORAGE_KEY = "ai_career_accounts_v1";
const USAGE_EVENT_STORAGE_KEY = "ai_career_usage_events_v1";

function parseStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function persist() {
  const existing = parseStorage(ACCOUNT_STORAGE_KEY) || {};
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({
    ...existing,
    accounts: state.data.accounts,
  }));
}

function loadData() {
  const savedAccounts = parseStorage(ACCOUNT_STORAGE_KEY);
  const legacySaved = parseStorage(LEGACY_STORAGE_KEY);
  const savedUsageEvents = parseStorage(USAGE_EVENT_STORAGE_KEY);

  const accounts = Array.isArray(savedAccounts?.accounts)
    ? savedAccounts.accounts
    : Array.isArray(legacySaved?.accounts)
      ? legacySaved.accounts
      : [];

  const usageEvents = Array.isArray(savedUsageEvents)
    ? savedUsageEvents
    : Array.isArray(savedUsageEvents?.usageEvents)
      ? savedUsageEvents.usageEvents
      : [];

  state.data = {
    accounts,
    reports: [],
    usageEvents,
    geminiErrors: [],
  };

  if (!state.data.accounts.some((account) => account.role === "관리자")) {
    state.data.accounts.unshift({
      id: uid(),
      loginId: "admin",
      password: "admin123",
      name: "관리자",
      role: "관리자",
      createdAt: today(),
      status: "active",
      loginCount: 0,
    });
  }

  state.data.accounts.forEach((account) => {
    if (!account.status) account.status = "active";
    if (!Number.isFinite(account.loginCount)) account.loginCount = 0;
  });

  persist();
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
    const response = await fetch("/api/usage-events?limit=20000", { cache: "no-store" });
    const data = await response.json();
    mergeEvents(response.ok && Array.isArray(data?.events) ? data.events : []);
  } catch {
    state.data.usageEvents = localUsageEvents;
  }
}

async function loadGeminiErrors() {
  try {
    const response = await fetch("/api/gemini-errors", { cache: "no-store" });
    const data = await response.json();
    state.data.geminiErrors = response.ok && Array.isArray(data?.errors) ? data.errors : [];
  } catch {
    state.data.geminiErrors = [];
  }
}
