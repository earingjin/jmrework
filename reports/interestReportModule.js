(function () {
function normalizeNoTargetIntegratedAnalysis(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      strengthDirection: String(value.strengthDirection || ''),
      cautionEnvironment: String(value.cautionEnvironment || ''),
      explorationCriteria: String(value.explorationCriteria || '')
    };
  }
  return String(value || '');
}
function normalizeNoTargetJobReportData(raw,input={}){const r=raw||{};const p=input.participant||input.personalInfo||{};const cleanArray=value=>Array.isArray(value)?value.filter(item=>item!==null&&item!==undefined):[];const textFrom=value=>typeof value==='string'?value:(value?.question||value?.text||value?.title||'');const scores=noTargetScoresFromInput(input);const top=sortedScoreEntries(input.interestRaw||{});const coreCode=top.slice(0,2).map(([key])=>({'현실형':'R','탐구형':'I','예술형':'A','사회형':'S','진취형':'E','관습형':'C'}[key]||key)).join('');const personality=r.personalityTest||{};const life=r.lifeHistoryTest||{};const normalized={reportTitle:r.reportTitle||'직업선호도검사(L형) 진로 탐색형 분석 리포트',participantInfo:{name:p.name||'',testDate:p.testDate||today(),age:p.age||'',education:p.education||'',currentJob:p.currentJob||'',targetJobStatus:'희망 직무 없음',coreCode:r.participantInfo?.coreCode||coreCode,recommendedJobGroup:r.participantInfo?.recommendedJobGroup||'',strengthSummary:r.participantInfo?.strengthSummary||''},interestTest:{representativeCode:coreCode,shapeAnalysis:r.interestTest?.shapeAnalysis||'',scores:{...scores,...(r.interestTest?.scores||{})},strengths:cleanArray(r.interestTest?.strengths),preferredActivities:cleanArray(r.interestTest?.preferredActivities),avoidActivities:cleanArray(r.interestTest?.avoidActivities),celebrityType:r.interestTest?.celebrityType||''},personalityTest:{...personality,isProvided:personality.isProvided!==undefined?!!personality.isProvided:!!personality.summary,scores:personality.scores||{}},lifeHistoryTest:{...life,isProvided:life.isProvided!==undefined?!!life.isProvided:!!life.summary,scores:life.scores||{}},integratedAnalysis:normalizeNoTargetIntegratedAnalysis(r.integratedAnalysis),swot:{strengths:cleanArray(r.swot?.strengths).map(textFrom).filter(Boolean),weaknesses:cleanArray(r.swot?.weaknesses).map(textFrom).filter(Boolean),opportunities:cleanArray(r.swot?.opportunities).map(textFrom).filter(Boolean),threats:cleanArray(r.swot?.threats).map(textFrom).filter(Boolean)},recommendedJobs:cleanArray(r.recommendedJobs),aiLifeQuestions:cleanArray(r.aiLifeQuestions),counselorNotice:r.counselorNotice||'본 리포트는 AI가 분석한 데이터이며 내용에 대한 최종 평가는 전문가에게 있습니다.'};normalized.recommendedJobs=normalized.recommendedJobs.map(job=>{const j=job&&typeof job==='object'?job:{title:String(job||'')};return{title:j.title||j.job||'',reason:j.reason||'',relatedStrength:j.relatedStrength||j.strength||'검사 결과 기반 강점과 연결',preparation:j.preparation||j.prep||'관련 채용공고 비교와 필요 역량 확인'}}).filter(job=>job.title);normalized.aiLifeQuestions=normalized.aiLifeQuestions.map(q=>typeof q==='string'?{question:q,intent:'',counselorUse:''}:{question:q?.question||q?.text||'',intent:q?.intent||'',counselorUse:q?.counselorUse||''}).filter(q=>q.question);return normalized}
function normalizeNoTargetJobReportDataAligned(raw,input={}){
  const normalized=normalizeNoTargetJobReportData(raw,input);
  normalized.participantInfo.coreCode=noTargetCoreCodeFromInput(input);
  normalized.interestTest.scores=noTargetScoresFromInput(input);
  normalized.interestTest.shapeAnalysis=raw?.interestSummary?.shapeAnalysis||'';
  normalized.interestTest.celebrityType=raw?.interestSummary?.counselorReferenceType||'';
  normalized.personalityTest={isProvided:hasInterestValues(input.personality),summary:raw?.personalitySummary||'',scores:noTargetPersonalityScoresFromInput(input.personality)};
  normalized.lifeHistoryTest={isProvided:hasInterestValues(input.lifeHistory),summary:raw?.lifeHistorySummary||'',scores:noTargetLifeScoresFromInput(input.lifeHistory)};
  normalized.recommendedJobs=safeRecommendedJobs(normalized.recommendedJobs);
  return normalized;
}
function normalizeTargetFinalStrategy(value) {
  const cleanArray = items => Array.isArray(items) ? items.map(item => String(item || '').trim()).filter(Boolean).slice(0, 2) : [];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      jobInfoExploration: cleanArray(value.jobInfoExploration),
      competencyPreparation: cleanArray(value.competencyPreparation),
      applicationReview: cleanArray(value.applicationReview)
    };
  }
  return String(value || '');
}
function normalizeTargetInterestReportData(raw,input,target){const r=raw||{};const p=input?.personalInfo||{};const cleanArray=value=>Array.isArray(value)?value.map(item=>String(item||'').trim()).filter(Boolean):[];const normalized={participantInfo:{name:p.name||'',age:p.age||'',education:p.education||'',targetJob:target||r.participantInfo?.targetJob||'',coreCode:r.participantInfo?.coreCode||interestCoreCodeFromData(input),strengthSummary:r.participantInfo?.strengthSummary||''},targetJobCompetencyAnalysis:{fitSummary:String(r.targetJobCompetencyAnalysis?.fitSummary||''),matchingPoints:cleanArray(r.targetJobCompetencyAnalysis?.matchingPoints).slice(0,3),gaps:cleanArray(r.targetJobCompetencyAnalysis?.gaps).slice(0,3)},swot:{strengths:cleanArray(r.swot?.strengths).slice(0,2),weaknesses:cleanArray(r.swot?.weaknesses).slice(0,2),opportunities:cleanArray(r.swot?.opportunities).slice(0,2),threats:cleanArray(r.swot?.threats).slice(0,2)},recommendedJobs:Array.isArray(r.recommendedJobs)?r.recommendedJobs:[],demographicOutlook:String(r.demographicOutlook||''),digitalTransformationOutlook:String(r.digitalTransformationOutlook||''),finalStrategy:normalizeTargetFinalStrategy(r.finalStrategy),coachingQuestions:cleanArray(r.coachingQuestions).slice(0,10)};normalized.recommendedJobs=normalized.recommendedJobs.slice(0,5).map(job=>({title:job.title||job.job||'',reason:job.reason||'',relatedStrength:job.relatedStrength||job.strength||'',preparation:job.preparation||job.prep||'관련 채용공고를 비교하고 필요한 역량을 확인합니다.'}));return normalized}
function renderPdfSwot(swot={}) {
  return `<table><tbody><tr><th>Strengths 강점</th><th>Weaknesses 보완점</th></tr><tr><td>${safeReportList(swot.strengths)}</td><td>${safeReportList(swot.weaknesses)}</td></tr><tr><th>Opportunities 기회</th><th>Threats 위협</th></tr><tr><td>${safeReportList(swot.opportunities)}</td><td>${safeReportList(swot.threats)}</td></tr></tbody></table>`;
}

