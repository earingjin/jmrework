const LANDING_CONTENT = {
  logo: {
    mark: '',
    text: 'RE:WORK CENTER'
  },
  nav: [
    { label: '직업선호도검사', href: '#interest-report' },
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
    title: '제이엠커리어 AI 리워크센터',
    description: '상담사는 내담자와의 대화에 집중할 수 있도록 AI가 상담에 필요한 리포트 초안을 준비합니다.',
    imageAlt: '상담사가 내담자와 커리어 상담을 진행하는 장면'
  },
  reports: {
    interest: {
      id: 'interest-report',
      layoutClass: 'real-report-layout reverse',
      kicker: 'INTEREST REPORT',
      title: '직업선호도검사 리포트',
      description: '직업흥미·성격·생활사 검사 결과를 바탕으로 진로 방향, 직무 적합성, 상담 질문을 정리합니다.',
      checks: [
        '직업흥미 결과 기반 통합 분석',
        '희망 직무 유무에 따른 맞춤 분석',
        'SWOT 및 추천 직업 정리',
        '상담사용 코칭 질문 제공'
      ],
      chips: ['직업흥미', '성격검사', '생활사', 'SWOT'],
      imageKey: 'interestReport',
      imageAlt: '직업선호도검사 리포트 이미지'
    },
    success: {
      id: 'success-report',
      layoutClass: 'real-report-layout',
      kicker: 'SUCCESS CASE REPORT',
      title: '취업 성공사례 리포트',
      description: '실제 전직·재취업 성공사례를 바탕으로 내담자에게 현실적인 전환 경로와 상담 질문을 제안합니다.',
      checks: [
        '유사 경력 성공사례 추천',
        '전직 준비 과정과 성공요인 분석',
        '필요 자격·교육 정보 연결',
        '내담자 맞춤 상담 질문 제공'
      ],
      chips: ['성공사례', '전직 성공', '커리어 전환', '실제 사례'],
      imageKey: 'successReport',
      imageAlt: '취업 성공사례 리포트 문서 이미지'
    }
  },
  quality: {
    id: 'quality',
    title: '상담사가 검토하고 완성하는 AI 리포트',
    description: 'AI가 상담사를 대체하는 구조가 아니라, 상담사가 더 정확한 근거를 가지고 빠르게 상담을 준비할 수 있도록 설계했습니다.',
    cards: [
      { number: '1', title: '상담 맥락 기반 분석', description: '검사 결과와 상담 메모를 함께 반영해 상담 자료를 구성합니다.' },
      { number: '2', title: '리포트 저장 없음', description: 'AI 초안은 상담사가 수정·출력하며, 리포트 본문은 서버에 저장하지 않습니다.' },
      { number: '3', title: '통계 중심 운영', description: '관리자는 리포트 생성 건수, 성공률, 오류, 토큰 사용량을 확인합니다.' }
    ]
  },
  featureStrip: [
    { title: '직업선호도검사 리포트', description: '검사 결과 기반 진로 방향 제시' },
    { title: '성공사례 리포트', description: '실제 사례 기반 실행 로드맵' },
    { title: '상담사 편집 가능', description: 'AI 초안을 상담사가 최종 검토' },
    { title: '통계 관리', description: '관리자페이지에서 생성 통계 확인' }
  ],
  cta: {
    title: '상담 준비 시간은 줄이고, 상담 품질은 높이세요.',
    description: '직업선호도검사와 성공사례 리포트를 한 화면에서 생성하고 편집할 수 있습니다.'
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
