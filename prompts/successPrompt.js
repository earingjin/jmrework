const SUCCESS_ANALYSIS_SCHEMA = {
  preparationAnalysis: {
    summary: '',
    rows: [
      {
        item: '',
        caseCheck: '',
        typicalPreparation: '',
        preparationMethod: '',
        typicalPeriod: '',
        counselingUse: ''
      }
    ]
  },
  certificatePreparationInfo: {
    summary: '',
    rows: [
      {
        name: '',
        purpose: '',
        method: '',
        typicalPeriod: '',
        outlook: '',
        note: ''
      }
    ]
  },
  counselingComments: [],
  counselingQuestions: []
};

const SUCCESS_PROMPTS = {
  system() {
    return `당신은 취업 성공사례를 교차 분석하는 직업상담 지원 AI입니다.
선택된 SUCCESS_CASE_DB 사례, 참여자 정보, 상담사 메모를 우선 근거로 사용하세요.
사례집에 준비기간, 자격증, 준비정보가 없으면 검색 및 일반 직무 지식을 활용해 통상적인 정보를 제안하되, 단정하지 말고 확인이 필요함을 명시하세요.
HTML, markdown, 코드블록 없이 지정된 JSON 구조만 반환하세요.`;
  },

  user(input) {
    return `아래 데이터를 바탕으로 취업 성공사례 상담 리포트에 들어갈 내용 데이터를 JSON으로 작성하세요.

[분석 범위]
1. preparationAnalysis
- 선택 사례에서 확인되는 준비 내용을 교차 분석하세요.
- 사례집에 준비기간이 명시되지 않으면 검색 및 일반 직무 지식을 바탕으로 통상적인 준비 내용과 기간을 제안하세요.
- 모든 내용을 서술식이 아닌 개조식으로 작성하되, 각 사례에서 공통적으로 확인되는 내용과 차이점이 드러나도록 작성하세요.
- caseCheck에는 CASE-0050 같은 사례 ID 대신 해당 사례의 현재직업명을 사용하세요.
- typicalPreparation에는 무엇을 준비해야 하는지, 즉 준비의 범위와 주제를 작성하세요.
- preparationMethod에는 그 준비를 어떻게 실행할지, 즉 구체적인 행동 방법을 작성하세요.

2. certificatePreparationInfo
- 사례집에 자격증이 명시되지 않아도 검색 및 일반 직무 지식을 바탕으로 통상적인 자격증, 교육, 준비 방법과 기간을 제안하세요.
- 모든 내용을 서술식이 아닌 개조식으로 작성하되, 각 자격증이나 준비 항목마다 목적과 방법, 기간, 전망, 주의사항이 드러나도록 작성하세요.
- 필수 자격과 도움이 되는 준비를 구분할 수 있도록 목적과 확인 사항을 작성하세요.

3. counselingComments
- 선택된 성공사례들을 교차 분석하여 참여자의 이전 경력과 연결되는 상담 활용 코멘트를 작성하세요.

4. counselingQuestions
- 선택된 성공사례, 참여자 정보, 상담사가 작성한 연결 시사점(counselorInsight)을 교차 분석하여 상담 중 내담자에게 바로 물어볼 질문을 5개 작성하세요.
- counselorInsight가 작성되어 있으면 그 내용에서 확인하거나 구체화해야 할 부분을 질문에 반드시 반영하세요.
- 각 질문은 현재 참여자의 경력, 희망 방향, 준비 여건과 선택 사례의 구체적인 연결점을 확인할 수 있어야 합니다.
- 미리 정해진 일반 질문이나 상담사를 향한 질문이 아니라, 상담사가 내담자에게 자연스럽게 말할 수 있는 존댓말 의문문으로 작성하세요.
- 질문마다 한 가지 주제만 묻고, 답을 유도하거나 성공 가능성을 단정하지 마세요.

[작성 원칙]
- 검색 또는 일반 직무 지식으로 보완한 정보에는 "일반적으로", "통상", "확인 필요" 표현을 사용하세요.
- 급여, 기간, 자격요건을 확정적으로 단정하지 마세요.
- 모든 문장은 한국어로 작성하세요.
- JSON 외 텍스트는 출력하지 마세요.

[입력 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(SUCCESS_ANALYSIS_SCHEMA, null, 2)}`;
  }
};

window.SUCCESS_ANALYSIS_SCHEMA = SUCCESS_ANALYSIS_SCHEMA;
window.SUCCESS_PROMPTS = SUCCESS_PROMPTS;
