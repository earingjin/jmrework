const EVENTS = {
  REPORT_GENERATION_STARTED: "report_generation_started",
  REPORT_GENERATION_COMPLETED: "report_generation_completed",
  REPORT_GENERATION_SUCCEEDED: "report_generation_succeeded",
  REPORT_GENERATION_FAILED: "report_generation_failed",
};
const REPORT_FINAL_STATUS = Object.freeze({ SUCCESS: "SUCCESS", RECOVERED_SUCCESS: "RECOVERED_SUCCESS", FAILED: "FAILED" });
const REPORT_ERROR_TYPE = Object.freeze({ NONE: "NONE", JSON_PARSE_ERROR: "JSON_PARSE_ERROR", JSON_REPAIR_FAILED: "JSON_REPAIR_FAILED", AI_EMPTY_RESPONSE: "AI_EMPTY_RESPONSE", AI_RESPONSE_TRUNCATED: "AI_RESPONSE_TRUNCATED", RATE_LIMIT: "RATE_LIMIT", SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", NETWORK_ERROR: "NETWORK_ERROR", AUTH_ERROR: "AUTH_ERROR", VALIDATION_ERROR: "VALIDATION_ERROR", TIMEOUT: "TIMEOUT", UNKNOWN_ERROR: "UNKNOWN_ERROR" });
const REPORT_RECOVERY_TYPE = Object.freeze({ NONE: "NONE", CODE_REPAIR: "CODE_REPAIR", AI_JSON_REPAIR: "AI_JSON_REPAIR", FULL_REGENERATION: "FULL_REGENERATION", DEFAULT_VALUE: "DEFAULT_VALUE", RETRY_SUCCESS: "RETRY_SUCCESS" });
const REPORT_RETRY_REASON = Object.freeze({ NONE: "NONE", JSON_PARSE_ERROR: "JSON_PARSE_ERROR", JSON_REPAIR_FAILED: "JSON_REPAIR_FAILED", AI_EMPTY_RESPONSE: "AI_EMPTY_RESPONSE", AI_RESPONSE_TRUNCATED: "AI_RESPONSE_TRUNCATED", RATE_LIMIT: "RATE_LIMIT", SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", NETWORK_ERROR: "NETWORK_ERROR", TIMEOUT: "TIMEOUT" });

function reportTypeName(type) {
  return {
    company: "기업 분석 리포트",
    interest: "직업선호도검사 리포트",
    interview: "상황 면접 시뮬레이션",
    senior: "중장년 경력자산 리포트",
    success: "취업 성공 사례",
    jobAnalysis: "직무분석리포트",
    jobs: "채용정보 매칭",
  }[type] || type || "기타 리포트";
}

function numberText(value) {
  return Math.round(Number(value) || 0).toLocaleString("ko-KR");
}

function durationText(value) {
  const ms = Number(value) || 0;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${Math.round(ms)}ms`;
}

function percentText(value, total) {
  return total ? `${(value / total * 100).toFixed(1)}%` : "0.0%";
}

function tokenTotal(event) {
  return Number(event?.payload?.tokenUsage?.totalTokens) || 0;
}

function dateInputText(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function setStatisticsPeriod(preset) {
  const now = new Date();
  const end = dateInputText(now);
  let start = "";
  if (preset === "today") start = end;
  if (preset === "7days") {
    const date = new Date(now);
    date.setDate(date.getDate() - 6);
    start = dateInputText(date);
  }
  if (preset === "30days") {
    const date = new Date(now);
    date.setDate(date.getDate() - 29);
    start = dateInputText(date);
  }
  if (preset === "month") start = `${end.slice(0, 7)}-01`;
  state.statisticsPeriod = { preset, start, end: preset === "all" ? "" : end };
}

function applyCustomStatisticsPeriod() {
  const start = val("statisticsStart");
  const end = val("statisticsEnd");
  state.statisticsPeriod = { preset: "custom", start, end };
}

function statisticsDateRange() {
  const period = state.statisticsPeriod || { preset: "all", start: "", end: "" };
  const start = period.start ? new Date(`${period.start}T00:00:00`) : null;
  const end = period.end ? new Date(`${period.end}T23:59:59.999`) : null;
  return { ...period, startDate: start, endDate: end };
}

function inStatisticsPeriod(value, range) {
  if (!value) return range.preset === "all";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (!range.startDate || date >= range.startDate) && (!range.endDate || date <= range.endDate);
}

function statisticsFilterHtml(range) {
  const options = [["all", "전체"], ["today", "오늘"], ["7days", "최근 7일"], ["30days", "최근 30일"], ["month", "이번 달"]];
  const buttons = options.map(([id, label]) => `<button class="btn secondary ${range.preset === id ? "active" : ""}" data-action="set-statistics-period" data-id="${id}">${label}</button>`).join("");
  const summary = range.preset === "all" ? "전체 기간" : `${range.start || "처음"} ~ ${range.end || "오늘"}`;
  return `<div class="panel"><div class="panel-head"><h3>조회 기간</h3><span class="small">선택한 기간을 모든 운영 지표에 적용합니다.</span></div><div class="panel-body"><div class="statistics-filter"><div class="period-actions">${buttons}</div><div class="field"><label>시작일</label><input id="statisticsStart" type="date" value="${escapeHtml(range.start || "")}"></div><div class="field"><label>종료일</label><input id="statisticsEnd" type="date" value="${escapeHtml(range.end || "")}"></div><button class="btn" data-action="apply-statistics-period">기간 적용</button></div><div class="statistics-period-summary">현재 조회 기간: <strong>${escapeHtml(summary)}</strong></div></div></div>`;
}

function reportErrorLabel(event) {
  const type = event?.payload?.errorType || event?.payload?.errorName || event?.payload?.reason || "UNKNOWN_ERROR";
  const inferredStatus = {
    RATE_LIMIT: 429,
    SERVICE_UNAVAILABLE: 503,
    AUTH_ERROR: 401,
  }[type] || 0;
  const status = Number(event?.payload?.status) || inferredStatus;
  return status ? `HTTP ${status} / ${type}` : type;
}

function isReportCompletionEvent(event) {
  return [EVENTS.REPORT_GENERATION_COMPLETED, EVENTS.REPORT_GENERATION_SUCCEEDED, EVENTS.REPORT_GENERATION_FAILED].includes(event?.eventName);
}

function reportFinalStatus(event) {
  if (event?.payload?.finalStatus) return event.payload.finalStatus;
  if (event?.eventName === EVENTS.REPORT_GENERATION_SUCCEEDED) return REPORT_FINAL_STATUS.SUCCESS;
  if (event?.eventName === EVENTS.REPORT_GENERATION_FAILED) return REPORT_FINAL_STATUS.FAILED;
  return "";
}

function accountBranch(counselorId) {
  const account = state.data.accounts.find((item) => item.id === counselorId);
  return account?.branch || "미지정";
}

function usageGroupData(events, keyFn, labelFn = (key) => key) {
  const groups = new Map();
  events.forEach((event) => {
    const key = keyFn(event) || "미지정";
    if (!groups.has(key)) groups.set(key, { attempts: 0, success: 0, recovered: 0, failed: 0, tokens: 0, duration: 0, completed: 0, retries: 0 });
    const row = groups.get(key);
    const finalStatus = reportFinalStatus(event);
    if (event?.eventName === EVENTS.REPORT_GENERATION_STARTED) row.attempts += 1;
    if (finalStatus === REPORT_FINAL_STATUS.SUCCESS) {
      row.success += 1;
      row.tokens += tokenTotal(event);
    }
    if (finalStatus === REPORT_FINAL_STATUS.RECOVERED_SUCCESS) {
      row.recovered += 1;
      row.tokens += tokenTotal(event);
    }
    if (finalStatus === REPORT_FINAL_STATUS.FAILED) row.failed += 1;
    if (isReportCompletionEvent(event)) {
      row.duration += Number(event?.payload?.durationMs) || 0;
      row.retries += Number(event?.payload?.retryCount) || 0;
      row.completed += 1;
    }
  });

  return [...groups.entries()]
    .sort((a, b) => b[1].attempts - a[1].attempts)
    .map(([key, row]) => ({ ...row, label: labelFn(key), successRate: row.attempts ? (row.success + row.recovered) / row.attempts : 0, averageDurationMs: row.completed ? row.duration / row.completed : 0 }));
}

function usageGroupRows(data) {
  return data
    .map((row) => `<tr><td><strong>${escapeHtml(row.label)}</strong></td><td>${numberText(row.attempts)}</td><td>${numberText(row.success)}</td><td>${numberText(row.recovered)}</td><td>${numberText(row.failed)}</td><td>${percentText(row.success + row.recovered, row.attempts)}</td><td>${numberText(row.tokens)}</td><td>${durationText(row.averageDurationMs)}</td><td>${numberText(row.retries)}</td></tr>`)
    .join("");
}

function usageTable(title, description, rows, firstColumn, exportKind) {
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>${firstColumn}</th><th>전체 생성</th><th>최종 성공</th><th>복구 성공</th><th>최종 실패</th><th>성공률</th><th>토큰</th><th>평균 시간</th><th>재시도</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="empty">집계할 리포트 생성 이벤트가 없습니다.</div>';
  return `<div class="panel"><div class="panel-head"><div><h3>${title}</h3><span class="small">${description}</span></div><button class="btn secondary" data-action="download-statistics" data-id="${exportKind}">엑셀 다운로드</button></div><div class="panel-body">${contents}</div></div>`;
}

function geminiServerErrorPanels(errors) {
  const counts = errors.reduce((result, error) => {
    const key = `${error?.model || "unknown"} / HTTP ${error?.status || 0}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const summaryRows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `<tr><td>${escapeHtml(key)}</td><td><strong>${numberText(count)}건</strong></td></tr>`)
    .join("");
  const recentRows = errors.slice(0, 30)
    .map((error) => `<tr><td>${escapeHtml(new Date(error?.occurredAt).toLocaleString("ko-KR"))}</td><td>${escapeHtml(error?.model || "unknown")}</td><td><strong>${escapeHtml(error?.status || 0)}</strong></td><td>${escapeHtml(error?.message || "")}</td></tr>`)
    .join("");
  const summary = summaryRows
    ? `<div class="table-wrap"><table><thead><tr><th>모델 / 상태 코드</th><th>발생 건수</th></tr></thead><tbody>${summaryRows}</tbody></table></div>`
    : '<div class="empty">서버에 기록된 Gemini 오류가 없습니다.</div>';
  const recent = recentRows
    ? `<div class="table-wrap"><table><thead><tr><th>발생 시각</th><th>모델명</th><th>상태 코드</th><th>Gemini 오류 메시지</th></tr></thead><tbody>${recentRows}</tbody></table></div>`
    : '<div class="empty">서버에 기록된 Gemini 오류가 없습니다.</div>';
  return `<div class="panel"><div class="panel-head"><h3>Gemini 서버 오류 통계</h3><div class="actions"><button class="btn secondary" data-action="download-statistics" data-id="gemini">엑셀 다운로드</button><button class="btn secondary" data-action="reload-gemini-errors">새로고침</button></div></div><div class="panel-body">${summary}</div></div><div class="panel"><div class="panel-head"><h3>최근 Gemini 서버 오류</h3><span class="small">장애 대응용 최근 ${Math.min(errors.length, 30)}건</span></div><div class="panel-body">${recent}</div></div>`;
}

function statisticsData() {
  const range = statisticsDateRange();
  const events = (Array.isArray(state.data.usageEvents) ? state.data.usageEvents : []).filter((event) => inStatisticsPeriod(event?.recordedAt, range));
  const geminiErrors = (Array.isArray(state.data.geminiErrors) ? state.data.geminiErrors : []).filter((error) => inStatisticsPeriod(error?.occurredAt, range));
  const completed = events.filter(isReportCompletionEvent);
  const started = events.filter((event) => event?.eventName === EVENTS.REPORT_GENERATION_STARTED);
  const succeeded = completed.filter((event) => reportFinalStatus(event) === REPORT_FINAL_STATUS.SUCCESS);
  const recovered = completed.filter((event) => reportFinalStatus(event) === REPORT_FINAL_STATUS.RECOVERED_SUCCESS);
  const failed = completed.filter((event) => reportFinalStatus(event) === REPORT_FINAL_STATUS.FAILED);
  const totalTokens = [...succeeded, ...recovered].reduce((sum, event) => sum + tokenTotal(event), 0);
  const totalRetries = completed.reduce((sum, event) => sum + (Number(event?.payload?.retryCount) || 0), 0);
  const averageDuration = completed.length
    ? completed.reduce((sum, event) => sum + (Number(event?.payload?.durationMs) || 0), 0) / completed.length
    : 0;

  const errorStats = completed.filter((event) => event?.payload?.errorType && event.payload.errorType !== REPORT_ERROR_TYPE.NONE).reduce((result, event) => {
    const key = event.payload.errorType || REPORT_ERROR_TYPE.UNKNOWN_ERROR;
    if (!result[key]) result[key] = { count: 0, recovered: 0, failed: 0 };
    result[key].count += 1;
    if (reportFinalStatus(event) === REPORT_FINAL_STATUS.RECOVERED_SUCCESS) result[key].recovered += 1;
    if (reportFinalStatus(event) === REPORT_FINAL_STATUS.FAILED) result[key].failed += 1;
    return result;
  }, {});
  const errorCounts = Object.fromEntries(Object.entries(errorStats).map(([key, value]) => [key, value.count]));
  const typeData = usageGroupData(events, (event) => event?.payload?.reportType || "unknown", reportTypeName);
  const counselorData = usageGroupData(events, (event) => event?.payload?.counselorId || event?.payload?.counselorName || "미지정", (key) => {
    const account = state.data.accounts.find((item) => item.id === key);
    return maskCounselorName(account?.name || key);
  });
  const branchData = usageGroupData(events, (event) => event?.payload?.branch || accountBranch(event?.payload?.counselorId));
  return { range, events, geminiErrors, started, succeeded, recovered, failed, completed, totalTokens, totalRetries, averageDuration, errorCounts, errorStats, typeData, counselorData, branchData };
}

function usageExportRows(data, label) {
  return data.map((row) => ({
    [label]: row.label,
    "전체 생성": row.attempts,
    "최종 성공": row.success,
    "복구 성공": row.recovered,
    "최종 실패": row.failed,
    "성공률(%)": Number(((row.success + row.recovered) / (row.attempts || 1) * 100).toFixed(1)),
    "토큰 사용량": row.tokens,
    "평균 생성 시간(ms)": Math.round(row.averageDurationMs),
    "재시도 횟수": row.retries,
  }));
}

function statisticsExportSheets() {
  const data = statisticsData();
  const summary = [{
    "조회 시작일": data.range.start || "전체",
    "조회 종료일": data.range.end || "전체",
    "전체 생성 건수": data.started.length,
    "최종 성공 건수": data.succeeded.length,
    "복구 성공 건수": data.recovered.length,
    "최종 실패 건수": data.failed.length,
    "성공률(%)": Number((data.started.length ? (data.succeeded.length + data.recovered.length) / data.started.length * 100 : 0).toFixed(1)),
    "총 토큰 사용량": data.totalTokens,
    "평균 생성 시간(ms)": Math.round(data.averageDuration),
    "재시도 횟수": data.totalRetries,
    "오류 유형 수": Object.keys(data.errorCounts).length,
    "Gemini 서버 오류": data.geminiErrors.length,
  }];
  const errors = Object.entries(data.errorStats).sort((a, b) => b[1].count - a[1].count).map(([type, stat]) => ({
    "오류 유형": type,
    "발생 건수": stat.count,
    "복구 성공 건수": stat.recovered,
    "최종 실패 건수": stat.failed,
    "복구율(%)": Number((stat.count ? stat.recovered / stat.count * 100 : 0).toFixed(1)),
  }));
  const gemini = data.geminiErrors.map((error) => ({
    "발생 시각": error?.occurredAt || "",
    "모델명": error?.model || "unknown",
    "상태 코드": Number(error?.status) || 0,
    "오류 메시지": error?.message || "",
  }));
  return {
    summary,
    type: usageExportRows(data.typeData, "리포트 종류"),
    counselor: usageExportRows(data.counselorData, "상담사"),
    branch: usageExportRows(data.branchData, "지사"),
    errors,
    gemini,
  };
}

function appendStatisticsSheet(workbook, name, rows) {
  const sheet = window.XLSX.utils.json_to_sheet(rows.length ? rows : [{ "안내": "선택한 기간에 집계할 데이터가 없습니다." }]);
  window.XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function downloadStatisticsExcel(kind = "all") {
  if (!window.XLSX) return toast("엑셀 다운로드 기능을 불러오지 못했습니다.");
  const sheets = statisticsExportSheets();
  const workbook = window.XLSX.utils.book_new();
  const definitions = {
    summary: ["운영 요약", sheets.summary],
    type: ["리포트 종류별", sheets.type],
    counselor: ["상담사별", sheets.counselor],
    branch: ["지사별", sheets.branch],
    errors: ["오류 유형", sheets.errors],
    gemini: ["Gemini 서버 오류", sheets.gemini],
  };
  if (kind === "all") Object.values(definitions).forEach(([name, rows]) => appendStatisticsSheet(workbook, name, rows));
  else {
    const definition = definitions[kind];
    if (!definition) return;
    appendStatisticsSheet(workbook, definition[0], definition[1]);
  }
  const range = statisticsDateRange();
  const period = range.preset === "all" ? "전체기간" : `${range.start || "처음"}_${range.end || "오늘"}`;
  window.XLSX.writeFile(workbook, `리포트_운영통계_${kind}_${period}.xlsx`);
}

function statisticsSection() {
  const data = statisticsData();
  const { range, geminiErrors, started, succeeded, recovered, failed, totalTokens, totalRetries, averageDuration, errorCounts, errorStats } = data;
  const errorRows = Object.entries(errorStats)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, stat]) => `<tr><td>${escapeHtml(type)}</td><td><strong>${numberText(stat.count)}건</strong></td><td>${numberText(stat.recovered)}건</td><td>${numberText(stat.failed)}건</td><td>${percentText(stat.recovered, stat.count)}</td></tr>`)
    .join("");
  const errorContents = errorRows
    ? `<div class="table-wrap"><table><thead><tr><th>오류 유형</th><th>발생 건수</th><th>복구 성공 건수</th><th>최종 실패 건수</th><th>복구율</th></tr></thead><tbody>${errorRows}</tbody></table></div>`
    : '<div class="empty">기록된 리포트 생성 오류가 없습니다.</div>';

  const typeRows = usageGroupRows(data.typeData);
  const counselorRows = usageGroupRows(data.counselorData);
  const branchRows = usageGroupRows(data.branchData);

  return `
    <section id="section-statistics" class="section">
      ${pageTitle("리포트 운영 통계", "비용 최적화, 장애 대응, 기능 개선을 위한 리포트 생성 지표입니다.")}
      ${statisticsFilterHtml(range)}
      <div class="actions statistics-download-actions"><button class="btn" data-action="download-statistics" data-id="all">전체 통계 엑셀 다운로드</button><button class="btn secondary" data-action="download-statistics" data-id="summary">운영 요약 다운로드</button></div>
      <div class="cards">
        <div class="metric"><span>전체 생성 건수</span><strong>${numberText(started.length)}</strong></div>
        <div class="metric"><span>최종 성공 / 복구 성공</span><strong>${numberText(succeeded.length)} / ${numberText(recovered.length)}</strong></div>
        <div class="metric"><span>최종 실패</span><strong>${numberText(failed.length)}</strong></div>
        <div class="metric"><span>성공률</span><strong>${percentText(succeeded.length + recovered.length, started.length)}</strong></div>
        <div class="metric"><span>총 토큰 사용량</span><strong>${numberText(totalTokens)}</strong></div>
        <div class="metric"><span>평균 생성 시간</span><strong>${durationText(averageDuration)}</strong></div>
        <div class="metric"><span>재시도 횟수</span><strong>${numberText(totalRetries)}</strong></div>
        <div class="metric"><span>오류 유형 수</span><strong>${numberText(Object.keys(errorCounts).length)}</strong></div>
        <div class="metric"><span>Gemini 서버 오류</span><strong>${numberText(geminiErrors.length)}</strong></div>
      </div>
      ${usageTable("리포트 종류별 사용량", "비용과 기능별 수요를 비교합니다.", typeRows, "리포트 종류", "type")}
      ${usageTable("상담사별 사용량", "지원과 교육이 필요한 사용 패턴을 확인합니다.", counselorRows, "상담사", "counselor")}
      ${usageTable("지사별 사용량", "지사별 도입·활용 수준을 비교합니다.", branchRows, "지사", "branch")}
      <div class="panel"><div class="panel-head"><div><h3>오류 유형</h3><span class="small">장애 대응과 기능 개선 우선순위에 활용합니다.</span></div><button class="btn secondary" data-action="download-statistics" data-id="errors">엑셀 다운로드</button></div><div class="panel-body">${errorContents}</div></div>
      ${geminiServerErrorPanels(geminiErrors)}
      <p class="note">기존 이벤트에 지사 또는 재시도 값이 없으면 각각 미지정, 0으로 집계됩니다.</p>
    </section>`;
}
