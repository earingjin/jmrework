(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AuthSession = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createController(options = {}) {
    const fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
    let invalidationStarted = false;

    function clearKeys() {
      const storage = options.storage;
      if (!storage) return;
      (options.sensitiveKeys || []).forEach((key) => storage.removeItem(key));
    }

    function invalidateOnce(detail = {}) {
      if (invalidationStarted) return false;
      invalidationStarted = true;
      clearKeys();
      options.resetSensitiveState?.();
      options.onUnauthorized?.(detail);
      return true;
    }

    function resetInvalidation() {
      invalidationStarted = false;
    }

    async function handleResponse(response, context = {}) {
      if (response.status === 401) {
        let code = '';
        try { code = (await response.clone().json())?.error?.code || ''; } catch {}
        invalidateOnce({ code, context });
      } else if (response.status === 403) {
        options.onForbidden?.({ context });
      } else if (response.status >= 500) {
        options.onServiceError?.({ status: response.status, context });
      }
      return response;
    }

    async function authenticatedFetch(input, init = {}, context = {}) {
      try {
        const response = await fetchImpl(input, init);
        return handleResponse(response, context);
      } catch (error) {
        options.onNetworkError?.({ error, context });
        throw error;
      }
    }

    return Object.freeze({ authenticatedFetch, handleResponse, invalidateOnce, resetInvalidation });
  }

  return Object.freeze({ createController });
});
