/*
  New report module template

  Usage:
  1. Copy this file to reports/<reportType>ReportModule.js.
  2. Replace REPORT_TYPE, titles, form fields, schema, prompt, normalizer, and renderer.
  3. Add the new report definition to reportRegistry.js with modulePath pointing to this file.
  4. Do not edit index.html, reportWorkspace.js, dashboardView.js, or reportRuntime.js.

  Do not duplicate Gemini fetch, JSON parsing, repair, retry, or usage-event logic here.
  Those concerns belong to js/ai/aiJsonRuntime.js and js/runtime/reportRuntime.js.
*/
(function () {
  const REPORT_TYPE = 'newReport';
  const REPORT_TITLE = '새 리포트';

  function newReportSchema() {
    return {
      participantInfo: 'object',
      summary: 'string',
      sections: [{ title: 'string', body: 'string' }],
      counselorQuestions: 'string[]'
    };
  }

  function collectNewReportInput(p) {
    return {
      participant: p,
      memo: val('newReportMemo')
    };
  }

  function buildNewReportPrompt(input) {
    return {
      system: [
        '너는 상담사용 리포트를 생성하는 전문가이다.',
        '반드시 JSON 객체만 출력한다.',
        '제공되지 않은 정보는 추정하지 않는다.'
      ].join('\n'),
      user: JSON.stringify({
        task: `${REPORT_TITLE} 생성`,
        input
      })
    };
  }

  function normalizeNewReportData(raw = {}, input = {}) {
    const participant = input.participant || {};
    return {
      participantInfo: {
        name: participant.name || '',
        age: participant.age || '',
        target: participant.target || ''
      },
      summary: String(raw.summary || ''),
      sections: Array.isArray(raw.sections)
        ? raw.sections.map((section) => ({
          title: String(section?.title || ''),
          body: String(section?.body || '')
        })).filter((section) => section.title || section.body)
        : [],
      counselorQuestions: Array.isArray(raw.counselorQuestions)
        ? raw.counselorQuestions.map((item) => String(item || '').trim()).filter(Boolean)
        : []
    };
  }

  function renderNewReport(data) {
    const sections = data.sections.length
      ? data.sections.map((section) => `<h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body).replaceAll('\n', '<br>')}</p>`).join('')
      : '<p>생성된 섹션이 없습니다.</p>';
    const questions = data.counselorQuestions.length
      ? `<ul>${data.counselorQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul>`
      : '<p>상담 질문이 없습니다.</p>';

    return `<div class="report">
      <h1>${escapeHtml(data.participantInfo.name || '내담자')} ${REPORT_TITLE}</h1>
      <div class="summary-box">
        <p><strong>요약:</strong> ${escapeHtml(data.summary || '추가 분석 필요')}</p>
      </div>
      ${sections}
      <h2>상담 질문</h2>
      ${questions}
    </div>`;
  }

  async function requestNewReportData(input, options = {}) {
    const prompt = buildNewReportPrompt(input);
    const result = await generateJsonWithRecovery({
      reportType: REPORT_TYPE,
      modelScope: REPORT_TYPE,
      systemInstruction: prompt.system,
      userPrompt: prompt.user,
      schema: newReportSchema(),
      context: REPORT_TITLE,
      allowJsonRepair: options.allowJsonRepair !== false
    });

    return {
      ...normalizeNewReportData(result.json, input),
      tokenUsage: result.tokenUsage
    };
  }

  window.REPORT_MODULES.register(REPORT_TYPE, {
    renderForm(p) {
      const name = p?.name || '내담자';
      return `<div class="notice">선택 참여자: <strong>${escapeHtml(name)}</strong></div>
        <div class="field">
          <label>상담사 메모</label>
          <textarea id="newReportMemo" placeholder="리포트 생성에 반영할 상담 메모를 입력하세요."></textarea>
        </div>
        <button class="btn full" onclick="generateReport('${REPORT_TYPE}')">${REPORT_TITLE} 생성</button>`;
    },
    validate() {
      return true;
    },
    async generate(p) {
      const input = collectNewReportInput(p);
      const data = await requestNewReportData(input);
      const title = `${p.name} ${REPORT_TITLE}`;
      state.currentReport = {
        id: null,
        type: REPORT_TYPE,
        title,
        participantId: p.id,
        participantName: p.name,
        html: renderNewReport(data),
        createdAt: today()
      };
      finishGeneratedReportUi();
      return { tokenUsage: data.tokenUsage };
    }
  });
})();
