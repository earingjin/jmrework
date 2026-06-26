(function () {
  function geminiJsonSegments(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '').trim();
    const segments = [];
    const add = (value) => {
      const clean = String(value || '').trim();
      if (clean && !segments.includes(clean)) segments.push(clean);
    };
    add(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim());
    for (const match of raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) add(match[1]);
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (start < 0) {
        if (ch === '{' || ch === '[') {
          start = i;
          depth = 1;
          inString = false;
          escaped = false;
        }
        continue;
      }
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{' || ch === '[') depth += 1;
      else if (ch === '}' || ch === ']') {
        depth -= 1;
        if (depth === 0) {
          add(raw.slice(start, i + 1));
          start = -1;
        }
      }
    }
    return segments;
  }

  function stripGeminiJsonFence(text) {
    return String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  function extractGeminiJsonObjectText(text) {
    const raw = String(text || '');
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) return raw.slice(first, last + 1).trim();
    const arrayFirst = raw.indexOf('[');
    const arrayLast = raw.lastIndexOf(']');
    return arrayFirst >= 0 && arrayLast > arrayFirst ? raw.slice(arrayFirst, arrayLast + 1).trim() : raw.trim();
  }

  function normalizeGeminiJsonQuotes(text) {
    return String(text || '').replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  }

  function removeGeminiJsonControlChars(text) {
    return String(text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  }

  function removeGeminiJsonTrailingCommas(text) {
    return String(text || '').replace(/,\s*(?=[\]}])/g, '');
  }

  function normalizeGeminiJsonWhitespace(text) {
    return String(text || '').replace(/\r\n?/g, '\n').trim();
  }

  function looksLikeTruncatedGeminiJson(text) {
    const raw = String(text || '').trim();
    if (!raw) return false;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{' || ch === '[') depth += 1;
      else if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    }
    return depth > 0 || inString || /[,:\\[]$/.test(raw);
  }

  function geminiJsonParseError(message, lastError, stage, raw) {
    const errorType = looksLikeTruncatedGeminiJson(raw) ? 'TRUNCATED_JSON' : 'JSON_PARSE_ERROR';
    const err = new SyntaxError(message);
    err.errorType = errorType;
    err.parseStage = stage;
    err.retryable = true;
    err.cause = lastError;
    return err;
  }

  function logGeminiJsonParse(stage, status, detail = {}) {
    const payload = { stage, status, ...detail };
    if (status === 'success') console.log('[gemini-json-parse]', payload);
    else console.warn('[gemini-json-parse]', payload);
  }

  function geminiFinishErrorType(reason) {
    return reason === 'MAX_TOKENS'
      ? 'GEMINI_FINISH_MAX_TOKENS'
      : reason === 'SAFETY'
        ? 'GEMINI_FINISH_SAFETY'
        : reason === 'RECITATION'
          ? 'GEMINI_FINISH_RECITATION'
          : 'GEMINI_FINISH_OTHER';
  }

  function assertGeminiCandidateCompleted(candidate, context = 'Gemini') {
    const finishReason = candidate?.finishReason;
    if (!finishReason || finishReason === 'STOP') return;
    const err = new Error(`${context} 응답이 완료되지 않았습니다. 종료 사유: ${finishReason}`);
    err.errorType = geminiFinishErrorType(finishReason);
    err.finishReason = finishReason;
    err.retryable = finishReason !== 'SAFETY';
    if (window.noteReportGenerationIssue) window.noteReportGenerationIssue({ error: err });
    throw err;
  }

  function sanitizeGeminiJson(text) {
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          result += ch;
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          result += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          result += ch;
          inString = false;
          continue;
        }
        const code = ch.charCodeAt(0);
        if (code < 32) {
          result += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : `\\u${code.toString(16).padStart(4, '0')}`;
        } else result += ch;
        continue;
      }
      if (ch === '"') {
        result += ch;
        inString = true;
        continue;
      }
      if (ch === ',') {
        let next = i + 1;
        while (next < text.length && /\s/.test(text[next])) next += 1;
        if (text[next] === '}' || text[next] === ']') continue;
      }
      result += ch;
    }
    return result;
  }

  function repairGeminiJsonCommas(text) {
    let out = '';
    let inString = false;
    let escaped = false;
    const startsValue = (ch) => ch === '"' || ch === '{' || ch === '[' || ch === '-' || /\d|t|f|n/.test(ch || '');
    const endsValue = (ch) => ch === '"' || ch === '}' || ch === ']' || /\d|e|l/.test(ch || '');
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        out += ch;
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = true;
        continue;
      }
      if (/\s/.test(ch)) {
        let j = i;
        while (j < text.length && /\s/.test(text[j])) j += 1;
        let k = out.length - 1;
        while (k >= 0 && /\s/.test(out[k])) k -= 1;
        const prev = out[k];
        const next = text[j];
        let beforePrev = k - 1;
        while (beforePrev >= 0 && /\s/.test(out[beforePrev])) beforePrev -= 1;
        if (endsValue(prev) && startsValue(next) && out[beforePrev] !== ':' && next !== ':' && next !== '}' && next !== ']') out += ',';
        out += text.slice(i, j);
        i = j - 1;
        continue;
      }
      out += ch;
    }
    return out;
  }

  function repairGeminiJsonValueSeparators(text) {
    const source = String(text || '');
    let out = '';
    let inString = false;
    let escaped = false;
    let lastSignificant = '';
    const startsValue = (ch) => ch === '"' || ch === '{' || ch === '[' || ch === '-' || /\d|t|f|n/.test(ch || '');
    const endsValue = (ch) => ch === '"' || ch === '}' || ch === ']' || /\d|e|l/.test(ch || '');
    const previousSignificant = () => {
      for (let i = out.length - 1; i >= 0; i -= 1) {
        if (!/\s/.test(out[i])) return out[i];
      }
      return '';
    };
    const nextSignificant = (index) => {
      for (let i = index; i < source.length; i += 1) {
        if (!/\s/.test(source[i])) return source[i];
      }
      return '';
    };

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      out += ch;

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        lastSignificant = ch;
        continue;
      }

      if (!/\s/.test(ch)) lastSignificant = ch;
      if (!endsValue(ch)) continue;

      const next = nextSignificant(i + 1);
      const prev = previousSignificant();
      if (startsValue(next) && next !== '}' && next !== ']' && prev !== ':' && lastSignificant !== ':') {
        out += ',';
        lastSignificant = ',';
      }
    }
    return out;
  }

  function repairGeminiJsonClosers(text) {
    const source = String(text || '').trim();
    const stack = [];
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      out += ch;
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.at(-1) === ch) stack.pop();
    }

    if (inString || /[,:\\[]$/.test(source)) return source;
    while (stack.length) out += stack.pop();
    return out;
  }

  function repairGeminiJsonLiterals(text) {
    return String(text || '')
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
  }

  function repairGeminiJsonStructure(text) {
    const withSeparators = repairGeminiJsonValueSeparators(repairGeminiJsonCommas(text));
    return repairGeminiJsonClosers(repairGeminiJsonLiterals(withSeparators));
  }

  function parseGeminiJsonDetailed(text) {
    const raw = String(text || '');
    let lastError = new SyntaxError('Gemini 응답에 JSON 객체 또는 배열이 없습니다.');
    const attempts = [];
    const add = (stage, value, autoRepairAttempted = true) => {
      const candidate = String(value || '').trim();
      if (candidate && !attempts.some((item) => item.value === candidate)) attempts.push({ stage, value: candidate, autoRepairAttempted });
    };
    add('code_fence_removed', stripGeminiJsonFence(raw));
    add('fence_markers_removed', raw.replace(/```(?:json)?/gi, '').replace(/```/g, ''));
    add('json_object_extracted', extractGeminiJsonObjectText(raw));
    add('json_object_extracted_after_fence', extractGeminiJsonObjectText(stripGeminiJsonFence(raw)));
    for (const segment of geminiJsonSegments(raw)) add('balanced_segment', segment);
    const baseAttempts = [...attempts];
    baseAttempts.forEach(({ stage, value }) => add(`${stage}_trailing_commas_removed`, removeGeminiJsonTrailingCommas(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_whitespace_normalized`, normalizeGeminiJsonWhitespace(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_smart_quotes_normalized`, normalizeGeminiJsonQuotes(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_control_chars_removed`, removeGeminiJsonControlChars(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_sanitized`, sanitizeGeminiJson(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_commas_repaired`, repairGeminiJsonCommas(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_commas_repaired_sanitized`, sanitizeGeminiJson(repairGeminiJsonCommas(value))));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_structure_repaired`, repairGeminiJsonStructure(value)));
    [...attempts].forEach(({ stage, value }) => add(`${stage}_structure_repaired_sanitized`, sanitizeGeminiJson(repairGeminiJsonStructure(value))));
    add('raw', raw, false);
    for (const { stage, value, autoRepairAttempted } of attempts) {
      try {
        const parsed = JSON.parse(value);
        logGeminiJsonParse(stage, 'success', { length: value.length });
        if (typeof parsed === 'string' && /^\s*[\[{]/.test(parsed)) {
          const nested = sanitizeGeminiJson(repairGeminiJsonCommas(parsed));
          const nestedParsed = JSON.parse(nested);
          logGeminiJsonParse(`${stage}_nested_string`, 'success', { length: nested.length });
          return { value: nestedParsed, stage: `${stage}_nested_string`, autoRepairAttempted: true, autoRepairSuccess: true };
        }
        return { value: parsed, stage, autoRepairAttempted, autoRepairSuccess: autoRepairAttempted };
      } catch (err) {
        lastError = err;
        logGeminiJsonParse(stage, 'failure', { message: err.message, length: value.length });
      }
    }
    throw geminiJsonParseError(`Gemini 응답 JSON 형식이 올바르지 않습니다: ${lastError.message}`, lastError, attempts.at(-1)?.stage || 'raw', raw);
  }

  function parseGeminiJson(text) {
    return parseGeminiJsonDetailed(text).value;
  }

  Object.assign(window, {
    geminiJsonSegments,
    stripGeminiJsonFence,
    extractGeminiJsonObjectText,
    normalizeGeminiJsonQuotes,
    removeGeminiJsonControlChars,
    removeGeminiJsonTrailingCommas,
    normalizeGeminiJsonWhitespace,
    looksLikeTruncatedGeminiJson,
    geminiJsonParseError,
    logGeminiJsonParse,
    geminiFinishErrorType,
    assertGeminiCandidateCompleted,
    sanitizeGeminiJson,
    repairGeminiJsonCommas,
    repairGeminiJsonValueSeparators,
    repairGeminiJsonClosers,
    repairGeminiJsonLiterals,
    repairGeminiJsonStructure,
    parseGeminiJsonDetailed,
    parseGeminiJson
  });
})();
