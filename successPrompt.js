const SUCCESS_ANALYSIS_SCHEMA = {
  preparationAnalysis: {
    summary: '',
    preparationPeriod: '',
    keyPreparationSteps: []
  },
  certificateInfo: {
    requiredCertificates: [],
    helpfulCertificates: [],
    preparationResources: []
  },
  counselingActionMemo: {
    counselorMemo: '',
    nextActions: [],
    riskChecks: []
  }
};

const SUCCESS_PROMPTS = {
  system() {
    return `너는 고용서비스 현장에서 10년 이상 근무한 직업상담사이자 AI 취업성공사례 분석가다. 선택된 취업성공사례와 내담자 정보를 바탕으로 상담사가 바로 활용할 수 있는 준비 내용, 준비기간, 자격증/준비 정보, 상담 실행 메모를 분석한다. 사례 데이터에 없는 사실은 만들지 말고, 근거가 부족한 경우 "추가 확인 필요"라고 표현한다. HTML, markdown, 코드블록, 설명문 없이 지정된 JSON Schema 형식의 JSON만 반환한다.`;
  },

  user(input) {
    return `아래 취업성공사례 검색 결과와 내담자 정보를 기반으로 AI 상담 보조 분석 JSON을 생성하라.

[분석 범위]
1. preparationAnalysis
- 준비 내용 및 준비기간을 분석한다.
- 준비기간이 사례에 명시되지 않으면 준비 항목의 단계와 상담 확인 과제로 정리한다.
- keyPreparationSteps는 실행 순서가 보이도록 3~6개로 작성한다.

2. certificateInfo
- requiredCertificates는 사례와 직무상 필수 가능성이 높은 자격만 작성한다.
- helpfulCertificates는 있으면 유리한 자격, 교육, 훈련을 작성한다.
- preparationResources는 공공 고용서비스, 훈련, 자격 준비, 현장 경험 등 실행 가능한 준비 정보로 작성한다.

3. counselingActionMemo
- counselorMemo는 상담사가 바로 말하거나 기록할 수 있는 문장으로 작성한다.
- nextActions는 다음 상담 전까지 실행할 과제를 3~5개로 작성한다.
- riskChecks는 자격 요건, 시간/비용, 건강, 통근, 디지털 역량, 경력 공백 등 확인할 위험요인을 3~5개로 작성한다.

[작성 원칙]
- 선택된 사례 데이터와 상담사 메모를 우선 근거로 사용한다.
- 내담자의 이전 경력과 성공사례의 전환 경로를 연결한다.
- 특정 자격증, 교육기관, 준비기간이 사례에 없으면 단정하지 않는다.
- 모든 문장은 한국어로 작성한다.
- JSON 외 텍스트는 출력하지 않는다.

[입력 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(SUCCESS_ANALYSIS_SCHEMA)}`;
  }
};

window.SUCCESS_ANALYSIS_SCHEMA = SUCCESS_ANALYSIS_SCHEMA;
window.SUCCESS_PROMPTS = SUCCESS_PROMPTS;
