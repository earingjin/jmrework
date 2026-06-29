(function () {
  const definitions = [
    {
      id: 'interest',
      title: '직업선호도검사 리포트',
      menuLabel: '직업선호도검사 리포트',
      noticeTitle: '안내사항',
      description: '1. 본 리포트의 사용은 상담자의 사전 준비용으로만 사용합니다.<br>2. 본 리포트는 내담자와 공유하지 않습니다.<br>3. 직업흥미검사를 제외한 나머지 검사는 선택사항 입니다.<br>4. 리포트는 상담사가 직접 편집할 수 있습니다.<br>5. 내담자의 정보는 저장되지 않지만, 개인정보 보호를 위해 가명으로 입력해주세요.',
      available: true,
      menuOrder: 10,
      modulePath: 'reports/interestReportModule.js',
      formLayout: 'bare',
      quickAction: {
        order: 10,
        icon: 'interest',
        title: '직업선호도검사 리포트',
        description: '검사 결과를 기반으로 진로 탐색과 직무 추천 리포트를 생성합니다.'
      }
    },
    {
      id: 'success',
      title: '취업 성공사례 리포트',
      menuLabel: '취업 성공사례 리포트',
      noticeTitle: '안내사항',
      description: '1. 성공사례를 알고 싶은 직업명 또는 자격증을 검색합니다.<br>2. 자격증 검색 시 맞춤법 및 띄어쓰기에 따라 결과에 차이가 발생할 수 있습니다, <br>3. 분석을 원하는 갯수만큼 직업을 선택합니다.<br>4. 참여자에게 연결할 시사점을 입력합니다. (이전 경력, 보유 자격, 희망 근무조건, 관심 분야 등)<br>5. 리포트는 상담사가 직접 편집할 수 있습니다. ',
      available: true,
      menuOrder: 20,
      modulePath: 'reports/successReportModule.js',
      formLayout: 'panel',
      quickAction: {
        order: 20,
        icon: 'success',
        title: '취업 성공사례 리포트',
        description: '유사 성공사례를 비교해 상담 리포트를 생성합니다.'
      }
    }
  ];

  const registry = new Map(definitions.map((definition) => [definition.id, Object.freeze(definition)]));

  window.REPORT_REGISTRY = Object.freeze({
    get(id) {
      return registry.get(id) || null;
    },
    list() {
      return Array.from(registry.values());
    },
    defaultId() {
      return Array.from(registry.values())
        .filter((definition) => definition.available !== false)
        .sort((a, b) => (a.menuOrder || 9999) - (b.menuOrder || 9999))[0]?.id || null;
    },
    modulePaths() {
      return Array.from(registry.values())
        .map((definition) => definition.modulePath)
        .filter(Boolean);
    },
    menuItems() {
      return Array.from(registry.values())
        .filter((definition) => Number.isFinite(definition.menuOrder))
        .sort((a, b) => a.menuOrder - b.menuOrder);
    },
    quickActions() {
      return Array.from(registry.values())
        .filter((definition) => definition.quickAction)
        .sort((a, b) => a.quickAction.order - b.quickAction.order);
    }
  });
})();
