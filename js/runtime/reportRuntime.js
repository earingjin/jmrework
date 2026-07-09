(function () {
  const appState = window.state;
  const reportTypes = window.REPORT_TYPES || { SUCCESS: 'success' };
  const REPORT_GENERATION_MESSAGES = [
    '리포트 생성 중...',
    '검사 결과를 정리하고 있습니다...',
    '상담에 활용할 핵심 내용을 뽑고 있습니다...',
    '입력하신 시사점을 함께 반영하고 있습니다...',
    '리포트 문장을 다듬고 있습니다...'
  ];
  let reportGenerationMessageTimer = null;
  let reportGenerationMessageIndex = 0;

  function reportGenerationUser() {
    const account = (appState.data.accounts || []).find((item) => item.id === appState.user?.accountId);
    return {
      counselorId: appState.user?.accountId || '',
      counselorName: appState.user?.name || '',
      branch: account?.branch || '미지정'
    };
  }

  function normalizeReportErrorType(err) {
    const message = String(err?.apiMessage || err?.message || err || '').toLowerCase();
    const type = String(err?.errorType || err?.name || '');
    if (type === 'TRUNCATED_JSON' ||
      type === 'GEMINI_FINISH_MAX_TOKENS' ||
      type === 'GEMINI_FINISH_RECITATION' ||
      type === 'GEMINI_FINISH_OTHER' ||
      message.includes('max_tokens') ||
      message.includes('finishreason: max_tokens') ||
      message.includes('중간에 끊')) return REPORT_ERROR_TYPE.AI_RESPONSE_TRUNCATED;
    if (type === 'GEMINI_FINISH_SAFETY') return REPORT_ERROR_TYPE.VALIDATION_ERROR;
    if (type === REPORT_ERROR_TYPE.JSON_REPAIR_FAILED) return REPORT_ERROR_TYPE.JSON_REPAIR_FAILED;
    if (type === REPORT_ERROR_TYPE.JSON_PARSE_ERROR || err instanceof SyntaxError || message.includes('json')) return REPORT_ERROR_TYPE.JSON_PARSE_ERROR;
    if (type === REPORT_ERROR_TYPE.AI_EMPTY_RESPONSE || type === 'NOT_GENERATED' || message.includes('응답이 비어') || message.includes('내용을 찾지 못') || message.includes('생성 결과가 만들어지지')) return REPORT_ERROR_TYPE.AI_EMPTY_RESPONSE;
    if (err?.status === 429 || message.includes('429') || message.includes('resource_exhausted') || message.includes('quota')) return REPORT_ERROR_TYPE.RATE_LIMIT;
    if (err?.status === 503 || err?.isGeminiTemporaryFailure || message.includes('503') || message.includes('unavailable') || message.includes('overloaded') || message.includes('high demand')) return REPORT_ERROR_TYPE.SERVICE_UNAVAILABLE;
    if (err?.isNetworkError || err instanceof TypeError || message.includes('network') || message.includes('failed to fetch')) return REPORT_ERROR_TYPE.NETWORK_ERROR;
    if (err?.status === 401 || err?.status === 403 || message.includes('api key') || message.includes('api 키') || message.includes('authentication')) return REPORT_ERROR_TYPE.AUTH_ERROR;
    if (message.includes('timeout') || message.includes('timed out')) return REPORT_ERROR_TYPE.TIMEOUT;
    if (message.includes('입력') || message.includes('필수') || message.includes('select at least') || message.includes('required') || message.includes('validation')) return REPORT_ERROR_TYPE.VALIDATION_ERROR;
    return REPORT_ERROR_TYPE.UNKNOWN_ERROR;
  }

  function classifyReportGenerationError(err) {
    const errorType = normalizeReportErrorType(err);
    const message = String(err?.apiMessage || err?.message || err || '리포트가 생성되지 않았습니다.');
    const userMessages = {
      JSON_PARSE_ERROR: 'AI 응답을 리포트 형식으로 정리하지 못했습니다. 입력 내용은 유지되므로 다시 생성해 주세요.',
      JSON_REPAIR_FAILED: 'AI 응답 JSON 문법 복구에 실패했습니다. 입력 내용은 유지되므로 다시 생성해 주세요.',
      AI_EMPTY_RESPONSE: 'AI 응답에서 리포트 내용을 찾지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
      AI_RESPONSE_TRUNCATED: 'AI 응답이 중간에 끊겼습니다. 입력 내용은 유지되므로 다시 생성해 주세요.',
      RATE_LIMIT: '현재 AI 사용량이 많아 서비스가 잠시 지연되고 있습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.',
      SERVICE_UNAVAILABLE: 'AI 서비스가 일시적으로 혼잡하거나 점검 중입니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.',
      NETWORK_ERROR: '네트워크 연결이 불안정해 리포트를 생성하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.',
      AUTH_ERROR: 'AI 서비스 연결 정보를 확인할 수 없습니다. 담당자에게 문의해 주세요.',
      VALIDATION_ERROR: message,
      TIMEOUT: 'AI 응답 시간이 초과되었습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.',
      UNKNOWN_ERROR: '리포트 생성 중 일시적인 문제가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.'
    };
    return { errorType, errorMessage: message, userMessage: userMessages[errorType] || userMessages.UNKNOWN_ERROR };
  }

  function captureReportFormValues() {
    const form = document.querySelector('.form-panel');
    if (!form) return [];
    return [...form.querySelectorAll('input:not([type="file"]),textarea,select')]
      .map((el) => ({ id: el.id, name: el.name, type: el.type, value: el.value, checked: el.checked }));
  }

  function restoreReportFormValues(values) {
    (values || []).forEach((item) => {
      const el = item.id ? document.getElementById(item.id) : item.name ? document.querySelector(`[name="${CSS.escape(item.name)}"]`) : null;
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = item.checked;
      else el.value = item.value;
    });
  }

  function reportGenerationOverlay(show) {
    let overlay = document.getElementById('reportGenerationOverlay');
    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'reportGenerationOverlay';
        overlay.className = 'report-generation-overlay';
        overlay.innerHTML = '<div class="report-generation-loader" role="status" aria-live="polite"><span class="report-orbit" aria-hidden="true"><i></i><i></i><i></i></span><strong data-report-generation-message>리포트 생성 중...</strong></div>';
        document.body.appendChild(overlay);
      }
      return;
    }
    if (overlay) overlay.remove();
  }

  function reportGenerationMessage() {
    return REPORT_GENERATION_MESSAGES[reportGenerationMessageIndex % REPORT_GENERATION_MESSAGES.length];
  }

  function updateReportGenerationMessage() {
    const message = reportGenerationMessage();
    const overlayMessage = document.querySelector('#reportGenerationOverlay [data-report-generation-message]');
    if (overlayMessage) overlayMessage.textContent = message;
    document.querySelectorAll('button.report-generating').forEach((btn) => {
      btn.innerHTML = `<span class="report-spinner" aria-hidden="true"></span><span data-report-generation-message>${message}</span>`;
    });
  }

  function startReportGenerationMessages() {
    stopReportGenerationMessages();
    reportGenerationMessageIndex = 0;
    updateReportGenerationMessage();
    setTimeout(updateReportGenerationMessage, 0);
    reportGenerationMessageTimer = setInterval(() => {
      reportGenerationMessageIndex += 1;
      updateReportGenerationMessage();
    }, 2600);
  }

  function stopReportGenerationMessages() {
    if (reportGenerationMessageTimer) {
      clearInterval(reportGenerationMessageTimer);
      reportGenerationMessageTimer = null;
    }
  }

  function setReportGenerationUi(isGenerating) {
    appState.reportGenerationInProgress = isGenerating;
    reportGenerationOverlay(isGenerating);
    document.querySelectorAll('button[onclick*="generateReport("],button[onclick*="generateSuccessReportWithGemini("]').forEach((btn) => {
      if (isGenerating) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('report-generating');
      } else {
        btn.disabled = false;
        btn.classList.remove('report-generating');
        if (btn.dataset.originalHtml) {
          btn.innerHTML = btn.dataset.originalHtml;
          delete btn.dataset.originalHtml;
        }
      }
    });
    if (isGenerating) startReportGenerationMessages();
    else stopReportGenerationMessages();
  }

  function reportRetryReason(errorType) {
    return Object.values(REPORT_RETRY_REASON).includes(errorType) ? errorType : REPORT_RETRY_REASON.NONE;
  }

  function noteReportGenerationIssue(detail = {}) {
    const ctx = appState.reportGenerationContext;
    if (!ctx) return;
    const nextError = detail.errorType || (detail.error ? normalizeReportErrorType(detail.error) : null);
    if (nextError && nextError !== REPORT_ERROR_TYPE.NONE) {
      ctx.errorType = ctx.errorType === REPORT_ERROR_TYPE.JSON_PARSE_ERROR && nextError === REPORT_ERROR_TYPE.JSON_REPAIR_FAILED ? nextError : (ctx.errorType || nextError);
    }
    if (detail.modelName) ctx.modelName = detail.modelName;
    if (detail.recoveryType && detail.recoveryType !== REPORT_RECOVERY_TYPE.NONE) {
      ctx.recoveryType = detail.recoveryType;
      if (detail.recoveryType === REPORT_RECOVERY_TYPE.RETRY_SUCCESS) ctx.retryRecoveryAttempted = true;
    }
    const retryReason = reportRetryReason(detail.retryReason || nextError);
    if (retryReason !== REPORT_RETRY_REASON.NONE) ctx.retryReason = retryReason;
    if (detail.retryCount !== undefined) ctx.retryCount = Math.max(ctx.retryCount || 0, Number(detail.retryCount) || 0);
    if (detail.incrementRetry) {
      ctx.retryCount = (ctx.retryCount || 0) + 1;
      appState.reportGenerationRetryCount = ctx.retryCount;
    }
  }

  function reportValidationPassed(reportModule, ...args) {
    if (!reportModule?.validate) return true;
    const result = reportModule.validate(...args);
    if (result === true || result === undefined) return true;
    if (typeof result === 'string' && result) toast(result);
    return false;
  }

  async function runReportGeneration(reportType, generate) {
    if (appState.reportGenerationInProgress) {
      toast('리포트를 생성하고 있습니다. 잠시만 기다려 주세요.');
      return;
    }
    const startedAt = Date.now();
    const startedAtText = new Date(startedAt).toISOString();
    const beforeReport = appState.currentReport;
    const formValues = captureReportFormValues();
    const user = reportGenerationUser();
    const modelName = getGeminiModel(reportType);
    appState.reportGenerationRetryCount = 0;
    appState.reportGenerationContext = {
      reportType,
      errorType: null,
      retryCount: 0,
      retryReason: REPORT_RETRY_REASON.NONE,
      recoveryType: REPORT_RECOVERY_TYPE.NONE,
      retryRecoveryAttempted: false,
      modelName
    };
    recordUsageEvent(EVENTS.REPORT_GENERATION_STARTED, { reportType, modelName, startedAt: startedAtText, ...user });
    setReportGenerationUi(true);
    try {
      const result = await generate();
      const succeeded = Boolean(appState.currentReport && appState.currentReport !== beforeReport);
      if (!succeeded) {
        const err = new Error('리포트 생성 결과가 만들어지지 않았습니다.');
        err.errorType = REPORT_ERROR_TYPE.AI_EMPTY_RESPONSE;
        throw err;
      }
      const ctx = appState.reportGenerationContext || {};
      const hasIssue = Boolean(ctx.errorType && ctx.errorType !== REPORT_ERROR_TYPE.NONE);
      const finalStatus = hasIssue ? REPORT_FINAL_STATUS.RECOVERED_SUCCESS : REPORT_FINAL_STATUS.SUCCESS;
      recordUsageEvent(EVENTS.REPORT_GENERATION_COMPLETED, {
        finalStatus,
        reportType,
        durationMs: Date.now() - startedAt,
        modelName: result?.modelName || ctx.modelName || modelName,
        errorType: ctx.errorType || REPORT_ERROR_TYPE.NONE,
        retryCount: ctx.retryCount || appState.reportGenerationRetryCount || 0,
        retryReason: ctx.retryReason || REPORT_RETRY_REASON.NONE,
        recoveryType: ctx.recoveryType || (ctx.retryRecoveryAttempted ? REPORT_RECOVERY_TYPE.RETRY_SUCCESS : REPORT_RECOVERY_TYPE.NONE),
        tokenUsage: result?.tokenUsage,
        ...user
      });
      return result;
    } catch (err) {
      const failure = classifyReportGenerationError(err);
      const ctx = appState.reportGenerationContext || {};
      const errorType = ctx.errorType || failure.errorType || REPORT_ERROR_TYPE.UNKNOWN_ERROR;
      const failedRecoveryType = ctx.recoveryType === REPORT_RECOVERY_TYPE.RETRY_SUCCESS ? REPORT_RECOVERY_TYPE.NONE : (ctx.recoveryType || REPORT_RECOVERY_TYPE.NONE);
      recordUsageEvent(EVENTS.REPORT_GENERATION_COMPLETED, {
        finalStatus: REPORT_FINAL_STATUS.FAILED,
        reportType,
        durationMs: Date.now() - startedAt,
        modelName: ctx.modelName || modelName,
        errorType,
        retryCount: ctx.retryCount || appState.reportGenerationRetryCount || 0,
        retryReason: ctx.retryReason || reportRetryReason(errorType),
        recoveryType: failedRecoveryType,
        ...user
      });
      setTimeout(() => restoreReportFormValues(formValues), 0);
      toast(failure.userMessage);
      console.error('리포트 생성 실패', err);
      return undefined;
    } finally {
      appState.reportGenerationContext = null;
      setReportGenerationUi(false);
    }
  }

  Object.assign(window, {
    reportGenerationUser,
    normalizeReportErrorType,
    classifyReportGenerationError,
    captureReportFormValues,
    restoreReportFormValues,
    reportGenerationOverlay,
    setReportGenerationUi,
    reportRetryReason,
    noteReportGenerationIssue,
    reportValidationPassed,
    runReportGeneration
  });

  const generateSuccessReportWithoutUsage = window.generateSuccessReportWithGemini;
  window.generateSuccessReportWithGemini = function () {
    const reportModule = window.REPORT_MODULES?.get(reportTypes.SUCCESS);
    if (!reportValidationPassed(reportModule)) return;
    return runReportGeneration(reportTypes.SUCCESS, () => generateSuccessReportWithoutUsage());
  };

  const generateReportWithoutUsage = window.generateReport;
  window.generateReport = function (type, priority) {
    const reportModule = window.REPORT_MODULES?.get(type);
    const p = getParticipant();
    if (!reportValidationPassed(reportModule, p, priority)) return;
    if (reportModule?.tracksGenerationUsage) return generateReportWithoutUsage(type, priority);
    return runReportGeneration(type, () => generateReportWithoutUsage(type, priority));
  };

  load().then(() => render());
})();
