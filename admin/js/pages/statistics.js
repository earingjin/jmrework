const EVENTS = {
  REPORT_GENERATION_STARTED: "report_generation_started",
  REPORT_GENERATION_SUCCEEDED: "report_generation_succeeded",
  REPORT_GENERATION_FAILED: "report_generation_failed",
};

function reportTypeName(type) {
  return {
    company: "기업 분석 리포트",
    interest: "직업선호도검사 리포트",
    interview: "상황 면접 시뮬레이션",
    senior: "신중년 경력자산 리포트",
    success: "성공 사례",
    jobAnalysis: "직무분석리포트",
    jobs: "채용정보 매칭",
  }[type] || type || "기타 리포트";
}

function eventDateKey(event, period) {
  const match = String(event?.recordedAt || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "날짜 미상";
  if (period === "year") return match[1];
  if (period === "month") return `${match[1]}-${match[2]}`;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function countItemsBy(items, keyFn) {
  return items.reduce((result, item) => {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function periodStatsTable(title, counts, label) {
  const rows = Object.entries(counts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, count]) => `<tr><td>${escapeHtml(key)}</td><td><strong>${count}회</strong></td></tr>`)
    .join("");
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>${label}</th><th>이벤트 수</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="empty">집계할 이벤트가 없습니다.</div>';
  return `<div class="panel"><div class="panel-head"><h3>${title}</h3></div><div class="panel-body">${contents}</div></div>`;
}

function statisticsSection() {
  const events = Array.isArray(state.data.usageEvents) ? state.data.usageEvents : [];
  const startedEvents = events.filter((event) => event?.eventName === EVENTS.REPORT_GENERATION_STARTED);
  const successEvents = events.filter((event) => event?.eventName === EVENTS.REPORT_GENERATION_SUCCEEDED);
  const failedEvents = events.filter((event) => event?.eventName === EVENTS.REPORT_GENERATION_FAILED);

  const totalAttempts = startedEvents.length;

  const daily = countItemsBy(startedEvents, (event) => eventDateKey(event, "day"));
  const monthly = countItemsBy(startedEvents, (event) => eventDateKey(event, "month"));
  const yearly = countItemsBy(startedEvents, (event) => eventDateKey(event, "year"));

  const successByType = countItemsBy(successEvents, (event) => event?.payload?.reportType || "unknown");
  const errorByType = countItemsBy(failedEvents, (event) => {
    return event?.payload?.errorName || event?.payload?.reason || "unknown";
  });

  const maxType = Math.max(1, ...Object.values(successByType));
  const typeRows = Object.entries(successByType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<tr><td><strong>${escapeHtml(reportTypeName(type))}</strong></td><td>${count}회</td><td><div class="stat-bar"><span style="width:${Math.round(count / maxType * 100)}%"></span></div></td></tr>`)
    .join("");

  const errorRows = Object.entries(errorByType)
    .sort((a, b) => b[1] - a[1])
    .map(([errorName, count]) => `<tr><td>${escapeHtml(errorName)}</td><td><strong>${count}회</strong></td></tr>`)
    .join("");

  const todayKey = today();
  const todayCount = daily[todayKey] || 0;
  const monthKey = todayKey.slice(0, 7);
  const monthCount = monthly[monthKey] || 0;

  const typeContents = typeRows
    ? `<div class="table-wrap"><table><thead><tr><th>리포트 유형</th><th>성공 수</th><th>비교</th></tr></thead><tbody>${typeRows}</tbody></table></div>`
    : '<div class="empty">성공 리포트가 없습니다.</div>';

  const errorContents = errorRows
    ? `<div class="table-wrap"><table><thead><tr><th>오류 종류</th><th>발생 수</th></tr></thead><tbody>${errorRows}</tbody></table></div>`
    : '<div class="empty">오류 이벤트가 없습니다.</div>';

  // 상담사별 성공 집계 (successEvents 기준, 원본 배열 변경하지 않음)
  const successByCounselorMap = successEvents.reduce((acc, ev) => {
    const payload = ev?.payload && typeof ev.payload === 'object' ? ev.payload : {};
    const id = payload.counselorId || null;
    const name = payload.counselorName || null;
    const displayName = name || id || '상담사 정보 없음';
    const key = `${id || 'no-id'}||${displayName}`;
    if (!acc[key]) acc[key] = { id, name: displayName, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});

  const counselorRows = Object.values(successByCounselorMap)
    .sort((a, b) => b.count - a.count)
    .map(c => `<tr><td>${escapeHtml(c.name)}</td><td><strong>${c.count}회</strong></td></tr>`)
    .join("");

  const counselorContents = counselorRows
    ? `<div class="table-wrap"><table><thead><tr><th>상담사</th><th>성공 수</th></tr></thead><tbody>${counselorRows}</tbody></table></div>`
    : '<div class="empty">상담사 성공 데이터가 없습니다.</div>';

  return `
    <section id="section-statistics" class="section">
      ${pageTitle("리포트 생성 통계", "사용 이벤트(usageEvents) 기반으로 보고서 생성 시도와 성공/실패를 집계합니다.")}
      <div class="cards">
        <div class="metric"><span>전체 생성 시도</span><strong>${totalAttempts}</strong></div>
        <div class="metric"><span>성공 수</span><strong>${successEvents.length}</strong></div>
        <div class="metric"><span>실패 수</span><strong>${failedEvents.length}</strong></div>
        <div class="metric"><span>오늘 이벤트</span><strong>${todayCount}</strong></div>
        <div class="metric"><span>이번 달 이벤트</span><strong>${monthCount}</strong></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>리포트 유형별 성공 통계</h3><span class="small">payload.reportType 기준</span></div><div class="panel-body">${typeContents}</div></div>
      <div class="panel"><div class="panel-head"><h3>상담사별 성공 통계</h3><span class="small">successEvents의 payload.counselorId / payload.counselorName 기준</span></div><div class="panel-body">${counselorContents}</div></div>
      <div class="panel"><div class="panel-head"><h3>오류 종류별 통계</h3><span class="small">payload.errorName 또는 payload.reason 기준</span></div><div class="panel-body">${errorContents}</div></div>
      <div class="stats-grid">${periodStatsTable("일별 통계", daily, "일자")}${periodStatsTable("월별 통계", monthly, "월")}${periodStatsTable("연도별 통계", yearly, "연도")}</div>
      <p class="note">통계 연동에 필요한 이벤트 필드는 recordedAt, payload.reportType, payload.errorName/ reason입니다.</p>
    </section>`;
}
