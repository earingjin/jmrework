const SCREEN_CONTENT = {
  dashboard: {
    title: '대시보드',
    desc: '상담사가 리포트 생성 흐름을 확인하는 화면입니다.',
    flowTitle: '서비스 흐름 요약',
    flowCards: [
      { title: '1. 검사 점수 입력', desc: '상담사가 내담자의 검사 점수를 직접 입력합니다. 내담자 정보는 서비스에 저장하지 않습니다.' },
      { title: '2. 리포트 유형 선택', desc: '직업선호도검사 리포트 또는 성공사례 리포트를 선택합니다.' },
      { title: '3. 결과 분석', desc: 'AI가 상담용 리포트 초안을 생성합니다.' },
      { title: '4. 편집·출력', desc: '상담사가 최종 내용을 확인하고 출력합니다.' }
    ]
  },
  participants: {
    title: '참여자 관리',
    desc: '신규 참여자를 등록하고 현재 상태와 서류 상태를 관리합니다.',
    formTitle: '신규/수정 등록',
    formDesc: '상담사가 AI 리포트 생성 전에 참여자 맥락을 입력합니다.',
    listTitle: '참여자 목록'
  },
  modules: {
    desc: '왼쪽 하위 사이드바에서 리포트 유형을 선택하면 해당 섹션만 열립니다.',
    noParticipant: '참여자를 먼저 등록해주세요.',
    previewTitle: '리포트 미리보기',
    previewDesc: '생성 후 상담사가 직접 수정할 수 있습니다. 해당 리포트는 상담자의 사전 준비 목적 외, 내담자와 공유하지 않습니다.',
    moduleDesc: {
      interest: '직업선호도검사 점수를 입력하면 AI가 분석합니다.',
      success: '공공기관에서 발간한 취업성공 사례집의 실제 전직 성공사례를 상담 목적에 맞게 요약·인용하여 출력합니다.'
    }
  },
  admin: {
    title: '관리자 현황',
    desc: '조직 단위 운영을 위한 상담사 계정 현황을 관리합니다.',
    accountIssueTitle: '상담사 계정 발급',
    accountIssueDesc: '관리자는 상담사의 아이디와 초기 비밀번호를 발급합니다. 상담사는 접속 후 내 계정에서 비밀번호를 직접 변경할 수 있습니다.',
    reportStatsTitle: '리포트 유형별 생성 현황',
    accountListTitle: '계정 목록',
    participantStatsTitle: '참여자별 진행 현황'
  },
  account: {
    title: '내 계정',
    desc: '상담사 개인 페이지에서 비밀번호를 변경합니다.',
    passwordTitle: '비밀번호 변경'
  }
};
