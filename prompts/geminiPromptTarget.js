(() => {
const TARGET_INTEREST_SCHEMA = {
  participantInfo: {
    name: '',
    age: '',
    education: '',
    targetJob: '',
    coreCode: '',
    strengthSummary: ''
  },
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
  coachingQuestions: ['']
};

const GEMINI_TARGET_INTEREST_PROMPT = {
  schema: TARGET_INTEREST_SCHEMA,
  system() {
    return `당신은 고용서비스 현장에서 10년 이상 근무한 직업상담사이자 AI 커리어 컨설턴트 입니다. 
사용자가 직접 입력한 직업선호도검사(L형) 점수를 바탕으로 희망직무가 있는 내담자의 리포트 JSON을 작성합니다. 

원칙:
- 직업흥미검사는 필수 자료입니다. 성격검사, 생활사검사, 전공, 자격증, 상담사 추가 메모는 입력된 경우에만 반영하세요.
- 직업흥미, 성격검사, 생활사 맥락, 학력, 전공, 자격증, 상담사 메모를 교차 분석하여 시사점을 도출하되, 입력되지 않은 항목은 절대 추측하지 마세요.
- 검사 결과만으로 합격/불합격이나 직업 적합을 단정하지 말고 가능성, 확인 과제, 준비 방향 위주로 표현하세요. 
- 점수표, 섹션 제목, HTML, markdown, 코드블록, 고정 안내문, 디자인 설명은 출력하지 마세요.
- 반드시 JSON 객체만 반환하세요. 첫 글자는 {, 마지막 글자는 } 여야 합니다.`;
  },
  user(input) {
    return `아래 확정 데이터를 기반으로 희망직무 있음 전용 compact JSON을 생성하세요.
Gemini는 변하는 상담 문장과 분석 내용만 작성하고, 표 구조/제목/순서/디자인/고정 문구는 index.html이 렌더링합니다.

[출력 필드]
- participantInfo.name
- participantInfo.age
- participantInfo.education
- participantInfo.targetJob
- participantInfo.coreCode
- participantInfo.strengthSummary
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
- coachingQuestions

[작성 기준]
- 위 출력 필드 외의 필드는 만들지 마세요.
- 희망직무 있음 리포트입니다. 희망직무와 검사 결과의 일치점, 보완 가능성, 실행 과제를 중심으로 작성하세요.
- participantInfo에는 name, age, education, targetJob, coreCode, strengthSummary만 채우세요.
- coreCode는 직업흥미검사의 핵심 코드 2개를 작성하세요. 예: RS, AI, SE 등
- participantInfo.strengthSummary는 직업흥미검사의 핵심 코드 2개를 바탕으로 내담자의 강점을 은유적이되 과장 없이 한 줄로 요약하세요.
- participantInfo.strengthSummary는 25~45자 정도의 명사형 문장으로 작성하고, 예시는 "분석적 통찰력을 바탕으로 조직이나 프로젝트를 주도하는 해결사"입니다.
- targetJobCompetencyAnalysis.fitSummary는 "희망직무·검사 결과·전공 및 자격증에 대한 종합 피드백"의 "전체 적합성" 하위 항목에 들어갈 내용입니다. 희망직무와 내담자 특성의 전체 방향성을 현실적으로 2~3문장으로 요약하세요.
- targetJobCompetencyAnalysis.fitSummary는 특히 희망 직무의 실제 근무환경, 업무 방식, 대인관계 요구, 반복/변화 정도, 책임 수준과 내담자의 성향이 잘 맞을지 구체적으로 작성하세요.
- targetJobCompetencyAnalysis.fitSummary는 무조건 긍정하지 말고, 잘 맞는 환경과 부담이 될 수 있는 환경을 함께 짚어 상담사가 현실적으로 판단할 수 있게 작성하세요.
- targetJobCompetencyAnalysis.fitSummary는 세부 근거, 보완 과제, 실행 행동을 쓰지 마세요. 해당 내용은 matchingPoints, gaps, finalStrategy에 나누어 작성합니다.
- targetJobCompetencyAnalysis.matchingPoints는 "희망직무와 검사 결과의 일치점" 하위 항목에 들어갈 내용입니다. 기존 주요 강점 맥락을 포함하여 입력된 직업흥미 점수, 학력, 자격증, 상담사 메모와 희망직무가 직접 연결되는 근거를 정확히 3개 작성하세요.
- targetJobCompetencyAnalysis.gaps는 "보완 및 확인 과제" 하위 항목에 들어갈 내용입니다. 기존 추가 확인이 필요한 맥락을 포함하여 희망직무 수행 전 확인하거나 보완해야 할 점을 정확히 3개 작성하되, 부정적 판정이 아니라 훈련 가능한 과제로 표현하세요.
- SWOT는 strengths, weaknesses, opportunities, threats 각각 정확히 2개씩 작성하세요. 각 항목은 1문장으로 제한하세요.
- recommendedJobs는 정확히 5개 작성하세요. 희망직무, 직업흥미 점수, 입력된 성격검사와 생활사, 학력, 전공, 자격증을 함께 고려하세요.
- recommendedJobs 각 항목은 title, reason, relatedStrength, preparation을 모두 채우세요. 
- reason은 추천 근거, relatedStrength는 관련 강점, preparation은 준비 과제 및 필요한 경우 구체적인 자격증 추천까지 각각 1문장으로 작성하세요.
- demographicOutlook는 희망직무와 관련된 인구통계학적 트렌드와 전망을 2~3문장으로 작성하세요.
- digitalTransformationOutlook, finalStrategy는 각각 2~3문장씩 2문단으로 작성하고, 일반론이 아니라 입력된 검사 결과와 희망직무를 연결하세요.
- finalStrategy는 독립된 큰 항목인 "3단계 실행 전략"에 들어갈 내용입니다. 내담자가 희망 직무 입직에 성공하기 위한 전략을 중심으로 작성하세요.
- finalStrategy는 1단계, 2단계, 3단계가 드러나도록 작성하고, 검사 결과에서 드러난 강점 활용, 보완 과제, 필요한 준비 행동, 채용공고 탐색 또는 직무 정보 확인, 단기 실행 순서를 포함하세요.
- finalStrategy는 막연한 격려나 총평보다 실제 입직 가능성을 높이는 현실적인 행동 중심의 상담용 전략 문장으로 작성하세요.
- finalStrategy는 상담사가 해야 할 일이 아니라 내담자가 직접 해야 할 일을 작성하세요. 희망 직무 취업에 성공하기 위한 내담자용 실행 로드맵이어야 합니다.
- finalStrategy의 각 단계는 "탐색 → 준비 → 지원/점검"처럼 취업 성공으로 이어지는 순서가 보이게 작성하세요.
- finalStrategy는 각 단계별로 개조식 2문장씩 작성하세요. 형식은 "1단계: ...\n- ...\n- ...\n2단계: ...\n- ...\n- ...\n3단계: ...\n- ...\n- ..."처럼 단계 제목과 실행 문장을 줄바꿈으로 구분하세요.
- finalStrategy의 각 실행 문장은 내담자가 실제로 할 수 있는 구체적 행동이어야 합니다. 예: 채용공고 3개 비교, 자격요건 표시, 부족 역량 1개 선정, 관련 교육 검색, 경험 사례 2개 정리, 다음 상담 전 확인 결과 기록.
- coachingQuestions는 정확히 10개의 문자열 배열로 작성하세요. 객체가 아니라 상담사가 바로 물을 수 있는 자연스러운 1문장 질문만 넣으세요.
- coachingQuestions 1~5번은 "경험·강점 연결 질문"으로 작성하세요. 내담자가 자신의 구체적인 경험 사례를 꺼내고, 그 경험이 희망 직무와 연결되는 강점인지 스스로 말할 수 있도록 돕는 질문이어야 합니다.
- coachingQuestions 1~5번은 검사 결과를 단정적으로 설명하지 말고, 내담자가 실제 경험 속에서 반복적으로 나타난 행동, 선택, 성취, 어려움 극복 방식을 떠올리게 하는 질문으로 작성하세요.
- coachingQuestions 6~10번은 "다음 회기 과제 질문"으로 작성하세요. 다음 회기 상담 전까지 내담자가 실제로 해볼 수 있는 구체적인 과제를 정하도록 돕는 질문이어야 합니다.
- coachingQuestions 6~10번은 채용공고 확인, 직무 정보 탐색, 필요한 역량 확인, 보완 과제 실행, 준비 결과 기록처럼 다음 상담에서 점검 가능한 행동으로 이어지도록 질문하세요.
- 모든 문장은 자연스러운 한국어 상담 문체로 작성하고, 과장된 확신보다 가능성 중심으로 표현하세요.
- HTML 태그, markdown, 코드블록, 설명문 없이 JSON 객체만 반환하세요.

[검사 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(TARGET_INTEREST_SCHEMA)}`;
  }
};

window.TARGET_INTEREST_SCHEMA = TARGET_INTEREST_SCHEMA;
window.GEMINI_TARGET_INTEREST_PROMPT = GEMINI_TARGET_INTEREST_PROMPT;
})();
