function render() {
  const app = document.getElementById('app');
  if (state.view === 'landing') {
    app.innerHTML = renderLanding();
    return;
  }
  if (state.view === 'login' && !state.user) {
    app.innerHTML = renderCounselorLogin();
    return;
  }
  app.innerHTML = renderApp();
  activateSection(state.active);
}

function renderLanding() {
  return landingTemplate();
}

function renderCounselorLogin() {
  return loginTemplate();
}

function renderApp() {
  return shellTemplate();
}
