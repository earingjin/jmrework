(function () {
  function geminiEndpoint() {
    return '/api/gemini';
  }

  function authHeaders(headers = {}) {
    const token = localStorage.getItem('REWORK_AUTH_TOKEN') || '';
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  function generateContent({ model, body, request = fetch }) {
    return request(geminiEndpoint(), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ model, ...body })
    });
  }

  window.AI_GATEWAY = Object.freeze({
    geminiEndpoint,
    generateContent
  });
})();