function renderJobExampleInfoHint() {
  const message = '더 자세한 결과를 원하는 경우, 왼쪽 하단의 <참여자에게 연결할 시사점>에 더 많은 정보를 입력해 주세요.';
  return `<span style="position:relative;display:inline-flex;align-items:center;vertical-align:middle;"><button type="button" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:8px;border:1px solid #4a6fa5;border-radius:50%;background:#f5f9ff;color:#4a6fa5;font-size:13px;font-weight:700;cursor:pointer;vertical-align:middle;" onclick="toggleJobExampleInfoHint(this);" title="추가 안내" aria-label="추가 안내" aria-expanded="false">?</button><span hidden style="position:absolute;left:34px;top:50%;z-index:20;width:285px;max-width:min(285px,calc(100vw - 80px));transform:translateY(-50%);padding:10px 12px;border:1px solid #c9d8ea;border-radius:6px;background:#fff;color:#344054;box-shadow:0 10px 24px rgba(15,39,66,.16);font-size:12px;font-weight:600;line-height:1.55;text-align:left;white-space:normal;">${escapeHtml(message)}</span></span>`;
}

function toggleJobExampleInfoHint(button) {
  const note = button?.nextElementSibling;
  if (!note) return;
  note.hidden = !note.hidden;
  button.setAttribute('aria-expanded', String(!note.hidden));
}

