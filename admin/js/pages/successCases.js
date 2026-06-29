const SUCCESS_CASE_REQUIRED_HEADERS = ["현재직업 또는 현재 직업/현재직무/직무"];
const SUCCESS_CASE_ADMIN_FIELDS = "번호, 사례자, 현재직업, 보유 자격/교육, 이전 경력, 준비방법, 주요활동, 출처, 성공요인";

function adminNumberText(value) {
  return Math.round(Number(value) || 0).toLocaleString("ko-KR");
}

function successCaseStatusPill(status) {
  const color = status === "active" ? "green" : "gray";
  const label = { active: "활성", hidden: "숨김", archived: "보관" }[status] || status || "활성";
  return `<span class="pill ${color}">${escapeHtml(label)}</span>`;
}

function successCaseUploadResultHtml() {
  const result = state.successCaseImportResult;
  if (!result) return "";
  const errorRows = (result.errors || []).slice(0, 8)
    .map((error) => `<tr><td>${adminNumberText(error.row)}</td><td>${escapeHtml(error.message)}</td></tr>`)
    .join("");
  const errors = errorRows
    ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>행</th><th>오류</th></tr></thead><tbody>${errorRows}</tbody></table></div>`
    : "";
  return `
    <div class="import-result">
      <p>전체 행: ${adminNumberText(result.totalRows)}</p>
      <p>신규 추가: ${adminNumberText(result.insertedCount)}</p>
      <p>제외: ${adminNumberText(result.skippedCount)}</p>
      ${errors}
    </div>`;
}

function successCaseUploadPanel() {
  return `
    <div class="panel">
      <div class="panel-head"><div><h3>성공사례 엑셀 업로드</h3><span class="small">엑셀 재업로드는 기존 사례 수정 없이 신규 사례만 추가합니다.</span></div></div>
      <div class="panel-body">
        <div class="admin-intro"><strong>관리 필드</strong><br>${SUCCESS_CASE_ADMIN_FIELDS}<br><br><strong>필수 컬럼</strong><br>${SUCCESS_CASE_REQUIRED_HEADERS.join(", ")} 컬럼이 필요합니다. 공백, 괄호, 슬래시 차이가 있어도 최대한 같은 의미의 컬럼으로 인식합니다.</div>
        <div class="field"><label>엑셀 파일</label><input id="successCaseImportFile" type="file" accept=".xlsx,.xls,.csv"></div>
        <div class="actions"><button class="btn" data-action="import-success-cases">업로드 실행</button><button class="btn secondary" data-action="reload-success-cases">목록 새로고침</button></div>
        ${successCaseUploadResultHtml()}
      </div>
    </div>`;
}

function successCaseForm() {
  return `
    <details id="successCaseEditPanel" class="panel admin-collapse">
      <summary class="panel-head"><div><h3>성공사례 직접 수정</h3><span class="small">목록에서 수정 버튼을 누르면 아래 폼에 사례 정보가 채워집니다.</span></div><span class="collapse-chevron">⌄</span></summary>
      <div class="panel-body">
        <input type="hidden" id="successCaseDbId">
        <div class="grid-3">
          <div class="field"><label>번호</label><input id="successCaseSourceNo" maxlength="80"></div>
          <div class="field"><label>사례자</label><input id="successCasePersonName" maxlength="200"></div>
          <div class="field"><label>현재직업 *</label><input id="successCaseCurrentJob" maxlength="500"></div>
        </div>
        <div class="field"><label>보유 자격/교육</label><textarea id="successCaseCertTraining"></textarea></div>
        <div class="field"><label>이전 경력</label><textarea id="successCasePreviousCareer"></textarea></div>
        <div class="field"><label>준비방법</label><textarea id="successCasePreparation"></textarea></div>
        <div class="field"><label>주요활동</label><textarea id="successCaseActivities"></textarea></div>
        <div class="grid-2">
          <div class="field"><label>출처</label><input id="successCaseSourceText"></div>
          <div class="field"><label>상태</label><select id="successCaseStatus"><option value="active">활성</option><option value="hidden">숨김</option><option value="archived">보관</option></select></div>
        </div>
        <div class="field"><label>성공요인</label><textarea id="successCaseSuccessFactors"></textarea></div>
        <div class="actions">
          <button class="btn" data-action="save-success-case">성공사례 저장</button>
          <button class="btn secondary" data-action="reset-success-case">입력 초기화</button>
        </div>
      </div>
    </details>`;
}

function successCaseRow(item) {
  const sourceText = item["출처문구"] || [item["출처기관"], item["출처연도"]].filter(Boolean).join(" ");
  const searchText = [
    item["원본번호"],
    item["사례자명"],
    item["현재직업"],
    item["이전경력"],
    item["보유자격교육"],
    item["준비방법"],
    item["주요활동"],
    sourceText,
    item["성공요인"],
    item.status,
  ].join(" ").toLowerCase();
  return `
    <tr data-success-case-row data-search="${escapeHtml(searchText)}">
      <td>${escapeHtml(item["원본번호"] || "-")}</td>
      <td>${escapeHtml(item["사례자명"] || "-")}</td>
      <td><strong>${escapeHtml(item["현재직업"])}</strong></td>
      <td>${escapeHtml(item["보유자격교육"] || "-")}</td>
      <td>${escapeHtml(item["이전경력"] || "-")}</td>
      <td>${escapeHtml(item["준비방법"] || "-")}</td>
      <td>${escapeHtml(item["주요활동"] || "-")}</td>
      <td>${escapeHtml(sourceText || "-")}</td>
      <td>${escapeHtml(item["성공요인"] || "-")}</td>
      <td>${successCaseStatusPill(item.status)}</td>
      <td>${escapeHtml(formatDateTime(item.updatedAt))}</td>
      <td class="actions">
        <button class="btn secondary" data-action="fill-success-case" data-id="${escapeHtml(item.id)}">수정</button>
        <button class="btn danger" data-action="delete-success-case" data-id="${escapeHtml(item.id)}">삭제</button>
      </td>
    </tr>`;
}

function successCaseListPanel() {
  const cases = Array.isArray(state.data.successCases) ? state.data.successCases : [];
  const rows = cases.map(successCaseRow).join("");
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>번호</th><th>사례자</th><th>현재직업</th><th>보유 자격/교육</th><th>이전 경력</th><th>준비방법</th><th>주요활동</th><th>출처</th><th>성공요인</th><th>상태</th><th>수정일</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div><div id="successCaseSearchEmpty" class="empty" style="display:none">검색 조건에 맞는 성공사례가 없습니다.</div>`
    : '<div class="empty">저장된 성공사례가 없습니다.</div>';
  return `
    <details id="successCaseListPanel" class="panel admin-collapse" open>
      <summary class="panel-head">
        <div><h3>최근 성공사례</h3><span class="small">저장된 성공사례 전체 ${adminNumberText(cases.length)}건을 표시합니다.</span></div>
        <div class="admin-tools" onclick="event.stopPropagation()">
          <input id="successCaseSearch" data-filter-success-cases placeholder="번호, 사례자, 직업, 경력, 출처 검색">
          <span class="collapse-chevron">⌄</span>
        </div>
      </summary>
      <div class="panel-body">${contents}</div>
    </details>`;
}

