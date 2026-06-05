(() => {
const TARGET_INTEREST_SCHEMA = {
  reportTitle: '',
  participantInfo: {
    name: '',
    age: '',
    education: '',
    targetJob: '',
    coreCode: '',
    strengthSummary: ''
  },
  integratedAnalysis: '',
  targetJobCompetencyAnalysis: {
    fitSummary: '',
    matchingPoints: [],
    gaps: []
  },
  swot: {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  },
  recommendedJobs: [
    {
      title: '',
      reason: '',
      relatedStrength: '',
      preparation: ''
    }
  ],
  demographicOutlook: '',
  digitalTransformationOutlook: '',
  finalStrategy: '',
  encouragementSlogans: [],
  coachingQuestions: [''],
  counselorNotice: '본 리포트는 AI가 분석한 데이터이며 내용에 대한 최종 평가는 전문가에게 있습니다.'
};

const GEMINI_TARGET_INTEREST_PROMPT = {
  schema: TARGET_INTEREST_SCHEMA,
  system() {
    return `너는 고용서비스 현장에서 10년 이상 근무한 직업상담사이자 AI 커리어 컨설턴트다. 사용자가 직접 입력한 직업선호도검사(L형) 점수를 바탕으로 희망직무가 있는 내담자의 리포트 JSON을 작성한다. 입력되지 않은 항목은 절대 추측하지 말고, 모든 해석은 입력된 점수와 인적사항, 상담사 메모에 근거한다. 검사 결과만으로 합격/불합격이나 직업 적합을 단정하지 말고 가능성, 확인 과제, 준비 방향으로 표현한다. HTML, markdown, 코드블록 없이 JSON만 반환한다.`;
  },
  user(input) {
    return `아래 확정 데이터를 기반으로 희망직무 있음 전용 compact JSON을 생성하세요.
Gemini는 변하는 상담 문장과 분석 내용만 작성하고, 표 구조/제목/순서/디자인/고정 문구는 index.html이 렌더링합니다.

[출력 필드]
- reportTitle
- participantInfo.name
- participantInfo.age
- participantInfo.education
- participantInfo.targetJob
- participantInfo.coreCode
- participantInfo.strengthSummary
- integratedAnalysis
- targetJobCompetencyAnalysis.fitSummary
- targetJobCompetencyAnalysis.matchingPoints
- targetJobCompetencyAnalysis.gaps
- swot.strengths
- swot.weaknesses
- swot.opportunities
- swot.threats
- recommendedJobs
- demographicOutlook
- digitalTransformationOutlook
- finalStrategy
- encouragementSlogans
- coachingQuestions

[작성 기준]
- 위 출력 필드 외의 필드는 절대 만들지 마세요.
- 희망직무 있음 리포트입니다. 희망직무와 검사 결과의 합치도, 보완 가능성, 실행 과제를 중심으로 작성하세요.
- participantInfo에는 name, age, education, targetJob, coreCode, strengthSummary만 채우세요.
- coreCode는 직업흥미검사의 핵심 코드 2개를 작성하세요. 예시: RS
- participantInfo.strengthSummary는 직업흥미 핵심 코드와 희망직무의 연결 강점을 은유적이되 과장 없이 요약하세요. 25~45자 정도의 한 줄 명사형 문장으로 작성하세요. 예시: "분석적 통찰력을 바탕으로 조직이나 프로젝트를 주도하는 해결사"
- 직업흥미검사 원점수는 필수 근거입니다. 다만 점수 반복 나열을 피하고, 전체 리포트에서 꼭 필요한 곳에만 점수명과 점수를 직접 언급하세요.
- 성격검사와 생활사검사는 입력된 경우에만 반영하고, 미입력인 경우 추측하여 언급하지 마세요.
- targetJobCompetencyAnalysis.fitSummary는 희망직무와 검사 결과의 합치도, 불일치 지점, 보완 가능성을 2~3문장씩 약 3문단으로 작성하세요.
- targetJobCompetencyAnalysis.matchingPoints는 입력된 직업흥미 점수, 전공, 학력, 자격증, 상담사 메모와 직접 연결되는 근거를 정확히 3개 작성하세요.
- targetJobCompetencyAnalysis.gaps는 희망직무 수행 시 보완이 필요한 점을 정확히 3개 작성하되, 부정적으로 단정하지 말고 훈련 가능한 과제로 표현하세요.
- integratedAnalysis는 2~3문장씩 약 2문단으로 작성하세요. 직업흥미, 성격검사, 생활사 맥락, 상담사 메모를 희망직무 기준으로 교차 분석하여 시사점을 도출하되, 성격검사 또는 생활사검사가 미입력인 경우 그 항목은 미입력 사실만 간단히 반영하세요.
- SWOT은 strengths, weaknesses, opportunities, threats 각각 정확히 2개를 작성하세요. 각 항목은 1문장으로 제한하세요.
- 추천직업은 정확히 5개입니다. 희망직무, 직업흥미 원점수, 입력된 성격검사/생활사검사, 학력, 전공, 자격증을 함께 고려하세요. 학력 또는 전공 또는 자격증 미입력 시 "추가 확인 필요"로 처리하세요.
- recommendedJobs의 각 항목은 title, reason, relatedStrength, preparation을 모두 채우세요. reason에는 추천 근거, relatedStrength에는 관련 강점, preparation에는 준비 과제를 각각 1문장으로 자세히 작성하세요.
- demographicOutlook, digitalTransformationOutlook, finalStrategy는 각각 2~3문장으로 작성하고, 일반론이 아니라 입력된 검사 점수와 희망직무, 학력, 자격증, 상담사 메모 중 실제 입력된 항목에 근거해 작성하세요.
- coachingQuestions는 정확히 10개의 문자열 배열로 작성하세요. 객체가 아니라 상담사가 바로 물을 수 있는 자연스러운 1문장 질문만 넣으세요.
- encouragementSlogans는 정확히 4개 작성하세요. 내담자의 자존감 향상을 위한 격려 메시지이며 내담자의 강점 위주로 작성하세요.
- 모든 문장은 자연스러운 한국어 상담 문체로 작성하고, 과장된 확신 및 단정적인 표현 대신 가능성 중심으로 표현하세요.
- HTML 태그, markdown, 코드블록, 설명문 없이 JSON 객체만 반환하세요. 첫 글자는 {, 마지막 글자는 } 여야 합니다.

[확정 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(TARGET_INTEREST_SCHEMA)}`;
  }
};

window.TARGET_INTEREST_SCHEMA = TARGET_INTEREST_SCHEMA;
window.GEMINI_TARGET_INTEREST_PROMPT = GEMINI_TARGET_INTEREST_PROMPT;
})();
