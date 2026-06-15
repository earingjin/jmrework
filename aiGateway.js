(function () {
  function geminiEndpoint() {
    return '/api/gemini';
  }

  function generateContent({ model, body, request = fetch }) {
    return request(geminiEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, ...body })
    });
  }

  window.AI_GATEWAY = Object.freeze({
    geminiEndpoint,
    generateContent
  });
})();
