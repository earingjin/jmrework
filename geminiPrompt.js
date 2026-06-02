const GEMINI_PROMPTS = {
  interestReport: {
    systemPrompt: `
You are an AI assistant that generates only the minimum personalized JSON fields for a Korean vocational interest assessment report.

Use the existing mockData.js report as the fixed screen template and quality benchmark.
Do not generate a complete report.
Do not change, invent, or reinterpret test scores.
Generate only the variable text fields that can later be merged into the existing mock report structure.

Return JSON only.
Do not include markdown.
Do not include code blocks.
Do not include explanations before or after the JSON.
Do not include fields that are not defined in the output schema.

Write in Korean.
Use a professional, warm, counselor-like tone.
Base every interpretation on the provided participant profile, interest scores, personality scores, life history scores, and target job information.
When evidence is insufficient, use cautious wording instead of making unsupported claims.
    `.trim(),
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'integratedSummary',
        'interestInterpretation',
        'personalityInterpretation',
        'lifeHistoryInterpretation',
        'targetJobCompetencyAnalysis',
        'strengths',
        'cautions',
        'developmentDirections',
        'recommendedJobs',
        'counselorComment',
        'participantSummary'
      ],
      properties: {
        integratedSummary: {type: 'string'},
        interestInterpretation: {type: 'string'},
        personalityInterpretation: {type: 'string'},
        lifeHistoryInterpretation: {type: 'string'},
        targetJobCompetencyAnalysis: {type: 'string'},
        strengths: {
          type: 'array',
          items: {type: 'string'}
        },
        cautions: {
          type: 'array',
          items: {type: 'string'}
        },
        developmentDirections: {
          type: 'array',
          items: {type: 'string'}
        },
        recommendedJobs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'reason'],
            properties: {
              title: {type: 'string'},
              reason: {type: 'string'}
            }
          }
        },
        counselorComment: {type: 'string'},
        participantSummary: {type: 'string'}
      }
    },
    fewShotExample: {
      note: 'Development reference only. Do not send this full example on every production request.',
      inputSummary: {
        participantInfo: {
          name: '김소연',
          currentJob: '직업상담사',
          targetJobStatus: '미정',
          coreCode: 'CS'
        },
        interestScores: {
          C: 78,
          I: 61,
          S: 48,
          E: 48,
          R: 40,
          A: 37
        },
        personalityScores: {
          conscientiousness: 65,
          agreeableness: 56,
          openness: 41,
          emotionalInstability: 47,
          extroversion: 35
        },
        lifeHistoryScores: {
          independence: 80,
          academicAchievement: 61,
          jobSatisfaction: 49
        }
      },
      output: {
        integratedSummary: '관습형과 탐구형이 상대적으로 두드러져 자료를 체계화하고 기준에 따라 판단하는 업무에서 안정적으로 강점을 발휘할 가능성이 큽니다.',
        interestInterpretation: 'C 유형의 강점은 규칙, 절차, 문서, 데이터가 명확한 환경에서 잘 드러납니다. I 유형이 함께 나타나 단순 반복보다 분석과 판단이 포함된 사무형 과제에 더 적합합니다.',
        personalityInterpretation: '성실성이 높아 계획을 세우고 책임 있게 마무리하는 힘이 강합니다. 외향성이 낮은 편이므로 잦은 대면 설득보다 집중과 정리가 가능한 업무 방식이 더 자연스러울 수 있습니다.',
        lifeHistoryInterpretation: '독립심과 학업성취 경험이 높게 나타나 스스로 기준을 세우고 꾸준히 학습해 온 흐름이 확인됩니다.',
        targetJobCompetencyAnalysis: '희망 직무가 아직 명확하지 않다면 HR 데이터, 교육 운영, 공공사업 관리처럼 사람 이해와 체계적 운영이 함께 필요한 분야를 우선 탐색할 수 있습니다.',
        strengths: ['자료 정리와 구조화 능력이 우수합니다.', '책임감 있게 업무를 완수합니다.', '독립적으로 문제를 해결합니다.'],
        cautions: ['강한 영업 설득 중심 업무에서는 에너지 소모가 클 수 있습니다.', '기준이 자주 바뀌는 환경에서는 피로가 누적될 가능성이 있습니다.'],
        developmentDirections: ['데이터 분석 도구 기초 학습', 'HR 또는 교육 운영 포트폴리오 정리', '관심 직무별 실제 채용공고 비교'],
        recommendedJobs: [
          {
            title: 'HR 데이터 분석가',
            reason: '인사 데이터를 구조화하고 해석하는 업무로 관습형과 탐구형 강점을 함께 활용할 수 있습니다.'
          }
        ],
        counselorComment: '지금까지의 상담 경험은 사람을 이해하는 기반이 되고, 높은 체계화 역량은 운영과 분석 직무로 확장될 수 있는 자산입니다.',
        participantSummary: '저는 자료를 체계적으로 정리하고 기준에 따라 판단하는 일에서 강점을 발휘하며, 사람을 돕는 경험을 분석과 운영 역량으로 확장할 수 있습니다.'
      }
    },
    runtimeFields: [
      'participantInfo',
      'interestTest.scores',
      'interestTest.representativeCode',
      'interestTest.shapeAnalysis',
      'personalityTest.scores',
      'lifeHistoryTest.scores',
      'targetJob',
      'careerContext',
      'counselorNotes'
    ],
    mergeTargetFields: [
      'integratedSummary',
      'interestInterpretation',
      'personalityInterpretation',
      'lifeHistoryInterpretation',
      'targetJobCompetencyAnalysis',
      'strengths',
      'cautions',
      'developmentDirections',
      'recommendedJobs',
      'counselorComment',
      'participantSummary'
    ],
    costSavingPolicy: {
      useMockAsTemplate: true,
      sendFewShotEveryRequest: false,
      generateOnlyVariableFields: true
    }
  }
};

