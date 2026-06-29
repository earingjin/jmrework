function participantSelector() {
  return '';
}

function moduleForm(type) {
  const p = getParticipant();
  if (!p) return `<div class="empty">참여자를 먼저 등록해야 리포트를 생성할 수 있습니다.</div>`;
  const reportModule = window.REPORT_MODULES?.get(type);
  if (!reportModule?.renderForm) return '';
  const common = `<div class="notice">선택 참여자: <strong>${escapeHtml(p.name)}</strong> / ${escapeHtml(p.age)} / ${escapeHtml(p.status)}<br>희망 방향: ${escapeHtml(p.target || '미입력')}</div>`;
  return reportModule.renderForm(p, common);
}

function modulesSection() {
  const p = getParticipant();
  const definition = reportDefinition(state.activeModule);
  const formHtml = moduleForm(state.activeModule);
  const formPanelHtml = definition?.formLayout === 'bare'
    ? formHtml
    : `<div class="panel-head"><h3>${reportTypeName(state.activeModule)}</h3></div><div class="panel-body">${formHtml}</div>`;
  return `<section id="section-modules" class="section print-target">${pageTitle(reportTypeName(state.activeModule), sc('modules').desc, participantSelector())}${!p ? `<div class="notice">${sc('modules').noParticipant}</div>` : ''}<div class="notice no-print"><strong>${moduleNoticeTitle(state.activeModule)}</strong><br>${moduleDescription(state.activeModule)}</div><div class="report-layout"><div class="panel form-panel no-print">${formPanelHtml}</div><div class="report-output"><div class="report-toolbar"><div class="report-preview-title"><img src="${BRAND_LOGO}" alt="${BRAND_NAME}" class="report-preview-logo"><div><strong>${sc('modules').previewTitle}</strong><br><span class="small">${sc('modules').previewDesc}</span></div></div><div class="actions"><button class="btn secondary" onclick="toggleEdit()">${state.editMode ? '편집 종료' : '편집하기'}</button><button class="btn light" onclick="printReport()">PDF 저장</button></div></div><div id="reportContent" class="report-content" contenteditable="${state.editMode ? 'true' : 'false'}">${currentReportHtml()}</div></div></div></section>`;
}

function emptyReport() {
  return `<div class="empty">왼쪽 입력 영역에서 정보를 입력한 뒤 리포트를 생성하세요.<br>생성된 내용은 상담사가 직접 편집할 수 있습니다.</div>`;
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function numberVal(id) {
  const n = Number(val(id));
  return Number.isFinite(n) ? n : 0;
}

function finishGeneratedReportUi() {
  state.editMode = false;
  render();
  toast('AI 리포트 초안이 생성되었습니다.');
}

function finishGeneratedReport(type, p, title, html) {
  html = withReportBrand(html, title);
  state.currentReport = {
    id: null,
    type,
    title,
    participantId: p.id,
    participantName: p.name,
    html,
    createdAt: today()
  };
  finishGeneratedReportUi();
}

async function generateReport(type, priority) {
  const p = getParticipant();
  if (!p) {
    toast('내담자 분석 정보를 찾을 수 없습니다.');
    return undefined;
  }
  const reportModule = window.REPORT_MODULES?.get(type);
  if (!reportModule?.generate) {
    toast('리포트 생성 기능을 찾을 수 없습니다.');
    return undefined;
  }
  return reportModule.generate(p, priority);
}

function currentReportHtml() {
  return state.currentReport?.html ? stripReportBrandLogo(state.currentReport.html) : emptyReport();
}

function syncCurrentReportHtml() {
  const el = document.getElementById('reportContent');
  if (state.currentReport && el) state.currentReport.html = el.innerHTML;
}

function toggleEdit() {
  if (!state.currentReport) {
    toast('편집할 리포트가 없습니다.');
    return;
  }
  syncCurrentReportHtml();
  state.editMode = !state.editMode;
  render();
  setTimeout(() => {
    const el = document.getElementById('reportContent');
    if (el && state.editMode) el.focus();
  }, 0);
}

function printReport() {
  if (!state.currentReport) {
    toast('출력할 리포트가 없습니다.');
    return;
  }
  syncCurrentReportHtml();
  window.print();
}
