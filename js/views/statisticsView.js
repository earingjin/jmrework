function isReportCompletionEvent(log) {
  return [
    EVENTS.REPORT_GENERATION_COMPLETED,
    EVENTS.REPORT_GENERATION_SUCCEEDED,
    EVENTS.REPORT_GENERATION_FAILED
  ].includes(log?.eventName);
}

function reportFinalStatus(log) {
  if (log?.payload?.finalStatus) return log.payload.finalStatus;
  if (log?.eventName === EVENTS.REPORT_GENERATION_SUCCEEDED) return REPORT_FINAL_STATUS.SUCCESS;
  if (log?.eventName === EVENTS.REPORT_GENERATION_FAILED) return REPORT_FINAL_STATUS.FAILED;
  return '';
}

function usageEventCount(logs, eventName) {
  return logs.filter(log => log?.eventName === eventName).length;
}

function usageReportTypeRows(logs) {
  const counts = {};
  logs
    .filter(log => [REPORT_FINAL_STATUS.SUCCESS, REPORT_FINAL_STATUS.RECOVERED_SUCCESS].includes(reportFinalStatus(log)))
    .forEach((log) => {
      const type = log?.payload?.reportType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<tr><td>${escapeHtml(reportTypeName(type))}</td><td>${count}</td></tr>`)
    .join('');
}

function usageRecentRows(logs) {
  return logs.slice(-20).reverse().map(log => `<tr><td>${escapeHtml(new Date(log.recordedAt).toLocaleString('ko-KR'))}</td><td>${escapeHtml(reportFinalStatus(log) || log.eventName || '')}</td><td>${escapeHtml(log.payload?.reportType || '-')}</td><td>${escapeHtml(log.payload?.errorType || '-')}</td><td>${escapeHtml(log.payload?.durationMs ?? '-')}</td></tr>`).join('');
}

function adminStatsSection() {
  const logs = loadUsageLogs();
  const reports = logs.filter(isReportCompletionEvent);
  const succeeded = reports.filter(log => reportFinalStatus(log) === REPORT_FINAL_STATUS.SUCCESS);
  const recovered = reports.filter(log => reportFinalStatus(log) === REPORT_FINAL_STATUS.RECOVERED_SUCCESS);
  const failed = reports.filter(log => reportFinalStatus(log) === REPORT_FINAL_STATUS.FAILED);
  const aiFailed = usageEventCount(logs, EVENTS.AI_REQUEST_FAILED);
  const successRate = reports.length ? Math.round((succeeded.length + recovered.length) / reports.length * 100) : 0;
  const typeRows = usageReportTypeRows(logs);
  const recentRows = usageRecentRows(logs);
  return `<section id="section-admin" class="section">${pageTitle('관리자 통계', 'ai_career_usage_events_v1에 저장된 사용 이벤트를 집계합니다.', '<button class="btn secondary" onclick="render()">새로고침</button>')}<div class="cards"><div class="metric"><span>리포트 생성 완료</span><strong>${reports.length}</strong></div><div class="metric"><span>최종 성공 / 복구 성공</span><strong>${succeeded.length} / ${recovered.length}</strong></div><div class="metric"><span>최종 성공률</span><strong>${successRate}%</strong></div><div class="metric"><span>최종 실패 / AI 요청 실패</span><strong>${failed.length} / ${aiFailed}</strong></div></div><div class="panel"><div class="panel-head"><h3>리포트 유형별 생성 성공</h3></div><div class="panel-body">${typeRows ? `<div class="table-wrap"><table><thead><tr><th>리포트 유형</th><th>성공 건수</th></tr></thead><tbody>${typeRows}</tbody></table></div>` : '<div class="empty">집계할 성공 이벤트가 없습니다.</div>'}</div></div><div class="panel"><div class="panel-head"><h3>최근 이벤트</h3><span class="small">총 ${logs.length}건 · 최근 20건 표시</span></div><div class="panel-body">${recentRows ? `<div class="table-wrap"><table><thead><tr><th>기록 시각</th><th>최종 상태</th><th>리포트 유형</th><th>오류 유형</th><th>소요시간(ms)</th></tr></thead><tbody>${recentRows}</tbody></table></div>` : '<div class="empty">저장된 사용 이벤트가 없습니다.</div>'}</div></div></section>`;
}

const adminSection = adminStatsSection;
