(function () {
  const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
  const GEMINI_TEMPORARY_ERROR_MESSAGE = 'AI 서버가 일시적으로 혼잡합니다.\n잠시 후 다시 시도해 주세요.';
  const GEMINI_RATE_LIMIT_ERROR_MESSAGE = '현재 AI 사용량이 많아 잠시 후 다시 시도해 주세요.';

  window.AICareerReportConfig = window.AICareerReportConfig || {};

  function getGeminiModel(scope = 'default') {
    const cfg = window.AICareerReportConfig || {};
    return cfg[`${scope}GeminiModel`] || cfg.geminiModel || localStorage.getItem('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
  }

  function setGeminiModel(model, scope = 'default') {
    if (!model) return;
    window.AICareerReportConfig = window.AICareerReportConfig || {};
    if (scope && scope !== 'default') window.AICareerReportConfig[`${scope}GeminiModel`] = model;
    else window.AICareerReportConfig.geminiModel = model;
    localStorage.setItem('GEMINI_MODEL', model);
  }

  function geminiEndpoint() {
    return '/api/gemini';
  }

  function reportGeminiEndpoint() {
    return '/api/report-gemini';
  }

  async function generateContent({ model, body, request = fetch }) {
    const response = await request(geminiEndpoint(), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ model, ...body })
    });
    response.geminiModelName = response.headers?.get?.('X-Gemini-Model') || model;
    return response;
  }

  async function generateReportContent({ model, reportType, variant, input, keyword, matchedCases, participant, insight, useSearch, request = fetch }) {
    const response = await request(reportGeminiEndpoint(), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ model, reportType, variant, input, keyword, matchedCases, participant, insight, useSearch })
    });
    response.geminiModelName = response.headers?.get?.('X-Gemini-Model') || model;
    return response;
  }

  function geminiModelCandidates(scope = 'default', primaryModel = '') {
    const primary = primaryModel || getGeminiModel(scope);
    return Array.from(new Set([primary, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean)));
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isGeminiRetryableError(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    return err?.status === 429 ||
      err?.status === 503 ||
      err?.isGeminiRateLimit ||
      err?.isNetworkError ||
      err instanceof TypeError ||
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('timed out');
  }

  async function fetchGeminiWithRetryBase(url, options) {
    const delays = [2000, 5000, 10000];
    let lastErr = null;
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          const apiError = await res.clone().json().catch(() => ({ status: res.status, statusText: res.statusText }));
          console.error('Gemini API 사용량 제한 오류:', apiError);
          const friendly = new Error(GEMINI_RATE_LIMIT_ERROR_MESSAGE);
          friendly.status = 429;
          friendly.isGeminiRateLimit = true;
          friendly.apiError = apiError;
          friendly.apiMessage = apiError?.error?.message || GEMINI_RATE_LIMIT_ERROR_MESSAGE;
          throw friendly;
        }
        if (res.status === 503) {
          const apiError = await res.clone().json().catch(() => ({ status: res.status, statusText: res.statusText }));
          const err = new Error(apiError?.error?.message || `Gemini API 오류 (${res.status})`);
          err.status = res.status;
          err.apiError = apiError;
          err.apiMessage = apiError?.error?.message || err.message;
          throw err;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (err instanceof TypeError) err.isNetworkError = true;
        console.error('Gemini API 호출 오류:', err);
        if (!isGeminiRetryableError(err) || attempt === delays.length) {
          if (isGeminiRetryableError(err) && !err?.isGeminiRateLimit) {
            const friendly = new Error(GEMINI_TEMPORARY_ERROR_MESSAGE);
            friendly.status = lastErr?.status || 503;
            friendly.apiMessage = lastErr?.apiMessage || lastErr?.message || GEMINI_TEMPORARY_ERROR_MESSAGE;
            friendly.cause = lastErr;
            friendly.isGeminiTemporaryFailure = true;
            throw friendly;
          }
          throw err;
        }
        const retryReason = window.normalizeReportErrorType ? window.normalizeReportErrorType(err) : REPORT_ERROR_TYPE.NETWORK_ERROR;
        if (window.state) window.state.reportGenerationRetryCount += 1;
        if (window.noteReportGenerationIssue) {
          window.noteReportGenerationIssue({
            errorType: retryReason,
            retryReason,
            retryCount: window.state?.reportGenerationRetryCount || 0,
            recoveryType: REPORT_RECOVERY_TYPE.RETRY_SUCCESS
          });
        }
        await wait(delays[attempt]);
      }
    }
  }

  async function fetchGeminiWithRetry(url, options) {
    const startedAt = Date.now();
    try {
      const response = await fetchGeminiWithRetryBase(url, options);
      if (response.ok) recordUsageEvent(EVENTS.AI_REQUEST_SUCCEEDED, { durationMs: Date.now() - startedAt, status: response.status });
      else recordUsageEvent(EVENTS.AI_REQUEST_FAILED, { durationMs: Date.now() - startedAt, status: response.status });
      return response;
    } catch (err) {
      recordUsageEvent(EVENTS.AI_REQUEST_FAILED, { durationMs: Date.now() - startedAt, status: err?.status || 0, errorName: err?.name || 'Error' });
      throw err;
    }
  }

  function isGeminiTemporaryBusy(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('high demand') ||
      msg.includes('overloaded') ||
      msg.includes('try again later') ||
      msg.includes('resource_exhausted') ||
      msg.includes('unavailable') ||
      msg.includes('503');
  }

  Object.assign(window, {
    DEFAULT_GEMINI_MODEL,
    GEMINI_TEMPORARY_ERROR_MESSAGE,
    GEMINI_RATE_LIMIT_ERROR_MESSAGE,
    AI_GATEWAY: Object.freeze({
      geminiEndpoint,
      reportGeminiEndpoint,
      generateContent,
      generateReportContent
    }),
    getGeminiModel,
    setGeminiModel,
    geminiModelCandidates,
    wait,
    isGeminiRetryableError,
    fetchGeminiWithRetry,
    isGeminiTemporaryBusy
  });
})();