function renderPdfJobTable(items) {
  const jobs = safeRecommendedJobs(items);
  const rows = jobs.length
    ? jobs.map((job, index) => {
      const title = safeReportText(job.title || job.job, '추천 직무는 추가 상담을 통해 보완 필요');
      const searchUrl = `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(title)}`;
      return `<tr><td><strong>${index + 1}. ${escapeHtml(title)}</strong></td><td>${escapeHtml(safeReportText(job.reason))}</td><td>${escapeHtml(safeReportText(job.relatedStrength, '추가 확인 필요'))}</td><td>${escapeHtml(safeReportText(job.preparation, '관련 채용공고를 비교하고 필요한 역량을 확인합니다.'))}</td><td><a href="${searchUrl}" target="_blank" rel="noopener">사람인 검색</a></td></tr>`;
    }).join('')
    : '<tr><td colspan="5">추천 직무는 추가 상담을 통해 보완 필요</td></tr>';
  return `<table><thead><tr><th>직업</th><th>추천 근거</th><th>관련 강점</th><th>준비 과제</th><th>채용공고</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderPdfQuestions(items, limit) {
  const questions = (Array.isArray(items) ? items : [])
    .slice(0, limit)
    .map(item => typeof item === 'string' ? item : item?.question || item?.text || '')
    .map(item => String(item || '').trim())
    .filter(Boolean);
  return questions.length
    ? `<ol class="question-list">${questions.map(question => `<li>${escapeHtml(question)}</li>`).join('')}</ol>`
    : safeReportParagraph('');
}

function renderPdfQuestionRange(items, start, limit) {
  return renderPdfQuestions((Array.isArray(items) ? items : []).slice(start, start + limit), limit);
}

function renderReportSubsection(title, body) {
  return `<div class="report-subsection"><h3>${escapeHtml(title)}</h3>${body}</div>`;
}

function renderQuestionSubsectionBox(title, description, body) {
  return renderReportSectionBox(
    `<div class="report-subsection question-subsection"><h3>${escapeHtml(title)}</h3><p class="question-subsection-description">${escapeHtml(description)}</p>${body}</div>`
  );
}

function renderReportSectionBox(content, extraClass = '') {
  return `<div class="report-section-box${extraClass ? ` ${escapeHtml(extraClass)}` : ''}">${content}</div>`;
}

function renderNoTargetIntegratedAnalysis(value) {
  if (typeof value === 'string') return renderReportSectionBox(safeReportParagraph(value));
  return renderReportSectionBox(
    renderReportSubsection('강점이 잘 발휘되는 방향', safeReportParagraph(value?.strengthDirection)) +
    renderReportSubsection('주의가 필요한 환경과 어려움', safeReportParagraph(value?.cautionEnvironment)) +
    renderReportSubsection('진로 탐색 시 확인할 기준', safeReportParagraph(value?.explorationCriteria))
  );
}

function renderActionStrategy(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const steps = [
      ['1단계: 직무 정보 탐색', value.jobInfoExploration],
      ['2단계: 역량 준비', value.competencyPreparation],
      ['3단계: 지원 실행 및 점검', value.applicationReview]
    ];
    const body = steps.map(([title, items]) => {
      const actions = Array.isArray(items) ? items.map(item => String(item || '').trim()).filter(Boolean).slice(0, 2) : [];
      return `<h4>${escapeHtml(title)}</h4>${actions.length ? `<ul>${actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}</ul>` : safeReportParagraph('')}`;
    }).join('');
    return `<div class="action-strategy">${body}</div>`;
  }
  const lines = String(value || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.length) return safeReportParagraph('');
  const parts = [];
  let listOpen = false;
  lines.forEach(line => {
    const isStep = /^\d+\s*단계\s*[:：]/.test(line);
    const normalized = line.replace(/^\-\s*/, '');
    if (isStep) {
      if (listOpen) parts.push('</ul>');
      parts.push(`<h4>${escapeHtml(normalized)}</h4><ul>`);
      listOpen = true;
      return;
    }
    if (!listOpen) {
      parts.push('<ul>');
      listOpen = true;
    }
    parts.push(`<li>${escapeHtml(normalized)}</li>`);
  });
  if (listOpen) parts.push('</ul>');
  return `<div class="action-strategy">${parts.join('')}</div>`;
}

function renderTargetFitSummary(value) {
  const sectionTitles = new Set(['전체 적합성', '전체 적합성 요약']);
  const lines = String(value || '')
    .split(/\n+/)
    .map(line => line.trim().replace(/^\d+\.\s*/, ''))
    .filter(Boolean);
  if (!lines.length) return safeReportParagraph('');
  const body = `<p>${escapeHtml(limitReportSentences(lines.filter(line => !sectionTitles.has(line)).join(' '), 3))}</p>`;
  return renderReportSubsection('직무 환경과의 적합성', `<div class="target-fit-summary">${body}</div>`);
}

function renderNoTargetJobReportSafe(r) {
  const pi = r.participantInfo || {};
  return `<div class="interest-report"><h1>${escapeHtml(pi.name || '내담자')} 직업선호도검사 리포트 (희망 직무 없음)</h1>
<p class="small">본 리포트는 AI가 분석한 데이터이며 내용에 대한 최종 평가는 전문가에게 있습니다.</p>
<h2>내담자 정보</h2>
<div class="summary-box"><p><strong>내담자:</strong> ${escapeHtml(pi.name || '내담자')}</p><p><strong>나이:</strong> ${escapeHtml(pi.age || '미입력')}</p><p><strong>학력:</strong> ${escapeHtml(pi.education || '미입력')}</p><p><strong>추천 직무군:</strong> ${escapeHtml(pi.recommendedJobGroup || '추천 직무는 추가 상담을 통해 보완 필요')}</p><p><strong>직업흥미검사 핵심 코드:</strong> ${escapeHtml(pi.coreCode || '미입력')}</p><p><strong>한 줄 강점 요약:</strong> ${escapeHtml(pi.strengthSummary || '추가 분석 필요')}</p></div>
<h2>직업흥미·성격·생활사·전공·자격증 통합 피드백</h2>
${renderNoTargetIntegratedAnalysis(r.integratedAnalysis)}
<h2>검사 결과 기반 SWOT 분석</h2>
${renderPdfSwot(r.swot)}
<div class="jobs-page"><h2>흥미의 속성과 유사한 직업분야 예시${renderJobExampleInfoHint()}</h2>${renderPdfJobTable(r.recommendedJobs)}</div>
<h2>상담사용 Tip. 결과 해석을 위한 질문</h2>
${renderQuestionSubsectionBox('경험·강점 연결 질문', '본 질문은 내담자의 실제 경험에서 반복되는 흥미, 강점, 일하는 방식, 주변의 인정 단서를 찾기 위한 질문입니다.', renderPdfQuestionRange(r.aiLifeQuestions, 0, 10))}
${renderQuestionSubsectionBox('구체적인 진로설계를 위한 질문', '본 질문은 흥미결과를 바탕으로 실제적인 직업확장, 직업조사를 위한 질문입니다.', renderPdfQuestionRange(r.aiLifeQuestions, 10, 5))}</div>`;
}

function renderTargetInterestReportFromData(r) {
  const pi = r.participantInfo || {};
  return `<div class="interest-report"><h1>${escapeHtml(pi.name || '내담자')} 직업선호도검사 리포트 (${escapeHtml(pi.targetJob || '희망 직무')})</h1>
<p class="small">본 리포트는 AI가 분석한 데이터이며 내용에 대한 최종 평가는 전문가에게 있습니다.</p>
<h2>내담자 정보</h2>
<div class="summary-box"><p><strong>내담자:</strong> ${escapeHtml(pi.name || '내담자')}</p><p><strong>나이:</strong> ${escapeHtml(pi.age || '미입력')}</p><p><strong>학력:</strong> ${escapeHtml(pi.education || '미입력')}</p><p><strong>희망직무:</strong> ${escapeHtml(pi.targetJob || '미입력')}</p><p><strong>직업흥미검사 핵심 코드:</strong> ${escapeHtml(pi.coreCode || '미입력')}</p><p><strong>한 줄 강점 요약:</strong> ${escapeHtml(pi.strengthSummary || '추가 분석 필요')}</p></div>
<h2>희망직무·검사 결과·전공 및 자격증에 대한 종합 피드백</h2>
${renderReportSectionBox(
  renderTargetFitSummary(r.targetJobCompetencyAnalysis?.fitSummary) +
  renderReportSubsection('희망직무와 검사 결과의 일치점', safeReportParagraphFromItems(r.targetJobCompetencyAnalysis?.matchingPoints)) +
  renderReportSubsection('보완 및 확인 과제', safeReportParagraphFromItems(r.targetJobCompetencyAnalysis?.gaps))
)}
<h2>3단계 실행 전략</h2>
${renderReportSectionBox(renderActionStrategy(r.finalStrategy), 'report-section-box-strategy')}
<h2>검사 결과 기반 SWOT 분석</h2>
${renderPdfSwot(r.swot)}
<div class="jobs-page"><h2>흥미의 속성과 유사한 직업분야 예시${renderJobExampleInfoHint()}</h2>${renderPdfJobTable(r.recommendedJobs)}</div>
<h2>저출산·고령화 시대의 전망</h2>
${safeReportParagraph(r.demographicOutlook)}
<h2>AI·디지털 전환 시대의 전망</h2>
${safeReportParagraph(r.digitalTransformationOutlook)}
<h2>상담사용 Tip. 결과 해석을 위한 질문</h2>
${renderReportSectionBox(renderReportSubsection('경험·강점 연결 질문', renderPdfQuestionRange(r.coachingQuestions, 0, 3)))}
${renderReportSectionBox(renderReportSubsection('희망직무 연결 질문', renderPdfQuestionRange(r.coachingQuestions, 3, 2)))}
${renderReportSectionBox(renderReportSubsection('다음 회기 과제 질문', renderPdfQuestionRange(r.coachingQuestions, 5, 5)))}</div>`;
}

function interestFieldId(groupKey,label,suffix='score'){return `interest_${groupKey}_${label.replace(/\s+/g,'_')}_${suffix}`}
function interestNumberField(groupKey,label,suffix='score',placeholder='점수'){const id=interestFieldId(groupKey,label,suffix);return `<div class="field score-cell"><label>${escapeHtml(label)}</label><input id="${id}" type="number" inputmode="numeric" step="1" placeholder="${placeholder}"></div>`}
function interestGroupHtml(group){return `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><h3>${escapeHtml(group.title)}</h3></div><div class="panel-body"><div class="score-grid">${group.items.map(label=>interestNumberField(group.key,label)).join('')}</div></div></div>`}
function noTargetPercentRows(obj,labels){const values=labels.map(label=>Number(obj?.[label]??0));const max=Math.max(...values,1);return labels.map(label=>Math.round((Number(obj?.[label]??0)/max)*100))}
function noTargetScoreTable(headers,scores){const interestCodes={'현실형':'R','탐구형':'I','예술형':'A','사회형':'S','진취형':'E','관습형':'C'};const displayHeaders=headers.map(h=>interestCodes[h]||h);const percents=noTargetPercentRows(scores,headers);return `<table><thead><tr><th>주요코드</th>${displayHeaders.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody><tr><th>원점수</th>${headers.map(h=>`<td>${escapeHtml(scores?.[h]??'')}</td>`).join('')}</tr><tr><th>흥미(%)</th>${percents.map(v=>`<td>${v}%</td>`).join('')}</tr></tbody></table>`}
function noTargetAverageGroup(group){const values=Object.values(group||{}).map(Number).filter(Number.isFinite);if(!values.length)return null;return Math.round(values.reduce((a,b)=>a+b,0)/values.length)}
function noTargetPersonalitySummary(personality){if(!hasInterestValues(personality))return null;return{'외향성':noTargetAverageGroup(personality.extraversion),'호감성':noTargetAverageGroup(personality.agreeableness),'성실성':noTargetAverageGroup(personality.conscientiousness),'정서적 불안정성':noTargetAverageGroup(personality.emotionalInstability),'경험에 대한 개방성':noTargetAverageGroup(personality.openness)}}
function noTargetTopEntries(obj,n=3){return sortedScoreEntries(obj).slice(0,n)}
function noTargetCodeMap(){return{'현실형':{code:'R',activities:['도구, 장비, 현장을 다루는 활동','눈에 보이는 결과물을 만드는 활동'],fatigue:['추상적 논의만 길게 이어지는 환경'],fields:['시설관리','제조품질','기술지원','안전관리'],jobs:['설비관리 담당자','품질관리원','안전관리 보조','기술지원 담당자','물류운영 관리자']},'탐구형':{code:'I',activities:['자료를 분석하고 원인을 찾는 활동','새로운 지식을 깊게 파고드는 활동'],fatigue:['근거 없이 빠른 결론을 요구하는 환경'],fields:['데이터 분석','조사연구','품질개선','정책분석'],jobs:['데이터 분석가','시장조사 연구원','품질개선 담당자','정책자료 조사원','리서치 어시스턴트']},'예술형':{code:'A',activities:['아이디어를 시각화하거나 표현하는 활동','정해진 방식보다 새 방식을 만드는 활동'],fatigue:['반복 절차만 강하게 요구되는 환경'],fields:['콘텐츠','디자인','브랜딩','문화기획'],jobs:['콘텐츠 기획자','브랜드 마케터','UX 라이터','문화행사 기획자','교육콘텐츠 개발자']},'사회형':{code:'S',activities:['사람을 돕고 설명하는 활동','상대의 변화를 지원하는 활동'],fatigue:['사람과의 의미 있는 접점이 거의 없는 환경'],fields:['상담','교육','고객성공','복지서비스'],jobs:['직업상담사','교육운영 매니저','고객성공 매니저','사회복지 행정담당','전직지원 컨설턴트']},'진취형':{code:'E',activities:['목표를 세우고 사람을 설득하는 활동','성과를 만들기 위해 주도하는 활동'],fatigue:['권한 없이 지시만 수행하는 환경'],fields:['영업기획','사업개발','프로젝트 운영','조직관리'],jobs:['영업관리자','사업개발 매니저','프로젝트 코디네이터','창업지원 매니저','채용 컨설턴트']},'관습형':{code:'C',activities:['자료를 정리하고 기준에 맞게 관리하는 활동','정확성과 절차가 중요한 활동'],fatigue:['규칙이 계속 바뀌고 기준이 모호한 환경'],fields:['행정','회계','문서관리','운영관리'],jobs:['인사총무 담당자','교육행정 담당자','회계사무원','공공사업 운영담당','문서관리 전문가']}}}
function noTargetJobRecommendations(data){const map=noTargetCodeMap();const top=noTargetTopEntries(data.interestRaw,3).map(([k])=>k);const hasPersonality=hasInterestValues(data.personality);const hasLife=hasInterestValues(data.lifeHistory);const seen=new Set();const jobs=[];top.forEach(code=>{(map[code]?.jobs||[]).forEach(job=>{if(seen.has(job)||jobs.length>=10)return;seen.add(job);jobs.push({job,reason:`${code} 흥미가 상대적으로 높아 ${map[code].activities[0]}에 몰입할 가능성이 있습니다.${hasPersonality?' 입력된 성격검사 결과는 업무 방식 검토에 보조 반영합니다.':''}${hasLife?' 생활사검사 결과는 지속 가능성 판단에 함께 반영합니다.':''}`,strength:map[code].fields.slice(0,2).join(', '),prep:'관련 채용공고 3개 비교, 필요한 자격·도구 확인, 2주 단위 직무 체험 과제 설정'})})});return jobs.slice(0,10)}
function noTargetScoresFromInput(input){const codeMap={'현실형':'R','탐구형':'I','예술형':'A','사회형':'S','진취형':'E','관습형':'C',R:'R',I:'I',A:'A',S:'S',E:'E',C:'C'};const scores={R:{raw:'',standard:''},I:{raw:'',standard:''},A:{raw:'',standard:''},S:{raw:'',standard:''},E:{raw:'',standard:''},C:{raw:'',standard:''}};Object.entries(input?.interestRaw||{}).forEach(([key,value])=>{const code=codeMap[key];if(code)scores[code]={raw:value,standard:value}});return scores}
function collectNoTargetGeminiInputData(p){const data=collectInterestManualData(false,'',p?.name||createEphemeralClientName());return{participant:data.personalInfo,interestRaw:data.interestRaw,personality:data.personality,reliability:data.reliability,lifeHistory:data.lifeHistory,counselorMemo:data.counselorMemo,selectedParticipant:p}}
function buildNoTargetInterestGeminiRequest(input){return{modelName:getGeminiModel('interest'),request:({modelName})=>window.AI_GATEWAY.generateReportContent({model:modelName,reportType:'interest',variant:'noTarget',input,request:fetchGeminiWithRetry}),schema:interestJsonSchemaForRepair('noTarget'),context:'직업선호도검사 희망직무 없음'}}
function safeReportText(value,empty='추가 분석 필요'){return String(value||'').trim()||empty}
function safeReportParagraph(value,empty='추가 분석 필요'){return String(value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${escapeHtml(x)}</p>`).join('')||`<p>${escapeHtml(empty)}</p>`}
function safeReportList(items,empty='추가 분석 필요'){const values=Array.isArray(items)?items.map(item=>typeof item==='string'?item:item?.question||item?.text||'').map(item=>String(item||'').trim()).filter(Boolean):[];return values.length?`<ul>${values.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:`<p>${escapeHtml(empty)}</p>`}
function limitReportSentences(value,max=3){const text=String(value||'').replace(/\s+/g,' ').trim();if(!text)return'';const sentences=text.match(/[^.!?。！？\n]+[.!?。！？]?/g)||[text];return sentences.map(sentence=>sentence.trim()).filter(Boolean).slice(0,max).join(' ')}
function safeReportParagraphFromItems(items,empty='추가 분석 필요'){const values=Array.isArray(items)?items.map(item=>typeof item==='string'?item:item?.question||item?.text||'').map(item=>String(item||'').trim()).filter(Boolean):[];return values.length?`<p>${escapeHtml(limitReportSentences(values.join(' '),3))}</p>`:safeReportParagraph(items,empty)}
function safeReportSwotCell(items){const values=Array.isArray(items)?items.map(item=>String(item||'').trim()).filter(Boolean):[];return values.length?values.map(escapeHtml).join('<br>'):escapeHtml('추가 분석 필요')}
function safeRecommendedJobs(items,limit=5){return(Array.isArray(items)?items:[]).slice(0,limit).map(job=>job&&typeof job==='object'?job:{title:String(job||'')}).filter(job=>String(job.title||job.job||'').trim())}
function averageInputScore(group){return hasInterestValues(group)?noTargetAverageGroup(group):''}
function noTargetPersonalityScoresFromInput(personality){if(!hasInterestValues(personality))return{};return{extroversion:averageInputScore(personality.extraversion),agreeableness:averageInputScore(personality.agreeableness),conscientiousness:averageInputScore(personality.conscientiousness),emotionalInstability:averageInputScore(personality.emotionalInstability),openness:averageInputScore(personality.openness)}}
function noTargetLifeScoresFromInput(life){if(!hasInterestValues(life))return{};return{relationship:life['대인관계']??'',independence:life['독립심']??'',family:life['가족친화']??'',ambition:life['야망']??'',academicAchievement:life['학업성취']??'',artistry:life['예술성']??'',sports:life['운동선호']??'',religion:life['종교성']??'',jobSatisfaction:life['직무만족']??''}}
function noTargetCoreCodeFromInput(input){return interestCoreCodeFromData(input).split(' ')[0]||''}
function interestJsonSchemaForRepair(kind){const common={participantInfo:'object',swot:{strengths:'string[]',weaknesses:'string[]',opportunities:'string[]',threats:'string[]'},recommendedJobs:[{title:'string',reason:'string',relatedStrength:'string',preparation:'string'}]};return kind==='target'?{...common,targetJobCompetencyAnalysis:{fitSummary:'string',matchingPoints:'string[]',gaps:'string[]'},demographicOutlook:'string',digitalTransformationOutlook:'string',finalStrategy:{jobInfoExploration:'string[]',competencyPreparation:'string[]',applicationReview:'string[]'},coachingQuestions:'string[]'}:{...common,integratedAnalysis:{strengthDirection:'string',cautionEnvironment:'string',explorationCriteria:'string'},interestSummary:{shapeAnalysis:'string',counselorReferenceType:'string'},personalitySummary:'string',lifeHistorySummary:'string',aiLifeQuestions:[{question:'string',intent:'string',counselorUse:'string'}]}}
async function requestGeminiNoTargetJobReportData(input,options={}){const requestData=buildNoTargetInterestGeminiRequest(input);const result=await generateJsonWithRecovery({reportType:'interest',modelScope:'interest',...requestData,allowJsonRepair:options.allowJsonRepair!==false});return{...normalizeNoTargetJobReportDataAligned(result.json,input),tokenUsage:result.tokenUsage}}
async function generateNoTargetJobInterestReport(p){
  const btn=document.getElementById('interestButton');
  const oldText=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='리포트 생성 중...'}
  try{
    const noTargetInput=collectNoTargetGeminiInputData(p);
    const reportData=await requestGeminiNoTargetJobReportData(noTargetInput);
    const participantName=reportData.participantInfo?.name||p?.name||'내담자';
    return{title:`${participantName} 직업선호도검사 리포트 (희망 직무 없음)`,html:renderNoTargetJobReportSafe(reportData),participantName,tokenUsage:reportData.tokenUsage};
  }finally{if(btn){btn.disabled=false;btn.textContent=oldText||'직업선호도검사 리포트 생성'}}
}
function createEphemeralClientName(){return `내담자-${Math.random().toString(36).slice(2,6).toUpperCase()}`}
function getInterestClient(){const hasTarget=val('interestHasTarget')==='yes';const target=hasTarget?val('interestTarget'):'검사 결과 기반 추천 직무';return{id:'session_interest',name:createEphemeralClientName(),age:val('interestPersonAge')||'미입력',status:'검사결과 분석',docStatus:'직접 입력',target,hasTarget,career:'상담사 직접 입력 검사 결과 기반',memo:val('interestMemo'),createdAt:today()}}function toggleInterestTargetInput(){const wrap=document.getElementById('interestTargetWrap');const input=document.getElementById('interestTarget');const hasTarget=val('interestHasTarget')==='yes';if(wrap)wrap.style.display=hasTarget?'block':'none';if(input&&!hasTarget)input.value=''}
const INTEREST_MANUAL_GROUPS=[
  {key:'interestRaw',title:'1. 직업흥미검사 원점수',items:['현실형','탐구형','예술형','사회형','진취형','관습형']},
  {key:'extraversion',title:'2-1. 외향성',items:['온정성','사교성','리더십','적극성','긍정성']},
  {key:'agreeableness',title:'2-2. 호감성',items:['타인신뢰','도덕성','타인배려','수용성','겸손','휴머니즘']},
  {key:'conscientiousness',title:'2-3. 성실성',items:['유능감','조직화능력','책임감','목표지향성','자기통제','완벽성']},
  {key:'emotionalInstability',title:'2-4. 정서적 불안정성',items:['불안','분노','우울','자의식','충동성','스트레스 취약성']},
  {key:'openness',title:'2-5. 경험에 대한 개방성',items:['상상력','문화','정서','경험추구','지적호기심']},
  {key:'lifeHistory',title:'3. 생활사검사 원점수',items:['대인관계','독립심','가족친화','야망','학업성취','예술성','운동선호','종교성','직무만족']}
];
function interestCollapse(id,title,body,subtitle='',open=false){return `<div class="interest-accordion"><button type="button" class="interest-accordion-head" onclick="toggleInterestCollapse('${id}')"><span><h3>${escapeHtml(title)}</h3>${subtitle?`<span class="small">${escapeHtml(subtitle)}</span>`:''}</span><span id="${id}Icon" class="interest-toggle">${open?'▾':'▸'}</span></button><div id="${id}" class="interest-accordion-body" style="display:${open?'block':'none'}">${body}</div></div>`}
function toggleInterestCollapse(id){const body=document.getElementById(id);const icon=document.getElementById(id+'Icon');if(!body)return;const open=body.style.display==='none';body.style.display=open?'block':'none';if(icon)icon.textContent=open?'▾':'▸'}
function interestNumberFieldValue(groupKey,label,suffix='score',placeholder='점수',value=''){const id=interestFieldId(groupKey,label,suffix);return `<div class="field score-cell"><label>${escapeHtml(label)}</label><input id="${id}" type="number" inputmode="numeric" step="1" value="${escapeHtml(value)}" placeholder="${placeholder}"></div>`}
function interestScoreGroupHtml(group){return `<div class="interest-subgroup"><h4>${escapeHtml(group.title)}</h4><div class="score-grid">${group.items.map(label=>interestNumberField(group.key,label)).join('')}</div></div>`}
function interestReliabilityHtml(){return `<div class="interest-subgroup"><h4>2-6. 응답 신뢰성 점수</h4><div class="grid-2"><div class="score-grid">${interestNumberField('reliability','사회적 바람직성','score','점수')}${interestNumberFieldValue('reliability','사회적 바람직성','criterion','기준점수','65')}</div><div class="score-grid">${interestNumberField('reliability','부주의성','score','점수')}${interestNumberFieldValue('reliability','부주의성','criterion','기준점수','63')}</div></div></div>`}
function interestManualForm(p){
  p=p||getParticipant()||{};
  const personalBody=`<div class="notice">내담자 이름은 리포트 생성 시 임시 코드로 자동 생성되며 저장되지 않습니다.</div><div class="grid-2"><div class="field"><label>나이 *</label><input id="interestPersonAge" type="number" inputmode="numeric" value="${Number.parseInt(p.age)||''}" placeholder="예: 45"></div><div class="field"><label>학력 *</label><input id="interestEducation" placeholder="예: 대졸"></div></div><div class="grid-2"><div class="field"><label>전공</label><input id="interestMajor"></div><div class="field"><label>자격증</label><input id="interestCerts" placeholder="예: 직업상담사, 컴활"></div></div>`;
  const interestBody=`<div class="score-grid">${INTEREST_MANUAL_GROUPS[0].items.map(label=>interestNumberField(INTEREST_MANUAL_GROUPS[0].key,label)).join('')}</div>`;
  const personalityBody=`${INTEREST_MANUAL_GROUPS.slice(1,6).map(interestScoreGroupHtml).join('')}${interestReliabilityHtml()}`;
  const lifeBody=`<div class="score-grid">${INTEREST_MANUAL_GROUPS[6].items.map(label=>interestNumberField(INTEREST_MANUAL_GROUPS[6].key,label)).join('')}</div>`;
  const memoField=`<div class="field"><label>참여자에게 연결할 시사점*</label><div class="small">1. 참여자의 관심 분야, 이전 경력, 희망 근무 조건<br>2. 추천하지 않는 직업군 <br>(전공과 다른 분야를 희망하는 경우 등)<br>3. 자세하게 작성할수록 더 세분화된 직업 추천 가능</div><textarea id="interestMemo" placeholder=""></textarea></div>`;
  return `<div class="interest-ref"><div class="interest-ref-title">▣ 직업선호도검사 리포트</div><div class="interest-ref-body"><div class="job-api-box"><strong>AI 학습관련 윤리사항</strong><br>내담자의 동의 없이 검사 결과 PDF를 업로드하는 경우,  AI에게 개인정보를 학습시키게 됩니다.<br>개인정보가 학습될 경우 윤리적 문제에 노출됩니다.<br>본 리포트는 익명 및 데이터 수기입력을 원칙으로 합니다.</div>${interestCollapse('interestPersonalPanel','내담자 인적사항',personalBody,'나이, 학력은 필수입니다.',false)}${interestCollapse('interestRawPanel','직업흥미검사 결과 [필수]',interestBody,'원점수를 입력합니다.',false)}${memoField}${interestCollapse('interestPersonalityPanel','성격검사 결과 [선택]',personalityBody,'입력하지 않으면 미입력으로 분석에 전달됩니다.',false)}${interestCollapse('interestLifePanel','생활사검사 결과 [선택]',lifeBody,'입력하지 않으면 미입력으로 분석에 전달됩니다.',false)}<div class="field"><label>희망 직무 여부 *</label><select id="interestHasTarget" onchange="toggleInterestTargetInput()"><option value="no" selected>없음 - 검사 결과 기반 추천</option><option value="yes">있음 - 희망 직무 입력</option></select></div><div class="field" id="interestTargetWrap" style="display:none"><label>희망 직무 *</label><input id="interestTarget" placeholder="예: 직업상담사"></div><button id="interestButton" class="btn full" onclick="generateReport('interest')">직업선호도검사 분석 리포트 생성</button><a class="btn secondary full" href="https://gemini.google.com/gem/1SYTLnE8WGvwoS2BxAzIjWQS_StUA4an2?usp=sharing" target="_blank" rel="noopener">선택 1. 리포트로 잠재가능성 알아보기</a><a class="btn secondary full" href="https://gemini.google.com/gem/1R0nknJ0c5ofJu2UofX9TzqNl_3dBcYt4?usp=sharing" target="_blank" rel="noopener">선택 2. 리포트로 자기소개서 초안 작성하기</a></div></div>`;
}
function requiredInterestText(id,label){const text=val(id);if(!text)throw new Error(label+'을(를) 입력해주세요.');return text}
function optionalInterestText(id){return val(id)||''}
function requiredInterestNumber(id,label){const text=val(id);if(text==='')throw new Error(label+' 점수를 입력해주세요.');const num=Number(text);if(!Number.isFinite(num))throw new Error(label+'에는 숫자만 입력해주세요.');return num}
function collectInterestGroup(group){const out={};group.items.forEach(label=>{out[label]=requiredInterestNumber(interestFieldId(group.key,label),group.title+' - '+label)});return out}
function optionalInterestNumber(id,label){const text=val(id);if(text==='')return null;const num=Number(text);if(!Number.isFinite(num))throw new Error(label+'에는 숫자만 입력해주세요.');return num}
function collectOptionalInterestGroup(group){const out={};group.items.forEach(label=>{const num=optionalInterestNumber(interestFieldId(group.key,label),group.title+' - '+label);if(num!==null)out[label]=num});return out}
function hasInterestValues(obj){if(!obj||obj==='미입력'||obj==='제공되지 않음')return false;if(typeof obj!=='object')return false;return Object.values(obj).some(v=>typeof v==='object'?hasInterestValues(v):String(v??'').trim()!=='')}
function collectOptionalReliability(){const out={};['사회적 바람직성','부주의성'].forEach(label=>{const score=optionalInterestNumber(interestFieldId('reliability',label,'score'),label);if(score!==null){const criterion=optionalInterestNumber(interestFieldId('reliability',label,'criterion'),label+' 기준점수');out[label]={score,criterion:criterion===null?'제공되지 않음':criterion}}});return hasInterestValues(out)?out:'미입력'}
function collectInterestManualData(hasTarget,target,participantName=createEphemeralClientName()){const personalInfo={name:participantName,age:requiredInterestText('interestPersonAge','나이'),education:requiredInterestText('interestEducation','학력'),major:optionalInterestText('interestMajor'),certificates:optionalInterestText('interestCerts')};const counselorMemo=requiredInterestText('interestMemo','참여자에게 연결할 시사점');const personalityRaw={extraversion:collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[1]),agreeableness:collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[2]),conscientiousness:collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[3]),emotionalInstability:collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[4]),openness:collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[5])};const reliability=collectOptionalReliability();const personality=hasInterestValues(personalityRaw)||hasInterestValues(reliability)?personalityRaw:'미입력';const lifeRaw=collectOptionalInterestGroup(INTEREST_MANUAL_GROUPS[6]);return{inputMethod:'counselor_manual_numeric_input',target:hasTarget?target:'검사 결과 기반 추천 직무',hasTarget,personalInfo,interestRaw:collectInterestGroup(INTEREST_MANUAL_GROUPS[0]),personality,reliability,lifeHistory:hasInterestValues(lifeRaw)?lifeRaw:'미입력',counselorMemo,analysisGuard:'성격검사 또는 생활사검사가 미입력인 경우 해당 결과를 임의로 추정하지 말고 입력된 직업흥미검사와 제공된 자료만 근거로 해석할 것.'}}
function sortedScoreEntries(obj){return Object.entries(obj||{}).sort((a,b)=>Number(b[1])-Number(a[1]))}
function interestCoreCodeFromData(data){const codeMap={R:'R',I:'I',A:'A',S:'S',E:'E',C:'C','현실형':'R','탐구형':'I','예술형':'A','사회형':'S','진취형':'E','관습형':'C'};const labelMap={R:'현실형',I:'탐구형',A:'예술형',S:'사회형',E:'진취형',C:'관습형','현실형':'현실형','탐구형':'탐구형','예술형':'예술형','사회형':'사회형','진취형':'진취형','관습형':'관습형'};const entries=sortedScoreEntries(data?.interestRaw).filter(([,v])=>Number.isFinite(Number(v))).slice(0,2);if(!entries.length)return'';return `${entries.map(([k])=>codeMap[k]||k).join('')} (${entries.map(([k])=>labelMap[k]||k).join('/')})`}
function buildTargetInterestGeminiRequest(input){return{modelName:getGeminiModel('interest'),request:({modelName})=>window.AI_GATEWAY.generateReportContent({model:modelName,reportType:'interest',variant:'target',input,request:fetchGeminiWithRetry}),schema:interestJsonSchemaForRepair('target'),context:'직업선호도검사 희망직무 있음'}}
async function requestGeminiTargetInterestReportData(input,target,options={}){const requestData=buildTargetInterestGeminiRequest(input);const result=await generateJsonWithRecovery({reportType:'interest',modelScope:'interest',...requestData,allowJsonRepair:options.allowJsonRepair!==false});return{...normalizeTargetInterestReportData(result.json,input,target),tokenUsage:result.tokenUsage}}
async function generateGeminiInterestReport(p,target,hasTarget){if(!hasTarget)return generateNoTargetJobInterestReport(p);const manualData=collectInterestManualData(true,target,p?.name||createEphemeralClientName());const btn=document.getElementById('interestButton');const oldText=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='리포트 생성 중...'}try{const reportData=await requestGeminiTargetInterestReportData(manualData,target);return{title:`${reportData.participantInfo.name||manualData.personalInfo.name} 직업선호도검사 리포트 (${target})`,html:renderTargetInterestReportFromData(reportData),participantName:reportData.participantInfo.name||manualData.personalInfo.name,tokenUsage:reportData.tokenUsage}}finally{if(btn){btn.disabled=false;btn.textContent=oldText||'직업선호도검사 리포트 생성'}}}

  window.toggleInterestCollapse = toggleInterestCollapse;
  window.toggleInterestTargetInput = toggleInterestTargetInput;
  window.toggleJobExampleInfoHint = toggleJobExampleInfoHint;
  window.generateNoTargetJobInterestReport = generateNoTargetJobInterestReport;
  window.generateGeminiInterestReport = generateGeminiInterestReport;
  window.normalizeNoTargetJobReportData = normalizeNoTargetJobReportData;
  window.renderNoTargetJobReportSafe = renderNoTargetJobReportSafe;
  window.normalizeNoTargetJobReportDataAligned = normalizeNoTargetJobReportDataAligned;
  window.normalizeTargetInterestReportData = normalizeTargetInterestReportData;
  window.renderTargetInterestReportFromData = renderTargetInterestReportFromData;
  window.REPORT_MODULES.register('interest', {
    renderForm(p) {
      return interestManualForm(p);
    },
    validate() {
      const selectedHasTarget = val('interestHasTarget') === 'yes';
      const targetJob = val('interestTarget');
      if (selectedHasTarget && !targetJob) return '희망 직무를 입력해주세요.';
      try {
        collectInterestManualData(selectedHasTarget, targetJob);
        return true;
      } catch (err) {
        return err?.message || '필수 입력 항목을 확인해주세요.';
      }
    },
    async generate() {
      const selectedHasTarget = val('interestHasTarget') === 'yes';
      const targetJob = val('interestTarget');
      const hasTargetJob = selectedHasTarget && targetJob && targetJob.trim().length > 0;
      const target = hasTargetJob ? targetJob : '검사 결과 기반 추천 직무';
      const p = getInterestClient();
      let generated;
      try {
        generated = hasTargetJob
          ? await generateGeminiInterestReport(p, target, true)
          : await generateNoTargetJobInterestReport(p);
        const participantName = generated.participantName || p.name;
        const title = generated.title || `${participantName} 직업선호도검사 리포트 (${target})`;
        const html = withReportBrand(generated.html, title);
        state.currentReport = { id: null, type: 'interest', title, participantId: p.id, participantName, html, createdAt: today() };
      } catch (err) {
        throw err;
      }
      finishGeneratedReportUi();
      return { tokenUsage: generated.tokenUsage };
    }
  });
})();