function successCaseBatchRow(batch) {
  const fileName = batch.file_name || "-";
  const fileCell = batch.has_file
    ? `<button class="link-button" data-action="download-success-case-file" data-id="${escapeHtml(batch.id)}">${escapeHtml(fileName)}</button><br><span class="small">${adminNumberText(batch.file_size || 0)} bytes</span>`
    : `<strong>${escapeHtml(fileName)}</strong><br><span class="small">저장된 원본 파일 없음</span>`;
  const fileActions = batch.has_file
    ? `<button class="btn danger" data-action="delete-success-case-file" data-id="${escapeHtml(batch.id)}">파일 삭제</button>`
    : "-";
  return `
    <tr>
      <td>${fileCell}<br><span class="small">${escapeHtml(batch.id || "")}</span></td>
      <td>${adminNumberText(batch.total_rows)}</td>
      <td>${adminNumberText(batch.inserted_count)}</td>
      <td>${adminNumberText(batch.skipped_count)}</td>
      <td>${adminNumberText(batch.error_count)}</td>
      <td>${escapeHtml(formatDateTime(batch.imported_at))}</td>
      <td class="actions">${fileActions}</td>
    </tr>`;
}

function successCaseBatchPanel() {
  const batches = Array.isArray(state.data.successCaseBatches) ? state.data.successCaseBatches : [];
  const rows = batches.map(successCaseBatchRow).join("");
  const contents = rows
    ? `<div class="table-wrap"><table><thead><tr><th>파일</th><th>전체</th><th>신규</th><th>제외</th><th>오류</th><th>업로드일</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="empty">성공사례 업로드 이력이 없습니다.</div>';
  return `
    <div class="panel">
      <div class="panel-head"><div><h3>업로드 이력</h3><span class="small">최근 50건의 엑셀 업로드 결과입니다.</span></div></div>
      <div class="panel-body">${contents}</div>
    </div>`;
}

function successCasesSection() {
  const cases = Array.isArray(state.data.successCases) ? state.data.successCases : [];
  const batches = Array.isArray(state.data.successCaseBatches) ? state.data.successCaseBatches : [];
  const active = cases.filter((item) => item.status === "active");
  const latestBatch = batches[0] || null;
  return `
    <section id="section-success-cases" class="section">
      ${pageTitle("성공사례 DB", "엑셀로 성공사례를 누적 추가하고 검색 DB를 관리합니다.")}
      <div class="cards">
        <div class="metric"><span>최근 로드 사례</span><strong>${adminNumberText(cases.length)}</strong></div>
        <div class="metric"><span>활성 사례</span><strong>${adminNumberText(active.length)}</strong></div>
        <div class="metric"><span>업로드 이력</span><strong>${adminNumberText(batches.length)}</strong></div>
        <div class="metric"><span>최근 업로드 신규/제외</span><strong>${latestBatch ? `${adminNumberText(latestBatch.inserted_count)} / ${adminNumberText(latestBatch.skipped_count)}` : "0 / 0"}</strong></div>
      </div>
      ${successCaseUploadPanel()}
      ${successCaseForm()}
      ${successCaseListPanel()}
      ${successCaseBatchPanel()}
    </section>`;
}

function readSuccessCaseWorkbook(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("업로드할 파일을 선택해주세요."));
      return;
    }
    if (!window.XLSX) {
      reject(new Error("엑셀 파서 라이브러리를 찾을 수 없습니다. 페이지를 새로고침해주세요."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = window.XLSX.read(reader.result, { type: "array" });
        resolve(workbook);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };
    reader.onerror = () => reject(new Error("파일 원본을 읽는 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

async function parseSuccessCasesFromFile(file) {
  const workbook = await readSuccessCaseWorkbook(file);
  const rows = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return window.XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => ({
      ...row,
      원본시트: row["원본시트"] || sheetName,
      원본번호: row["원본번호"] || index + 1,
    }));
  });
  return rows.filter((row) => Object.values(row).some((value) => String(value || "").trim()));
}

async function importSuccessCases() {
  const file = document.getElementById("successCaseImportFile")?.files?.[0];
  if (!file) {
    toast("업로드할 성공사례 엑셀 파일을 선택해주세요.");
    return false;
  }
  try {
    const rows = await parseSuccessCasesFromFile(file);
    if (!rows.length) {
      toast("업로드할 성공사례 데이터가 없습니다.");
      return false;
    }
    const response = await authFetch("/api/success-cases/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        cases: rows,
        file: {
          name: file.name,
          mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: file.size,
          dataBase64: await readFileAsBase64(file),
        },
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast(data?.error?.message || "성공사례 업로드 중 오류가 발생했습니다.");
      return false;
    }
    state.successCaseImportResult = data;
    await loadSuccessCaseData();
    toast(`성공사례 업로드 완료: 신규 ${adminNumberText(data.insertedCount)}건, 제외 ${adminNumberText(data.skippedCount)}건`);
    return true;
  } catch (err) {
    console.error("importSuccessCases error", err);
    toast(err.message || "성공사례 업로드 중 오류가 발생했습니다.");
    return false;
  }
}

async function downloadSuccessCaseImportFile(id) {
  try {
    const response = await authFetch(`/api/success-cases/import-batches/${encodeURIComponent(id)}/file`, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast(data?.error?.message || "성공사례 원본 파일을 불러오지 못했습니다.");
      return false;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const fileName = match ? decodeURIComponent(match[1]) : "success-cases.xlsx";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("downloadSuccessCaseImportFile error", err);
    toast("성공사례 원본 파일을 불러오지 못했습니다.");
    return false;
  }
}

async function deleteSuccessCaseImportFile(id) {
  const batch = (state.data.successCaseBatches || []).find((item) => item.id === id);
  const label = batch?.file_name || "선택한 파일";
  if (!confirm(`"${label}" 원본 엑셀 파일을 삭제할까요? 성공사례 데이터는 삭제되지 않습니다.`)) return false;
  try {
    const response = await authFetch(`/api/success-cases/import-batches/${encodeURIComponent(id)}/file`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast(data?.error?.message || "성공사례 원본 파일 삭제 중 오류가 발생했습니다.");
      return false;
    }
    await loadSuccessCaseBatches();
    toast("성공사례 원본 파일이 삭제되었습니다.");
    return true;
  } catch (err) {
    console.error("deleteSuccessCaseImportFile error", err);
    toast("성공사례 원본 파일 삭제 중 오류가 발생했습니다.");
    return false;
  }
}

function successCasePayloadFromForm() {
  return {
    사례자명: val("successCasePersonName"),
    원본번호: val("successCaseSourceNo"),
    현재직업: val("successCaseCurrentJob"),
    이전경력: val("successCasePreviousCareer"),
    보유자격교육: val("successCaseCertTraining"),
    준비방법: val("successCasePreparation"),
    주요활동: val("successCaseActivities"),
    성공요인: val("successCaseSuccessFactors"),
    출처문구: val("successCaseSourceText"),
    status: val("successCaseStatus") || "active",
  };
}

function fillSuccessCaseForm(id) {
  const item = (state.data.successCases || []).find((successCase) => successCase.id === id);
  if (!item) return;
  const panel = document.getElementById("successCaseEditPanel");
  if (panel) panel.open = true;
  document.getElementById("successCaseDbId").value = item.id || "";
  document.getElementById("successCasePersonName").value = item["사례자명원본"] || item["사례자명"] || "";
  document.getElementById("successCaseSourceNo").value = item["원본번호"] || "";
  document.getElementById("successCaseCurrentJob").value = item["현재직업"] || "";
  document.getElementById("successCasePreviousCareer").value = item["이전경력"] || "";
  document.getElementById("successCaseCertTraining").value = item["보유자격교육"] || "";
  document.getElementById("successCasePreparation").value = item["준비방법"] || "";
  document.getElementById("successCaseActivities").value = item["주요활동"] || "";
  document.getElementById("successCaseSuccessFactors").value = item["성공요인"] || "";
  document.getElementById("successCaseSourceText").value = item["출처문구"] || [item["출처기관"], item["출처연도"]].filter(Boolean).join(" ");
  document.getElementById("successCaseStatus").value = item.status || "active";
  document.getElementById("successCaseCurrentJob")?.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetSuccessCaseForm() {
  [
    "successCaseDbId",
    "successCasePersonName",
    "successCaseSourceNo",
    "successCaseCurrentJob",
    "successCasePreviousCareer",
    "successCaseCertTraining",
    "successCasePreparation",
    "successCaseActivities",
    "successCaseSuccessFactors",
    "successCaseSourceText",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  const status = document.getElementById("successCaseStatus");
  if (status) status.value = "active";
}

async function saveSuccessCase() {
  const id = val("successCaseDbId");
  const payload = successCasePayloadFromForm();
  if (!id) {
    toast("목록에서 수정할 성공사례를 먼저 선택해주세요.");
    return false;
  }
  if (!payload.현재직업) {
    toast("현재직업은 필수입니다.");
    return false;
  }
  try {
    const response = await authFetch(`/api/success-cases/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.case) {
      toast(data?.error?.message || "성공사례 저장 중 오류가 발생했습니다.");
      return false;
    }
    const index = state.data.successCases.findIndex((item) => item.id === data.case.id);
    if (index >= 0) state.data.successCases[index] = data.case;
    await loadSuccessCases();
    resetSuccessCaseForm();
    toast("성공사례가 저장되었습니다.");
    return true;
  } catch (err) {
    console.error("saveSuccessCase error", err);
    toast("성공사례 저장 중 오류가 발생했습니다.");
    return false;
  }
}

