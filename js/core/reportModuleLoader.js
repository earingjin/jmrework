(function () {
  const paths = window.REPORT_REGISTRY?.modulePaths?.() || [];
  const uniquePaths = Array.from(new Set(paths));

  uniquePaths.forEach((path) => {
    document.write(`<script src="${path}"><\/script>`);
  });
})();
