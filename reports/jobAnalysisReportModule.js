(function () {
  window.REPORT_MODULES.register('jobAnalysis', {
    renderForm() {
      return `<div class="empty">직무분석리포트 생성은 현재 화면에서 숨김 처리되어 있습니다.</div>`;
    },
    validate(p) {
      const target = val('jobAnalysisTarget') || p?.target;
      return target ? true : '희망 직무를 입력해주세요.';
    },
    async generate(p) {
      const target = val('jobAnalysisTarget') || p.target;
      if (!target) {
        toast('희망 직무를 입력해주세요.');
        return;
      }
      try {
        const generated = await generateGeminiJobAnalysis(p, target);
        finishGeneratedReport('jobAnalysis', p, generated.title, generated.html);
        return { tokenUsage: generated.tokenUsage };
      } catch (err) {
        throw err;
      }
    }
  });
})();
