(function () {
  const definitions = [
    {
      id: 'interest',
      title: '직업선호도검사 리포트',
      menuLabel: '직업선호도검사 리포트',
      description: '직업흥미, 성격, 생활사 검사 결과를 통합 분석하여 진로 방향과 직무 적합성을 제시합니다.',
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
      description: '유사한 경력과 조건의 성공사례를 검색하고 상담용 인사이트를 제공합니다.',
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