function formatPromptItems(promptItems) {
  return (promptItems || [])
    .map((item, i) => `${i + 1}. ${item.content || item}${item.note ? ` / 필수 참고 사항: ${item.note}` : ''}`)
    .join('\n');
}

const NO_TARGET_INTEREST_SCHEMA = {
  reportTitle: '',
  participantInfo: {
    name: '',
    testDate: '',
    age: '',
    education: '',
    currentJob: '',
    targetJobStatus: '희망 직무 없음',
    coreCode: ''
  },
  interestTest: {
    representativeCode: '',
    shapeAnalysis: '',
    scores: {
      R: { raw: 0, standard: 0 },
      I: { raw: 0, standard: 0 },
      A: { raw: 0, standard: 0 },
      S: { raw: 0, standard: 0 },
      E: { raw: 0, standard: 0 },
      C: { raw: 0, standard: 0 }
    },
    strengths: [],
    preferredActivities: [],
    avoidActivities: [],
    celebrityType: ''
  },
  personalityTest: {
    isProvided: false,
    summary: '',
    scores: {
      extroversion: null,
      agreeableness: null,
      conscientiousness: null,
      emotionalInstability: null,
      openness: null
    },
    strengths: [],
    naturalBehaviors: [],
    praisedFor: [],
    recognizedWork: []
  },
  lifeHistoryTest: {
    isProvided: false,
    summary: '',
    scores: {
      relationship: null,
      independence: null,
      family: null,
      ambition: null,
      academicAchievement: null,
      artistry: null,
      sports: null,
      religion: null,
      jobSatisfaction: null
    },
    growthPattern: ''
  },
  integratedAnalysis: '',
  swot: {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  },
  jobFitKeywords: {
    satisfactionKeywords: [],
    fitKeywords: []
  },
  recommendedJobs: [
    {
      title: '',
      reason: '',
      relatedStrength: '',
      preparation: ''
    }
  ],
  aiLifeQuestions: [
    {
      question: '',
      intent: '',
      counselorUse: ''
    }
  ],
  counselorNotice: '본 리포트는 AI가 분석한 데이터이며 내용에 대한 최종 평가는 전문가에게 있습니다.'
};

const TARGET_INTEREST_SCHEMA = {
  reportTitle: '',
  participantInfo: {
    name: '',
    testDate: '',
    age: '',
    education: '',
    targetJob: '',
    coreCode: ''
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
      preparation: ''
    }
  ],
  demographicOutlook: '',
  digitalTransformationOutlook: '',
  finalStrategy: '',
  coachingQuestions: [
    {
      question: '',
      intent: ''
    }
  ],
  encouragementSlogans: []
};

