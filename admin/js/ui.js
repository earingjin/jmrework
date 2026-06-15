function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 2400);
}

function pageTitle(title, description) {
  return `<div class="topbar"><div><h2>${title}</h2><p>${description}</p></div></div>`;
}
