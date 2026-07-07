(function () {
  function jsonRuntimeErrorType(err) {
    if (err?.errorType === 'TRUNCATED_JSON') return REPORT_ERROR_TYPE.AI_RESPONSE_TRUNCATED;
    if (err?.errorType === 'JSON_REPAIR_FAILED') return REPORT_ERROR_TYPE.JSON_REPAIR_FAILED;
    if (err?.errorType === 'JSON_PARSE_ERROR' || err instanceof SyntaxError) return REPORT_ERROR_TYPE.JSON_PARSE_ERROR;
    return window.normalizeReportErrorType ? window.normalizeReportErrorType(err) : REPORT_ERROR_TYPE.UNKNOWN_ERROR;
  }

  function isJsonRuntimeParseError(err) {
    return ['JSON_PARSE_ERROR', 'JSON_REPAIR_FAILED', 'TRUNCATED_JSON'].includes(err?.errorType) ||
      err instanceof SyntaxError ||
      String(err?.message || '').includes('JSON');
  }

  function isModelFallbackEligible(err) {
    const errorType = jsonRuntimeErrorType(err);
    return [
      REPORT_ERROR_TYPE.JSON_PARSE_ERROR,
      REPORT_ERROR_TYPE.JSON_REPAIR_FAILED,
      REPORT_ERROR_TYPE.AI_EMPTY_RESPONSE,
      REPORT_ERROR_TYPE.AI_RESPONSE_TRUNCATED,
      REPORT_ERROR_TYPE.RATE_LIMIT,
      REPORT_ERROR_TYPE.SERVICE_UNAVAILABLE,
      REPORT_ERROR_TYPE.NETWORK_ERROR,
      REPORT_ERROR_TYPE.TIMEOUT
    ].includes(errorType) || err?.status === 400 || err?.status === 404;
  }

  function isLightJsonParseStage(stage = '') {
    const text = String(stage || '');
    return text === 'raw' ||
      text.startsWith('code_fence_removed') ||
      text.startsWith('fence_markers_removed') ||
      text.startsWith('json_object_extracted') ||
      text.startsWith('balanced_segment') ||
      text.includes('trailing_commas_removed') ||
      text.includes('whitespace_normalized') ||
      text.includes('smart_quotes_normalized') ||
      text.includes('control_chars_removed');
  }

  function reportJsonRuntimeIssue(detail = {}) {
    if (!window.noteReportGenerationIssue) return;
    const autoRepairAttempted = detail.autoRepairAttempted && !isLightJsonParseStage(detail.parseStage);
    const recoveryType = detail.regenerateAttempted
      ? REPORT_RECOVERY_TYPE.FULL_REGENERATION
      : detail.jsonRepairAttempted
        ? REPORT_RECOVERY_TYPE.AI_JSON_REPAIR
        : autoRepairAttempted
          ? REPORT_RECOVERY_TYPE.CODE_REPAIR
          : REPORT_RECOVERY_TYPE.NONE;
    const errorType = detail.parseSuccess === false
      ? (detail.jsonRepairAttempted ? REPORT_ERROR_TYPE.JSON_REPAIR_FAILED : REPORT_ERROR_TYPE.JSON_PARSE_ERROR)
      : recoveryType !== REPORT_RECOVERY_TYPE.NONE
        ? REPORT_ERROR_TYPE.JSON_PARSE_ERROR
        : undefined;
    noteReportGenerationIssue({
      errorType,
      modelName: detail.modelName,
      retryCount: window.state?.reportGenerationRetryCount || 0,
      retryReason: errorType,
      recoveryType
    });
  }

  function geminiTextFromCandidate(candidate) {
    return (candidate?.content?.parts || []).map((part) => part.text || '').join('\n').trim();
  }

  function jsonRepairPrompt(rawText, schema) {
    return `내용을 새로 만들지 말고 JSON 문법만 고쳐라. JSON 객체만 출력하라.\n\n필요한 schema:\n${JSON.stringify(schema || {})}\n\n깨진 JSON 원문:\n${String(rawText || '')}`;
  }

  function normalizeJsonRuntimeError(err, rawText) {
    const wrapped = new Error(`Gemini 응답 JSON 해석 실패: ${err?.message || '형식이 올바르지 않습니다.'}`);
    wrapped.errorType = err?.errorType || 'JSON_PARSE_ERROR';
    wrapped.parseStage = err?.parseStage;
    wrapped.rawPreview = String(rawText || '').slice(0, 1000);
    wrapped.retryable = err?.retryable !== false;
    wrapped.cause = err;
    return wrapped;
  }

  async function requestGeminiJson({ modelName, body, request, context }) {
    const res = request
      ? await request({ modelName, body })
      : await window.AI_GATEWAY.generateContent({ model: modelName, body, request: fetchGeminiWithRetry });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `Gemini API 오류 (${res.status} ${res.statusText || ''})`);
      err.status = res.status;
      throw err;
    }
    const actualModelName = res.geminiModelName || modelName;
    const candidate = data?.candidates?.[0] || {};
    assertGeminiCandidateCompleted(candidate, context || 'Gemini JSON');
    const text = geminiTextFromCandidate(candidate);
    if (!text) {
      const err = new Error('Gemini 응답에서 JSON 내용을 찾지 못했습니다.');
      err.errorType = REPORT_ERROR_TYPE.AI_EMPTY_RESPONSE;
      throw err;
    }
    return { text, tokenUsage: normalizeTokenUsage(data.usageMetadata), raw: data, modelName: actualModelName };
  }

  async function repairGeminiJson({ rawText, schema, modelName, context }) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: jsonRepairPrompt(rawText, schema) }] }],
      generationConfig: { temperature: 0, topP: 0.1, responseMimeType: 'application/json' }
    };
    const { text } = await requestGeminiJson({
      modelName,
      body,
      context: `${context || 'Gemini'} JSON repair`
    });
    return text;
  }

  async function parseJsonWithRecovery(text, { schema, modelName, context, allowJsonRepair = true } = {}) {
    const startedAt = Date.now();
    try {
      const result = parseGeminiJsonDetailed(text);
      reportJsonRuntimeIssue({
        modelName,
        parseSuccess: true,
        parseStage: result.stage,
        autoRepairAttempted: result.autoRepairAttempted,
        autoRepairSuccess: result.autoRepairSuccess,
        jsonRepairAttempted: false,
        jsonRepairSuccess: false,
        regenerateAttempted: false,
        regenerateSuccess: false,
        durationMs: Date.now() - startedAt
      });
      return result.value;
    } catch (autoErr) {
      console.error({
        errorType: autoErr?.errorType || 'JSON_PARSE_ERROR',
        parseStage: autoErr?.parseStage || 'unknown',
        errorMessage: autoErr?.message || String(autoErr),
        rawPreview: String(text || '').slice(0, 1000)
      });
      reportJsonRuntimeIssue({
        modelName,
        parseSuccess: false,
        autoRepairAttempted: true,
        autoRepairSuccess: false,
        jsonRepairAttempted: false,
        jsonRepairSuccess: false,
        regenerateAttempted: false,
        regenerateSuccess: false,
        errorMessage: autoErr?.message || String(autoErr),
        durationMs: Date.now() - startedAt
      });
      if (!allowJsonRepair) throw autoErr;

      try {
        const repairedText = await repairGeminiJson({ rawText: text, schema, modelName, context });
        const repaired = parseGeminiJsonDetailed(repairedText);
        reportJsonRuntimeIssue({
          modelName,
          parseSuccess: true,
          parseStage: repaired.stage,
          autoRepairAttempted: repaired.autoRepairAttempted,
          autoRepairSuccess: repaired.autoRepairSuccess,
          jsonRepairAttempted: true,
          jsonRepairSuccess: true,
          regenerateAttempted: false,
          regenerateSuccess: false,
          durationMs: Date.now() - startedAt
        });
        return repaired.value;
      } catch (repairErr) {
        reportJsonRuntimeIssue({
          modelName,
          parseSuccess: false,
          autoRepairAttempted: true,
          autoRepairSuccess: false,
          jsonRepairAttempted: true,
          jsonRepairSuccess: false,
          regenerateAttempted: false,
          regenerateSuccess: false,
          errorMessage: repairErr?.message || String(repairErr),
          durationMs: Date.now() - startedAt
        });
        repairErr.errorType = 'JSON_REPAIR_FAILED';
        repairErr.cause = repairErr.cause || autoErr;
        throw repairErr;
      }
    }
  }

  async function generateJsonOnce(options, parseOptions = {}) {
    const { text, tokenUsage, raw, modelName } = await requestGeminiJson(options);
    try {
      const json = await parseJsonWithRecovery(text, { ...options, ...parseOptions, modelName });
      return { json, tokenUsage, raw, text, modelName };
    } catch (err) {
      throw normalizeJsonRuntimeError(err, text);
    }
  }

  async function generateJsonWithRecovery(options = {}) {
    const modelName = options.modelName || getGeminiModel(options.modelScope || 'default');
    const modelScope = options.modelScope || options.reportType || 'default';
    const modelCandidates = options.modelCandidates ||
      (window.geminiModelCandidates ? window.geminiModelCandidates(modelScope, modelName) : [modelName]);
    const body = options.body || {
      system_instruction: options.systemInstruction ? { parts: [{ text: options.systemInstruction }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: options.userPrompt || '' }] }],
      generationConfig: {
        ...(options.generationConfig || {}),
        responseMimeType: options.responseMimeType || options.generationConfig?.responseMimeType || 'application/json'
      },
      tools: options.tools,
      toolConfig: options.toolConfig
    };
    Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

    let lastErr = null;
    for (let index = 0; index < modelCandidates.length; index += 1) {
      const candidateModelName = modelCandidates[index];
      const runtimeOptions = {
        ...options,
        modelName: candidateModelName,
        body,
        context: options.context || options.reportType || 'Gemini JSON'
      };
      try {
        return await generateJsonOnce(runtimeOptions, { allowJsonRepair: options.allowJsonRepair !== false });
      } catch (err) {
        if (!isJsonRuntimeParseError(err) || options.regenerateOnParseFailure === false) {
          lastErr = err;
        } else {
          const startedAt = Date.now();
          reportJsonRuntimeIssue({
            modelName: candidateModelName,
            parseSuccess: false,
            autoRepairAttempted: true,
            autoRepairSuccess: false,
            jsonRepairAttempted: true,
            jsonRepairSuccess: false,
            regenerateAttempted: true,
            regenerateSuccess: false,
            errorMessage: err?.message || String(err),
            durationMs: 0
          });
          if (window.state) window.state.reportGenerationRetryCount += 1;
          try {
            const result = await generateJsonOnce(runtimeOptions, { allowJsonRepair: false });
            reportJsonRuntimeIssue({
              modelName: result.modelName || candidateModelName,
              parseSuccess: true,
              autoRepairAttempted: true,
              autoRepairSuccess: true,
              jsonRepairAttempted: true,
              jsonRepairSuccess: false,
              regenerateAttempted: true,
              regenerateSuccess: true,
              durationMs: Date.now() - startedAt
            });
            return result;
          } catch (regenerateErr) {
            reportJsonRuntimeIssue({
              modelName: candidateModelName,
              parseSuccess: false,
              autoRepairAttempted: true,
              autoRepairSuccess: false,
              jsonRepairAttempted: true,
              jsonRepairSuccess: false,
              regenerateAttempted: true,
              regenerateSuccess: false,
              errorMessage: regenerateErr?.message || String(regenerateErr),
              durationMs: Date.now() - startedAt
            });
            regenerateErr.errorType = jsonRuntimeErrorType(regenerateErr);
            lastErr = regenerateErr;
          }
        }
        if (index < modelCandidates.length - 1 && isModelFallbackEligible(lastErr)) {
          if (window.noteReportGenerationIssue) {
            window.noteReportGenerationIssue({
              error: lastErr,
              modelName: modelCandidates[index + 1],
              recoveryType: REPORT_RECOVERY_TYPE.MODEL_FALLBACK
            });
          }
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr || new Error('Gemini JSON generation failed.');
  }

  Object.assign(window, {
    generateJsonWithRecovery,
    parseJsonWithRecovery,
    isJsonRuntimeParseError
  });
})();
