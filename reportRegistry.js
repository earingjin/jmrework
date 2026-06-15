(function () {
  const definitions = [
    {
      id: 'interest',
      title: '직업선호도검사 리포트',
      menuLabel: '직업선호도검사 리포트',
      available: true,
      menuOrder: 10,
      quickAction: {
        order: 10,
        icon: 'interest',
        title: '직업선호도검사 리포트',
        description: '흥미·성격·생활사 검사를 통합 분석하여 진로 방향과 직무 적합성을 제시합니다.'
      }
    },
    {
      id: 'success',
      title: '취업 성공 사례',
      menuLabel: '취업 성공 사례',
      available: true,
      menuOrder: 20,
      quickAction: {
        order: 20,
        icon: 'success',
        title: '취업 성공사례',
        description: '유사한 경력과 조건의 성공사례를 검색하고 맞춤형 인사이트를 제공합니다.'
      }
    },
    {
      id: 'task',
      title: '직업 탐색 리포트',
      menuLabel: '직업 탐색 리포트',
      available: false,
      menuOrder: 30
    },
    {
      id: 'interview',
      title: '상황 면접 시뮬레이션',
      menuLabel: '상황 면접 시뮬레이션',
      available: false,
      menuOrder: 40,
      quickAction: {
        order: 40,
        icon: 'interview',
        title: '상황면접 시뮬레이션',
        description: '직무별 예상 질문과 모범 답변을 생성하여 면접 준비를 도와드립니다.'
      }
    },
    {
      id: 'jobAnalysis',
      title: '직무분석리포트',
      quickAction: {
        order: 30,
        icon: 'job',
        title: '직무 분석 리포트',
        description: '희망 직무와 경력을 기반으로 직무 적합성, 필요 역량, 준비 방향을 분석합니다.'
      }
    },
    { id: 'company', title: '기업 분석 리포트' },
    { id: 'senior', title: '신중년 경력자산 리포트' },
    { id: 'jobs', title: '채용정보 매칭' }
  ];

  const registry = new Map(definitions.map(definition => [definition.id, Object.freeze(definition)]));

  window.REPORT_REGISTRY = Object.freeze({
    get(id) {
      return registry.get(id) || null;
    },
    list() {
      return Array.from(registry.values());
    },
    menuItems() {
      return Array.from(registry.values())
        .filter(definition => Number.isFinite(definition.menuOrder))
        .sort((a, b) => a.menuOrder - b.menuOrder);
    },
    quickActions() {
      return Array.from(registry.values())
        .filter(definition => definition.quickAction)
        .sort((a, b) => a.quickAction.order - b.quickAction.order);
    }
  });
})();