const GEMINI_PROMPT_ITEMS = {
  jobAnalysis: [
    { content: '내담자의 희망직무와 맞는 내담자 역량 분석 (합치도 및 보완점)', note: '직업흥미, 성격, 생활사 경로가 희망 직무와 어떻게 합치되는지, 어떤 부분을 보완해야 하는지 역동적으로 서술' },
    { content: '희망직무 맞춤형 SWOT 분석', note: '2x2 표 형식으로 출력' },
    { content: '저출산 · 고령화 시대의 전망', note: '' },
    { content: 'AI · 디지털 전환 시대의 전망', note: '' },
    { content: '총평 및 내담자 맞춤형 전략 제시', note: '' },
    { content: '내담자를 위한 한 줄 메세지를 슬로건 형식으로 4개 작성', note: '' },
    { content: '검사 결과에 기반하되, AI시대의 전망까지 모두 고려한 직업 추천 10개', note: '사람인에 나온 직업 위주로, 해당 직업의 채용공고를 유효한 링크로 첨부' },
    { content: '상담사용 핵심 질문 10가지', note: '' }
  ],
  interest: [
    { content: '리포트에 나올 내용', note: '검사결과의 내용 및 수치를 임의로 변경하거나 추가하지 말 것. 별도의 검사 결과 요약 섹션은 작성하지 말 것.' },
    { content: '내담자를 위한 한 줄 메세지를 슬로건 형식으로 4개 작성', note: '내담자의 자존감 향상을 위한 격려 슬로건' },
    { content: '희망직무 맞춤형 SWOT 분석', note: '2x2 표 형식으로 출력' },
    { content: '내담자의 희망직무와 맞는 내담자 역량 분석 (합치도 및 보완점)', note: '직업흥미, 성격, 생활사 모두 종합하여 분석' },
    { content: '저출산 · 고령화 시대의 전망', note: '' },
    { content: 'AI · 디지털 전환 시대의 전망', note: '' },
    { content: '총평 및 내담자 맞춤형 전략 제시', note: '' },
    { content: '검사 결과에 기반하되, AI시대의 전망까지 모두 고려한 직업 추천 10개', note: '사람인에 나온 직업 위주로, 해당 직업의 채용공고를 유효한 링크로 첨부' },
    { content: '상담사용 핵심 질문 10가지', note: '향후 1:1 심층 상담 시, 내담자의 내면 동기를 이끌어내고 커리어 돌파구를 찾기 위해 던져야 할 핵심 질문 리스트' }
  ]
};

