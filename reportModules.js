(function () {
  const modules = new Map();

  window.REPORT_MODULES = Object.freeze({
    register(id, reportModule) {
      if (!id || !reportModule) throw new Error('리포트 모듈 ID와 구현이 필요합니다.');
      modules.set(id, Object.freeze({ ...reportModule, id }));
    },
    get(id) {
      return modules.get(id) || null;
    },
    list() {
      return Array.from(modules.values());
    }
  });
})();
