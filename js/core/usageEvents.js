(function () {
  const USAGE_LOG_STORAGE_KEY = 'ai_career_usage_events_v1';
  const AUTH_TOKEN_KEY = 'REWORK_AUTH_TOKEN';
  const MAX_USAGE_EVENTS = 5000;
  const EVENTS = Object.freeze({
    REPORT_GENERATION_STARTED: 'report_generation_started',
    REPORT_GENERATION_COMPLETED: 'report_generation_completed',
    REPORT_GENERATION_SUCCEEDED: 'report_generation_succeeded',
    REPORT_GENERATION_FAILED: 'report_generation_failed',
    AI_REQUEST_SUCCEEDED: 'ai_request_succeeded',
    AI_REQUEST_FAILED: 'ai_request_failed'
  });
  const REPORT_FINAL_STATUS = Object.freeze({
    SUCCESS: 'SUCCESS',
    RECOVERED_SUCCESS: 'RECOVERED_SUCCESS',
    FAILED: 'FAILED'
  });
  const REPORT_ERROR_TYPE = Object.freeze({
    NONE: 'NONE',
    JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
    JSON_REPAIR_FAILED: 'JSON_REPAIR_FAILED',
    AI_EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
    AI_RESPONSE_TRUNCATED: 'AI_RESPONSE_TRUNCATED',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  });
  const REPORT_RECOVERY_TYPE = Object.freeze({
    NONE: 'NONE',
    CODE_REPAIR: 'CODE_REPAIR',
    AI_JSON_REPAIR: 'AI_JSON_REPAIR',
    FULL_REGENERATION: 'FULL_REGENERATION',
    DEFAULT_VALUE: 'DEFAULT_VALUE',
    MODEL_FALLBACK: 'MODEL_FALLBACK',
    RETRY_SUCCESS: 'RETRY_SUCCESS'
  });
  const REPORT_RETRY_REASON = Object.freeze({
    NONE: 'NONE',
    JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
    JSON_REPAIR_FAILED: 'JSON_REPAIR_FAILED',
    AI_EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
    AI_RESPONSE_TRUNCATED: 'AI_RESPONSE_TRUNCATED',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT'
  });

  function loadUsageLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem(USAGE_LOG_STORAGE_KEY) || '[]');
      return Array.isArray(logs) ? logs : [];
    } catch (err) {
      console.warn('사용 통계 불러오기 실패', err);
      return [];
    }
  }

  function saveUsageLog(log) {
    const logs = loadUsageLogs();
    logs.push(log);
    localStorage.setItem(USAGE_LOG_STORAGE_KEY, JSON.stringify(logs.slice(-MAX_USAGE_EVENTS)));
    return log;
  }

  function authHeaders(headers = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  function sendUsageEventToServer(event) {
    try {
      fetch('/api/usage-events', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ event }),
        keepalive: true
      }).catch((err) => console.warn('사용 통계 서버 저장 실패', err));
    } catch (err) {
      console.warn('사용 통계 서버 저장 실패', err);
    }
  }

  function usageMetadataOnly(payload = {}) {
    const allowed = [
      'finalStatus',
      'reportType',
      'durationMs',
      'modelName',
      'errorType',
      'retryCount',
      'retryReason',
      'recoveryType',
      'startedAt',
      'counselorId',
      'counselorName',
      'branch',
      'tokenUsage'
    ];
    return Object.fromEntries(
      allowed
        .filter((key) => payload[key] !== undefined)
        .map((key) => [key, payload[key]])
    );
  }

  function recordUsageEvent(eventName, payload = {}) {
    const event = {
      id: window.uid ? window.uid() : `id_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
      eventName,
      payload: usageMetadataOnly(payload),
      recordedAt: new Date().toISOString()
    };
    try {
      saveUsageLog(event);
    } catch (err) {
      console.warn('사용 통계 임시 저장 실패', err);
    }
    sendUsageEventToServer(event);
    console.log('[usage-event]', event);
    return event;
  }

  Object.assign(window, {
    USAGE_LOG_STORAGE_KEY,
    AUTH_TOKEN_KEY,
    MAX_USAGE_EVENTS,
    EVENTS,
    REPORT_FINAL_STATUS,
    REPORT_ERROR_TYPE,
    REPORT_RECOVERY_TYPE,
    REPORT_RETRY_REASON,
    loadUsageLogs,
    saveUsageLog,
    authHeaders,
    sendUsageEventToServer,
    usageMetadataOnly,
    recordUsageEvent
  });
})();
