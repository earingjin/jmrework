function uid() {
  return `id_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function maskCounselorName(value = "") {
  const characters = [...String(value).trim()];
  if (!characters.length) return "";
  if (characters.length === 1) return "*";
  if (characters.length === 2) return `${characters[0]}*`;
  return `${characters[0]}${"*".repeat(characters.length - 2)}${characters[characters.length - 1]}`;
}

function escapeHtml(value = "") {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value).replace(/[&<>"']/g, (char) => entities[char]);
}

function val(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function formatDateTime(value) {
  if (!value) return "접속 기록 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
