(function () {
  window.REPORT_MODULES.register('interview', {
    renderForm(p, common) {
      return common + `<div class="field"><label>지원 희망 직무 *</label><input id="interviewJob" value="${escapeHtml(p.target||'')}" placeholder="예: 영업관리"></div><div class="grid-2"><div class="field"><label>면접 유형</label><select id="interviewType"><option>상황면접</option><option>경험면접</option><option>직무면접</option><option>임원면접</option></select></div><div class="field"><label>난이도</label><select id="interviewLevel"><option>쉬움</option><option selected>보통</option><option>어려움</option></select></div></div><div class="field"><label>예상 상황/선택사항</label><textarea id="interviewSituation" placeholder="예: 고객 불만, 팀 갈등, 일정 지연, 성과 압박 상황"></textarea></div><div class="field"><label>특별 요청사항 선택</label><textarea id="interviewReq" placeholder="예: STAR 방식으로, 1분 답변 포함"></textarea></div><button class="btn full" onclick="generateReport('interview')">답변 가이드 생성</button>`;
    },
    async generate(p) {
      const job = val('interviewJob');
      if (!job) {
        toast('지원 희망 직무를 입력해주세요.');
        return;
      }
      const title = `${job} ${val('interviewType')} 답변 가이드`;
      const html = interviewReport(p, job, val('interviewType'), val('interviewLevel'), val('interviewSituation') || '직무 수행 중 문제 상황', val('interviewReq'));
      finishGeneratedReport('interview', p, title, html);
    }
  });

function interviewReport(p,job,type,level,situation,req){return `<h1>${escapeHtml(job)} ${escapeHtml(type)} 답변 가이드</h1>${baseIntro(p)}<h2>1. 시뮬레이션 조건</h2><div class="summary-box"><p><strong>지원 직무:</strong> ${escapeHtml(job)}</p><p><strong>면접 유형:</strong> ${escapeHtml(type)}</p><p><strong>난이도:</strong> ${escapeHtml(level)}</p><p><strong>상황:</strong> ${escapeHtml(situation)}</p>${req?`<p><strong>특별 요청:</strong> ${escapeHtml(req)}</p>`:''}</div><h2>2. 예상 질문</h2><ul><li>${escapeHtml(situation)}이 발생했을 때 어떤 순서로 문제를 해결하시겠습니까?</li><li>이 상황에서 가장 먼저 확인해야 할 정보는 무엇입니까?</li><li>이해관계자 간 의견이 다를 때 어떻게 조율하시겠습니까?</li><li>비슷한 경험이 있다면 본인의 역할과 결과를 설명해 주세요.</li></ul><h2>3. 질문 의도</h2><p>면접관은 지원자가 문제 상황을 구조적으로 파악하는지, 우선순위를 판단하는지, 협업과 실행을 통해 결과를 만드는지 확인하려고 합니다.</p><h2>4. 답변 구조</h2><div class="summary-box"><p><strong>S 상황:</strong> 어떤 문제가 있었는지 간단히 설명합니다.</p><p><strong>T 과제:</strong> 본인이 해결해야 했던 역할과 목표를 말합니다.</p><p><strong>A 행동:</strong> 확인한 정보, 조율 방식, 실행한 행동을 구체적으로 말합니다.</p><p><strong>R 결과:</strong> 수치, 변화, 배운 점으로 마무리합니다.</p></div><h2>5. STAR 방식 모범 답변 예시</h2><p>“저는 먼저 상황을 감정적으로 판단하기보다 원인과 영향을 구분해 확인하겠습니다. ${escapeHtml(job)} 직무에서는 일정, 고객, 내부 협업 부서에 미치는 영향을 빠르게 파악하는 것이 중요하다고 생각합니다. 이후 관련자에게 현재 상황을 공유하고 우선순위에 따라 단기 조치와 재발 방지 방안을 나누어 실행하겠습니다.”</p><h2>6. 피해야 할 답변</h2><ul><li>상사에게 바로 보고하겠다는 말만 하고 본인의 판단이 보이지 않는 답변</li><li>열심히 하겠다는 추상적 표현</li><li>특정 사람의 잘못으로만 설명하는 답변</li></ul><h2>7. 추가 꼬리질문</h2><ul><li>그 판단이 틀렸다면 어떻게 수정하시겠습니까?</li><li>성과가 좋지 않았던 경험도 있습니까?</li><li>상사와 의견이 다를 때는 어떻게 설득하시겠습니까?</li></ul><h2>8. 1분 답변 버전</h2><p>“저는 문제 상황이 생기면 원인, 영향, 우선순위를 먼저 나누어 확인합니다. 이후 관련자에게 상황을 공유하고 단기 조치와 재발 방지 방안을 구분해 실행합니다. 특히 ${escapeHtml(job)} 직무에서는 정확한 정보 공유와 협업 조율이 중요하다고 생각합니다.”</p><h2>9. 상담사 코멘트</h2><p>참여자의 실제 경험을 한 가지 선택해 위 구조에 맞게 재작성하면 면접 답변의 설득력이 높아집니다.</p>`}
})();
