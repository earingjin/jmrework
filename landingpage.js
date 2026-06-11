const LANDING_CONTENT = {
  logo: {
    mark: '',
    text: 'RE:WORK CENTER'
  },
  nav: [
    { label: '직업선호도검사 결과 분석', href: '#company-report' },
    { label: '성공사례', href: '#success-report' },
    { label: '전문적인 상담', href: '#quality' }
  ],
  buttons: {
    login: '로그인',
    start: '서비스 시작하기',
    viewReport: '리포트 보기'
  },
  hero: {
    badge: 'RE:WORK CENTER',
    title: 'AI 커리어 리포트 플랫폼',
    description: '내담자와의 대화에 집중할 수 있도록, AI가 상담에 필요한 리포트를 사전에 준비합니다.',
    imageAlt: '상담사가 내담자와 커리어 상담을 진행하는 장면'
  },
  reports: {
    company: {
      id: 'company-report',
      layoutClass: 'real-report-layout reverse',
      kicker: 'CAREER ANALYSIS REPORT',
      title: '직업선호도검사 종합 분석 리포트',
      description: '내담자의 직업선호도검사 결과 점수를 입력하면, 희망 직무에 맞게 직무 적합도, 강점, 주의점, 추천 직업 및 커리어 전략까지 연결된 리포트를 생성합니다.',
      checks: [
        '직업흥미·성격·생활사 통합 분석',
        '직무 적합도 및 강점 해석',
        '희망 직무 연결 분석',
        '내담자 맞춤 합격 전략 제안'
      ],
      chips: ['직업 흥미', 'SWOT', '전략 키워드', '직무 추천'],
      imageKey: 'interestReport',
      imageAlt: '직업선호도검사 종합 분석 리포트 이미지'
    },
    success: {
      id: 'success-report',
      layoutClass: 'real-report-layout',
      kicker: 'SUCCESS CASE REPORT',
      title: '취업 성공사례 리포트',
      description: '실제 전직·재취업 성공사례를 기반으로 내담자에게 현실적인 전환 경로를 제안합니다. 직종명은 명확히 보여주고, 세부 상담 내용은 개인정보 보호 관점에서 안전하게 처리하는 구조로 설계합니다.',
      checks: [
        '유사 경력 성공사례 추천',
        '전직 준비 과정과 성공요인 분석',
        '필요 자격·교육 정보 연결',
        '내담자 맞춤 실행 로드맵 제공'
      ],
      chips: ['재취업 성공', '전직 성공', '커리어 전환', '실제 사례'],
      imageKey: 'successReport',
      imageAlt: '취업 성공 사례 리포트 문서 이미지'
    }
  },
  quality: {
    id: 'quality',
    title: '한층 더 업그레이드된 상담 품질로 성공적인 취업을 지원합니다.',
    description: 'AI가 상담을 대체하는 구조가 아닌, 상담사가 더 정확한 근거를 가지고 더 빠르게 상담을 준비할 수 있도록 설계했습니다.',
    cards: [
      { number: '1', title: '상담 맥락 기반 분석', description: '참여자 경력, 희망 방향, 상담 메모를 함께 반영해 맞춤형 상담 자료로 구성합니다.' },
      { number: '2', title: '상담사 검토 중심', description: 'AI 초안을 그대로 전달하지 않고 상담사가 수정·보완한 최종 리포트만 저장합니다.' },
      { number: '3', title: '채용정보까지 연결', description: '기업 분석, 성공사례, 신중년 경력자산 리포트를 현재 채용정보 매칭과 연결합니다.' }
    ]
  },
  featureStrip: [
    { title: '직무 분석 리포트', description: '실제 직무기술서 초안 수준' },
    { title: '직업선호도검사 리포트', description: '6각형 차트 기반 진로 해석' },
    { title: '성공사례 리포트', description: '실제 사례 기반 실행 로드맵' },
    { title: '채용정보 매칭', description: '현재 공고 기반 추천 정리' }
  ],
  cta: {
    title: '상담 준비 시간을 줄이고, 상담 품질은 높이세요.',
    description: '참여자 등록부터 리포트 생성, 채용정보 매칭, 상담 이력 관리까지 하나의 화면에서 운영합니다.'
  },
  footer: {
    brand: 'AI Career Solution',
    description: '전직·재취업 상담 현장을 위한 AI 커리어 리포트 플랫폼'
  }
};

const LANDING_IMAGES = {
  hero: 'assets/landing-hero.jpg',
  interestReport: 'assets/landing-interest-report.png',
  successReport: 'assets/landing-success-report.png'
};
