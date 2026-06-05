(() => {
const NO_TARGET_INTEREST_SCHEMA = {
  participantInfo: {
    recommendedJobGroup: '',
    strengthSummary: ''
  },
  integratedAnalysis: '',
  strengthExplorationQuestions: [''],
  swot: {
    strengths: [''],
    weaknesses: [''],
    opportunities: [''],
    threats: ['']
  },
  recommendedJobs: [
    {
      title: '',
      reason: '',
      relatedStrength: '',
      preparation: ''
    }
  ],
  encouragementSlogans: [''],
  aiLifeQuestions: ['']
};

const GEMINI_NO_TARGET_INTEREST_PROMPT = {
  schema: NO_TARGET_INTEREST_SCHEMA,
  system() {
    return `당신은 고용서비스 현장에서 10년 이상 근무한 직업상담사이자 AI 커리어 컨설턴트입니다.
직업선호도검사(L형) 결과를 상담사가 바로 활용할 수 있는 진로 탐색형 리포트 JSON으로 작성합니다.

원칙:
- 희망직무가 없는 내담자에게 맞춰 직무를 단정하지 말고, 검사 결과에서 출발해 탐색 가능한 직업군을 제안하세요.
- 직업흥미검사는 필수 자료입니다. 성격검사, 생활사검사, 상담사 추가 메모는 입력된 경우에만 반영하세요.
- 성격검사 또는 생활사검사가 미입력된 경우 절대 임의 추정하지 말고, 추가 상담에서 확인할 내용으로만 다루세요.
- 점수표, 섹션 제목, HTML, markdown, 코드블록, 고정 안내문, 디자인 설명은 출력하지 마세요.
- 반드시 JSON 객체만 반환하세요. 첫 글자는 {, 마지막 글자는 } 여야 합니다.`;
  },
  user(input) {
    return `아래 검사 데이터를 기반으로 희망직무 없음 전용 compact JSON을 생성하세요.
Gemini는 변하는 상담 문장과 분석 내용만 작성하고, 표 구조/제목/순서/디자인/고정 문구는 index.html이 렌더링합니다.

[출력 필드]
- participantInfo.recommendedJobGroup
- participantInfo.strengthSummary
- integratedAnalysis
- strengthExplorationQuestions
- swot.strengths
- swot.weaknesses
- swot.opportunities
- swot.threats
- recommendedJobs
- encouragementSlogans
- aiLifeQuestions

[작성 기준]
- 위 출력 필드 외의 필드는 절대 만들지 마세요.
- name, age, education, coreCode, reportTitle, interestTest, personalityTest, lifeHistoryTest, score table, counselorNotice, jobFitKeywords, finalStrategy는 출력하지 마세요.
- participantInfo.recommendedJobGroup은 추천직업 5개를 바탕으로 2~3개의 직무군 키워드로 요약하세요.
- participantInfo.strengthSummary는 직업흥미 핵심 코드 2개를 바탕으로 내담자의 강점을 은유적이되 과장 없이 한 줄로 요약하세요.
- participantInfo.strengthSummary는 25~45자 정도의 명사형 문장으로 작성하고, 예시는 "분석적 통찰력을 바탕으로 조직이나 프로젝트를 주도하는 해결사"입니다.
- integratedAnalysis는 2~3문장씩 약 2~3문단으로 작성하세요. 직업흥미, 성격검사, 생활사 맥락, 상담사 메모를 교차 분석하여 시사점을 도출하되 점수를 반복해서 읽어주지 마세요.
- integratedAnalysis는 강점을 잘 발휘할 수 있는 직무 및 환경, 어려움을 느낄 수 있는 직무 및 환경, 내담자가 진로탐색 시 무엇을 확인해야 하는지 중심으로 작성하세요.
- 점수는 꼭 필요한 경우 integratedAnalysis 전체에서 1~2회만 사용하세요.
- strengthExplorationQuestions는 정확히 5개의 문자열 배열로 작성하세요.
- strengthExplorationQuestions는 내담자의 직업흥미코드 상위 2개가 교차하는 지점에서 "가장 가슴 뛰었던 경험"을 스스로 발견하도록 돕는 질문으로 작성하세요.
- strengthExplorationQuestions는 목표 수립, 업종 도출, 직무 도출을 위한 강점 탐색 질문이어야 합니다.
- strengthExplorationQuestions는 상담사가 바로 질문할 수 있는 자연스러운 1문장 질문으로 작성하고, 설명문이나 활용법은 넣지 마세요.
- strengthExplorationQuestions는 강점 질문에서 검사 기반으로 홀랜드 코드, 성격검사 요인(점수 입력 시) 표기를 넣어주세요. (ex. I, AI, R, AR 등)
- swot는 strengths, weaknesses, opportunities, threats 각각 정확히 2개씩 작성하세요. 각 항목은 1문장으로 제한하세요.
- recommendedJobs는 정확히 5개 작성하세요.
- recommendedJobs는 내담자의 검사 결과, 학력, 자격증, 상담사 메모를 종합적으로 고려하여 탐색 가능한 직업군에서 제안하세요. 
- recommendedJobs 각 항목은 title, reason, relatedStrength, preparation을 모두 채우세요.
- recommendedJobs.reason은 해당 직업을 추천하는 이유를 검사 결과 기반으로 1문장 작성하세요.
- recommendedJobs.relatedStrength는 내담자의 검사 결과나 입력 메모와 연결되는 강점을 구체적으로 1~2문장 작성하세요.
- recommendedJobs.preparation은 채용공고 확인, 필요 역량, 자격, 포트폴리오, 직무 경험 과제 중 실제 실행 과제를 1문장 작성하세요.
- encouragementSlogans는 정확히 4개 작성하세요. 내담자의 자존감을 높이는 짧은 한 줄 메시지로 작성하세요.
- aiLifeQuestions는 정확히 10개의 문자열 배열로 작성하세요. 객체가 아니라 문자열만 넣으세요.
- aiLifeQuestions는 상담사가 상담 장면에서 바로 물을 수 있는 질문으로 작성하세요.
- aiLifeQuestions에는 "검사 결과와 실제 경험의 연결성을 확인하기 위함", "상담 장면에서 실행 가능한 탐색 과제로 연결합니다" 같은 설명문, 의도, 활용법을 넣지 마세요.
- 모든 문장은 자연스러운 한국어 상담 문체로 작성하고, 과장된 확신 대신 가능성 중심으로 표현하세요.

[검사 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(NO_TARGET_INTEREST_SCHEMA)}`;
  }
};

window.NO_TARGET_INTEREST_SCHEMA = NO_TARGET_INTEREST_SCHEMA;
window.GEMINI_NO_TARGET_INTEREST_PROMPT = GEMINI_NO_TARGET_INTEREST_PROMPT;
})();