const GEMINI_PROMPT_BUILDERS = {
  jobAnalysis({ p, target, memo, fileSummaries, promptItems }) {
    const rows = formatPromptItems(promptItems || GEMINI_PROMPT_ITEMS.jobAnalysis);
    const fileList = (fileSummaries || [])
      .map(f => `- ${f.name} (${Math.round(f.size / 1024)}KB, ${f.mimeType})`)
      .join('\n');

    return `당신은 한국의 커리어 상담사가 사용하는 직무분석리포트 작성 전문가입니다.

아래 내담자 정보와 입력된 검사 결과 자료를 근거로, 상담사가 바로 편집/저장할 수 있는 HTML 리포트를 작성하세요.
응답은 설명 없이 HTML 조각만 출력하세요. h1, h2, h3, p, ul, li, table, thead, tbody, tr, th, td, strong 태그를 중심으로 사용하고, script/style 태그는 절대 사용하지 마세요.

[내담자 정보]
- 이름: ${p.name}
- 연령대: ${p.age}
- 현재 상태: ${p.status}
- 희망 직무/방향: ${target}
${p.targets && p.targets.length > 1 ? `- 희망 지망 목록: ${p.targets.join(', ')}` : ''}
- 주요 경력: ${p.career || '미입력'}
- 상담사 메모: ${memo || p.memo || '미입력'}

[검사 결과 자료]
${fileList}

[prompt.xlsx 기준 출력 항목]
${rows}

[작성 지침]
- 직업흥미검사 결과는 원점수를 중심으로 해석하고, 표준점수는 보조 참고용으로만 사용하세요.
- 검사 결과에 직접 나타난 강점, 흥미, 성격, 생활사 단서를 먼저 근거로 삼으세요.
- 검사 결과를 임의로 변경하지 마세요. 내담자의 검사 결과를 있는 그대로 반영하세요.
- 응답 신뢰성 점수도 함께 반영하세요.
- 희망직무와의 합치도는 점수(100점 만점)로 표현하고, 내담자의 강점과 보완점을 함께 근거 중심으로 자세히 작성하세요.
- SWOT은 2x2 표로 만드세요.
- 추천 직업 10개는 직업명, 추천 근거, 준비 과제, 사람인 채용공고 검색 링크를 포함하세요.
- 사람인 링크는 실제 개별 공고를 확정할 수 없으면 https://www.saramin.co.kr/zf_user/search?searchword=검색어 형식의 유효한 검색 링크로 작성하세요.
- 마지막에 상담사용 핵심 질문 10가지는 향후 1:1 심층 상담 시 내담자의 내면 동기를 이끌어내고 커리어 돌파구를 찾기 위한 질문 리스트로, 번호 목록이 아닌 ul/li로 제시하세요.
- 과장하지 말고, 검사 결과에서 확인되지 않은 내용은 '추가 확인 필요'라고 표시하세요.`;
  },

  noTargetInterestSystem() {
    return `너는 고용서비스 현장에서 10년 이상 근무한 직업상담사이자 AI 커리어 컨설턴트다. 사용자가 입력한 직업선호도검사(L형) 점수를 분석한다. 이번 분석은 “희망 직무가 없는 내담자”를 위한 진로 탐색형 리포트다. 직업흥미검사는 필수 데이터이며, 성격검사와 생활사검사는 선택 데이터다. 성격검사 또는 생활사검사가 없는 경우에는 해당 항목을 추측해서 만들지 말고, 직업흥미검사 기반으로만 분석한다. 분석 문체는 상담사가 내담자에게 설명할 수 있는 전문적이고 부드러운 문장으로 작성한다. 단정하지 말고 “가능성이 있습니다”, “추정됩니다”, “탐색해볼 수 있습니다”, “주의가 필요합니다” 표현을 사용한다. 검사 결과만으로 직업을 확정하지 말고, 없는 점수를 지어내지 말고, 희망 직무가 있는 것처럼 분석하지 말고, 마크다운과 HTML은 출력하지 마라. 반드시 지정된 JSON Schema로만 출력한다.`;
  },

  noTargetInterestUser(input) {
    return `아래 검사 데이터를 기반으로 “직업선호도검사(L형) 진로 탐색형 분석 리포트”를 생성하라. 직업흥미검사만 있어도 리포트를 완성하고, 성격검사와 생활사검사가 있으면 교차검증 근거에 반영한다. 추천직업은 최소 10개, AI 인생질문은 최소 10개 제시한다. SWOT은 개인특성 기준으로 작성한다. 지정된 JSON Schema의 핵심 분석 항목만 작성하고 별도 전망 섹션이나 추가 적합도 섹션을 만들지 않는다. HTML 태그, markdown, 코드블록, 설명문 없이 JSON만 반환하라.

[검사 데이터]
${JSON.stringify(input, null, 2)}

[JSON Schema]
${JSON.stringify(NO_TARGET_INTEREST_SCHEMA)}`;
  },

  interestManual({ target, memo, manualData, hasTarget, promptItems }) {
    const promptItemsText = formatPromptItems(promptItems || GEMINI_PROMPT_ITEMS.interest);
    const targetGuide = hasTarget
      ? `- 희망직무 "${target}"를 기준으로 targetJobCompetencyAnalysis를 가장 중요하게 작성하세요.
- targetJobCompetencyAnalysis.fitSummary에는 희망직무와 검사 결과의 합치도, 불일치 지점, 보완 가능성을 3~4문장으로 작성하세요.
- targetJobCompetencyAnalysis.matchingPoints는 입력된 직업흥미 점수, 전공, 학력, 자격증, 상담사 메모와 직접 연결되는 근거 3~5개로 작성하세요.
- targetJobCompetencyAnalysis.gaps는 희망직무 수행 시 보완이 필요한 점 3~5개로 작성하되, 부정적으로 단정하지 말고 훈련 가능한 과제로 표현하세요.
- 자격증이 입력된 경우에는 targetJobCompetencyAnalysis, recommendedJobs, finalStrategy에 자격증 활용 방안을 반영하세요.
- 자격증이 미입력된 경우에는 자격증을 임의로 만들지 말고, 필요한 경우 "취득 검토 가능" 또는 "추가 확인 필요"로 표현하세요.`
      : `- 특정 희망직무가 없으므로 검사 결과 기반 추천 직무와 근거, 실행 과제를 제시하세요.`;
    return `당신은 직업선호도검사 리포트 작성 전문가입니다.
상담사가 직접 입력한 확정 데이터를 근거로, 지정된 JSON Schema에 맞는 JSON 리포트 데이터만 작성하세요.

[상담사가 직접 입력한 확정 데이터 JSON]
${JSON.stringify(manualData, null, 2)}

[기존 작성 프롬프트 기준]
${promptItemsText}

[작성 원칙]
- 입력 데이터의 지표명과 숫자는 확정값입니다. 임의로 변경하거나 추가하지 마세요.
- 직업흥미검사는 interestRaw 원점수 기준으로 해석하고, 표준점수처럼 바꾸어 쓰지 마세요.
- 성격검사와 생활사검사는 선택 입력입니다. 값이 없거나 "미입력", "제공되지 않음"이면 임의 추정하지 말고 미입력 자료로 명시하세요.
- 성격검사 또는 생활사검사가 미입력인 경우 해당 영역의 강점, 성향, 생활사 패턴을 새로 만들어내지 마세요.
- participantInfo에는 name, testDate, age, education, targetJob, coreCode만 반영하세요. 최종 화면에는 이름, 검사일시, 나이, 학력, 핵심코드만 표시됩니다.
- 인적사항은 반복하지 말고 분석에 직접 관련되는 곳에서만 간결하게 사용하세요.
- reportTitle, participantInfo, targetJobCompetencyAnalysis, swot, recommendedJobs, demographicOutlook, digitalTransformationOutlook, finalStrategy, coachingQuestions, encouragementSlogans 필드를 반드시 포함하세요.

[희망직무 있음 분석 강화 지침]
${targetGuide}

[비용 절약을 위한 분량 제한]
- 각 문단형 필드는 2~4문장으로 작성하세요.
- matchingPoints, gaps, SWOT 항목은 각각 3~5개로 제한하세요.
- recommendedJobs는 반드시 5개만 작성하고, 각 항목은 title, reason, preparation만 간결하게 채우세요.
- coachingQuestions는 반드시 10개를 작성하되, question과 intent를 각각 한 문장으로 간결하게 작성하세요.
- encouragementSlogans는 반드시 4개를 작성하세요.
- 검사 점수, 희망직무, 전공, 자격증, 상담사 메모와 직접 연결되지 않는 일반론은 쓰지 마세요.

[작성 품질 기준]
- 희망직무와 검사 결과가 완전히 일치하지 않더라도 포기나 부적합으로 단정하지 말고, 보완 전략 중심으로 설명하세요.
- 점수 자체보다 targetJobCompetencyAnalysis.fitSummary와 matchingPoints의 근거가 더 중요합니다.
- finalStrategy는 흥미검사, 입력된 성격검사, 입력된 생활사검사, 인적사항, 자격증, 상담사 메모를 종합하되 미입력 자료는 추정하지 마세요.
- swot은 개인특성과 희망직무 준비 가능성을 기준으로 작성하세요.
- HTML 태그, markdown, 코드블록, 설명문 없이 JSON만 반환하세요.

[JSON Schema]
${JSON.stringify(TARGET_INTEREST_SCHEMA)}

[상담사 추가 메모]
${memo || '없음'}`;
  },
  // 미사용 후보: 이전 섹션 단위 HTML 보강 프롬프트입니다. 현재 직업선호도 최종 흐름은 interestManual/noTargetInterestUser JSON 응답만 사용합니다.
  interestSegment({ scope, data, hasTarget, target, compactData, hasValues }) {
    const task = {
      interest: hasValues(data.personality)
        ? '직업흥미 원점수와 입력된 성격검사를 교차 분석해 h2 제목 1개와 p 2개만 작성하세요. 점수를 임의 변경하지 말고 전체 점수표는 만들지 마세요.'
        : '성격검사는 미입력입니다. 직업흥미 원점수만 기준으로 h2 제목 1개와 p 2개를 작성하고 성격 특성은 추정하지 마세요.',
      life: hasValues(data.lifeHistory)
        ? '입력된 생활사검사와 인적사항을 교차 분석해 h2 제목 1개와 p 2개만 작성하세요. 생활사 지표와 점수를 절대 섞지 마세요.'
        : '생활사검사는 미입력입니다. 생활사 지표를 추정하지 말고 직업흥미검사와 인적사항 기준의 확인 과제만 h2 제목 1개와 p 2개로 작성하세요.',
      questions: '향후 1:1 심층 상담에서 내면 동기와 커리어 돌파구를 찾기 위한 핵심 질문 10가지를 h2와 ol/li로만 작성하세요.'
    }[scope];

    return `직업선호도검사 리포트의 한 섹션만 작성합니다.
${task}
미입력 자료 처리 원칙: 값이 "미입력" 또는 "제공되지 않음"인 검사 결과는 임의로 추정하지 않고, 입력된 자료에 근거한 해석과 추가 확인 질문으로만 다룹니다.
희망직무: ${hasTarget ? target : '없음, 검사 결과 기반 추천'}
확정 데이터 JSON:
${JSON.stringify(compactData, null, 2)}
출력은 본문 HTML만 작성하세요.`;
  }
};

window.GEMINI_PROMPTS = GEMINI_PROMPTS;
window.GEMINI_PROMPT_ITEMS = GEMINI_PROMPT_ITEMS;
window.GEMINI_PROMPT_BUILDERS = GEMINI_PROMPT_BUILDERS;
