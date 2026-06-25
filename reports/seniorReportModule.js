(function () {
  window.REPORT_MODULES.register('senior', {
    renderForm(p, common) {
      return common + `<div class="field"><label>주요 경력 *</label><textarea id="seniorCareer">${escapeHtml(p.career||'')}</textarea></div><div class="field"><label>보유 역량/자격증 선택</label><textarea id="seniorAssets" placeholder="예: 영업관리, 조직관리, 엑셀, 지게차운전기능사"></textarea></div><div class="field"><label>희망 방향 선택</label><select id="seniorDirection"><option>재취업</option><option>전직</option><option>창업</option><option>강의/컨설팅</option><option>사회공헌</option></select></div><div class="field"><label>특별 요청사항 선택</label><textarea id="seniorReq" placeholder="예: 현실적인 재취업 직무 중심으로"></textarea></div><button class="btn full" onclick="generateReport('senior')">리포트 생성</button>`;
    },
    validate() {
      return val('seniorCareer') ? true : '주요 경력을 입력해주세요.';
    },
    async generate(p) {
      const career = val('seniorCareer');
      if (!career) {
        toast('주요 경력을 입력해주세요.');
        return;
      }
      const title = `${p.name} 신중년 경력자산 리포트`;
      const html = seniorReport(p, career, val('seniorAssets'), val('seniorDirection'), val('seniorReq'));
      finishGeneratedReport('senior', p, title, html);
    }
  });

function seniorReport(p,career,assets,direction,req){return `<h1>${escapeHtml(p.name)} 신중년 경력자산 리포트</h1>${baseIntro(p)}<h2>1. 경력 요약</h2><div class="summary-box"><p>${escapeHtml(career).replaceAll('\n','<br>')}</p><p><strong>보유 역량/자격증:</strong> ${escapeHtml(assets||'미입력')}</p><p><strong>희망 방향:</strong> ${escapeHtml(direction)}</p>${req?`<p><strong>특별 요청:</strong> ${escapeHtml(req)}</p>`:''}</div><h2>2. 핵심 경력자산</h2><ul><li>오랜 실무 경험에서 축적된 상황 판단력</li><li>고객, 협력사, 내부 조직과의 관계 관리 경험</li><li>업무 프로세스와 현장 흐름을 이해하는 능력</li><li>예외 상황과 갈등을 처리해 본 문제해결 경험</li></ul><h2>3. 강점 분석</h2><p>신중년 구직자의 강점은 단순 근속기간이 아니라, 반복된 실무 경험을 통해 형성된 안정성, 책임감, 현장 이해도, 관계 조율 능력입니다.</p><h2>4. 전환 가능 직무</h2><ul><li>기존 산업 경험을 활용한 동종업계 실무/관리 직무</li><li>고객응대, 영업관리, 현장관리, 운영지원 직무</li><li>공공·민간 일자리 사업의 상담보조, 행정지원, 모니터링 직무</li><li>경험을 콘텐츠화할 수 있는 강의, 멘토링, 컨설팅 보조 영역</li></ul><h2>5. 추천 진로 방향</h2><p>${escapeHtml(direction)} 방향으로 준비할 경우, 기존 경력을 현재 채용시장에서 이해되는 직무 언어로 바꾸는 과정이 가장 중요합니다.</p><h2>6. 보완 필요 역량</h2><ul><li>기본 문서작성: 한글, 엑셀, 이메일, 보고서 정리</li><li>디지털 업무도구: 채용사이트, 고용24, 온라인 지원, 화상면접</li><li>직무 최신성: 최근 산업 용어, 채용공고 표현, 자격 요건 이해</li></ul><h2>7. 4주 실행 로드맵</h2><ul><li><strong>1주차:</strong> 경력 정리, 희망 직무 3개 선정, 기존 이력서 점검</li><li><strong>2주차:</strong> 채용공고 10개 분석, 반복 키워드 정리, 보완 교육 탐색</li><li><strong>3주차:</strong> 직무별 자기소개 문장 작성, 면접 예상질문 연습</li><li><strong>4주차:</strong> 실제 지원, 상담사 피드백 반영, 지원 결과 관리</li></ul><h2>8. 참여자 전달용 메시지</h2><p>지금까지의 경력은 단순히 과거 이력이 아니라, 다음 일자리를 찾기 위한 중요한 자산입니다. 다만 시장에서 바로 이해될 수 있도록 직책 중심이 아니라 역할, 성과, 문제 해결 경험 중심으로 다시 정리하는 과정이 필요합니다.</p><h2>9. 상담사 코멘트</h2><p>상담사는 참여자의 건강상태, 근무 가능 조건, 희망 수준, 실제 채용시장 상황을 함께 고려하여 최종 추천 직무와 실행계획을 조정합니다.</p>`}
})();
