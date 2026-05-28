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
        'targetJobFit',
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
        targetJobFit: {type: 'string'},
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
        targetJobFit: '희망 직무가 아직 명확하지 않다면 HR 데이터, 교육 운영, 공공사업 관리처럼 사람 이해와 체계적 운영이 함께 필요한 분야를 우선 탐색할 수 있습니다.',
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
      'targetJobFit',
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

window.GEMINI_PROMPTS = GEMINI_PROMPTS;
