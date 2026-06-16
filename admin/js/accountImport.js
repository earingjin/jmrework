const ACCOUNT_IMPORT_HEADERS = {
  email: ["이메일", "email", "Email", "회사이메일", "계정"],
  phone: ["휴대폰번호", "phone", "Phone", "연락처", "휴대폰"],
  name: ["이름", "name", "상담사명"],
  branch: ["지사", "지사명", "branch", "branchName", "센터", "센터명"],
};

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9가-힣]/g, "");
}

function findHeaderIndex(headers, candidates) {
  const normalizedCandidates = candidates.map(normalizeHeader);
  return headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader(header)));
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsText(file, "UTF-8");
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  result.push(current);
  return result;
}

function parseCsvData(text) {
  const lines = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows = lines.filter((line) => line.trim() !== "");
  if (!rows.length) return { headers: [], rows: [] };

  const headerLine = rows[0];
  let headers = [];
  
  // 쉼표 구분 시도
  if (headerLine.includes(",")) {
    headers = parseCsvLine(headerLine);
  }
  // 탭 구분 시도
  else if (headerLine.includes("\t")) {
    headers = headerLine.split("\t");
  }
  // 기본 공백 구분
  else {
    headers = headerLine.split(/\s+/);
  }

  const dataRows = rows.slice(1).map((line) => {
    if (line.includes(",")) return parseCsvLine(line);
    if (line.includes("\t")) return line.split("\t");
    return line.split(/\s+/);
  }).filter((row) => row.some((cell) => String(cell).trim() !== ""));

  return { headers, rows: dataRows };
}

function buildCounselorAccounts(headers, rows) {
  const headerKeys = headers.map((header) => normalizeHeader(header));
  const emailIndex = findHeaderIndex(headers, ACCOUNT_IMPORT_HEADERS.email);
  const phoneIndex = findHeaderIndex(headers, ACCOUNT_IMPORT_HEADERS.phone);
  const nameIndex = findHeaderIndex(headers, ACCOUNT_IMPORT_HEADERS.name);
  const branchIndex = findHeaderIndex(headers, ACCOUNT_IMPORT_HEADERS.branch);

  console.log("[DEBUG] Headers:", headers);
  console.log("[DEBUG] Email Index:", emailIndex, "Phone Index:", phoneIndex, "Name Index:", nameIndex, "Branch Index:", branchIndex);

  const seenLogins = new Set();
  const accounts = [];
  let excludedCount = 0;
  const totalRows = rows.length;

  rows.forEach((row, rowIdx) => {
    const email = normalizeEmail(row[emailIndex]);
    const phoneRaw = String(row[phoneIndex] || "").trim();
    const name = String(row[nameIndex] || "").trim();
    const branchName = String(row[branchIndex] || "").trim();
    const phoneDigits = phoneRaw.replace(/\D/g, "");

    if (rowIdx === 0) console.log("[DEBUG] Row 0:", { email, phoneRaw, name, branchName, phoneDigits });

    if (!email || !phoneDigits || phoneDigits.length < 4) {
      excludedCount += 1;
      return;
    }

    const loginId = email;
    if (seenLogins.has(loginId)) {
      excludedCount += 1;
      return;
    }

    seenLogins.add(loginId);

    const password = phoneDigits.slice(-4);
    if (!password) {
      excludedCount += 1;
      return;
    }

    accounts.push({
      id: uid(),
      name: name || loginId,
      loginId,
      password,
      role: "상담사",
      status: "active",
      createdAt: today(),
      lastLoginAt: null,
      loginCount: 0,
      source: "excel",
      branch: branchName || "미지정",
    });
  });

  console.log("[DEBUG] Result:", { totalRows, importedCount: accounts.length, excludedCount });

  return {
    accounts,
    totalRows,
    importedCount: accounts.length,
    excludedCount,
  };
}

async function parseCounselorAccountsFromFile(file) {
  if (!file) {
    throw new Error("파일을 선택해주세요.");
  }

  const extension = String(file.name || "").split(".").pop().toLowerCase();
  console.log("[DEBUG] File name:", file.name, "Extension:", extension);

  if (extension === "csv" || extension === "txt") {
    const text = await readFileAsText(file);
    console.log("[DEBUG] CSV text length:", text.length, "First 200 chars:", text.substring(0, 200));
    const { headers, rows } = parseCsvData(text);
    return buildCounselorAccounts(headers, rows);
  }

  if (extension === "xls" || extension === "xlsx") {
    if (typeof window === "undefined" || typeof window.XLSX === "undefined") {
      throw new Error("엑셀 파서 라이브러리를 찾을 수 없습니다. 페이지를 새로고침 해주세요.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
    console.log("[DEBUG] Sheet names:", workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return { accounts: [], totalRows: 0, importedCount: 0, excludedCount: 0 };
    }

    const sheetRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    console.log("[DEBUG] Sheet rows count:", sheetRows.length);
    
    if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
      return { accounts: [], totalRows: 0, importedCount: 0, excludedCount: 0 };
    }

    const [headers, ...dataRows] = sheetRows;
    console.log("[DEBUG] XLSX Headers:", headers);
    
    const rows = dataRows.filter((row) => Array.isArray(row) && row.some((cell) => String(cell).trim() !== ""));
    return buildCounselorAccounts(headers, rows);
  }

  throw new Error("지원하지 않는 파일 형식입니다. xlsx, xls 또는 csv 파일을 업로드해주세요.");
}
