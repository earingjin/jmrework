(function () {
  function geminiEndpoint(model, apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  }

  function generateContent({ apiKey, model, body, request = fetch }) {
    return request(geminiEndpoint(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  window.AI_GATEWAY = Object.freeze({
    geminiEndpoint,
    generateContent
  });
})();