async function deleteSuccessCase(id) {
  const item = (state.data.successCases || []).find((successCase) => successCase.id === id);
  if (!item) return false;
  const label = item["현재직업"] || "선택한 성공사례";
  if (!confirm(`"${label}" 성공사례를 삭제할까요? 삭제하면 상담사 검색 결과에서도 제외됩니다.`)) return false;
  try {
    const response = await authFetch(`/api/success-cases/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast(data?.error?.message || "성공사례 삭제 중 오류가 발생했습니다.");
      return false;
    }
    state.data.successCases = state.data.successCases.filter((successCase) => successCase.id !== id);
    if (val("successCaseDbId") === id) resetSuccessCaseForm();
    toast("성공사례가 삭제되었습니다.");
    return true;
  } catch (err) {
    console.error("deleteSuccessCase error", err);
    toast("성공사례 삭제 중 오류가 발생했습니다.");
    return false;
  }
}

function filterSuccessCases() {
  const query = String(document.getElementById("successCaseSearch")?.value || "").trim().toLowerCase();
  const rows = [...document.querySelectorAll("[data-success-case-row]")];
  let visible = 0;
  rows.forEach((row) => {
    const matched = !query || String(row.dataset.search || "").includes(query);
    row.style.display = matched ? "" : "none";
    if (matched) visible += 1;
  });
  const empty = document.getElementById("successCaseSearchEmpty");
  if (empty) empty.style.display = rows.length && !visible ? "" : "none";
}
