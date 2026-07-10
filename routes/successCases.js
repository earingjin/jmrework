const express = require('express');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const db = require('../lib/db');
const { adminRequired, authRequired } = require('../lib/auth');

const router = express.Router();
const STATUSES = new Set(['active', 'hidden', 'archived']);
let localSuccessCasesCache = null;

const FIELD_MAP = Object.freeze({
  sourceOrg: '출처기관',
  sourceYear: '출처연도',
  personName: '사례자명',
  serialNo: '데이터 일련번호',
  currentJob: '현재직업',
  previousCareer: '이전경력',
  certTraining: '보유자격교육',
  preparation: '준비방법',
  activities: '주요활동',
  transitionType: '전환유형',
  recommendedTarget: '추천대상',
  keywords: '핵심키워드',
  successFactors: '성공요인',
  counselingSentence: '상담활용문장',
  publicStatus: '공개가능여부',
  sourceSheet: '원본시트',
  sourceNo: '원본번호',
  sourceText: '출처문구'
});

const FIELD_ALIASES = Object.freeze({
  sourceOrg: ['출처기관', '출처 기관', '기관', '발행기관'],
  sourceYear: ['출처연도', '연도', '발행연도'],
  personName: ['사례자명', '사례자', '이름', '성명', '대상자명'],
  serialNo: ['데이터 일련번호', '데이터일련번호', '일련번호'],
  currentJob: ['현재직업', '현재 직업', '현재직업활동', '현재 직업/활동', '현재 직업 활동', '현재활동', '현재 활동', '현재직무', '현재 직무', '재취업직업', '재취업 직업', '재취업직무', '재취업 직무', '전환후직업', '전환 후 직업', '전환직무', '취업직무', '취업 직무', '직업', '직무'],
  previousCareer: ['이전경력', '이전 경력', '전직', '전 직업', '이전직업', '이전 직업', '경력', '주요경력'],
  certTraining: ['보유자격교육', '보유 자격 교육', '보유자격/교육', '보유 자격/교육', '보유자격', '보유 자격', '자격교육', '자격 교육', '자격증', '교육', '훈련'],
  preparation: ['준비방법', '준비 방법', '준비과정', '준비 과정', '취업준비', '취업 준비'],
  activities: ['주요활동', '주요 활동', '활동', '수행업무', '수행 업무'],
  transitionType: ['전환유형', '전환 유형', '유형', '분류'],
  recommendedTarget: ['추천대상', '추천 대상', '대상'],
  keywords: ['핵심키워드', '핵심 키워드', '키워드', 'keyword', 'keywords'],
  successFactors: ['성공요인', '성공 요인', '성공포인트', '성공 포인트'],
  counselingSentence: ['상담활용문장', '상담 활용 문장', '상담문장', '상담 문장'],
  publicStatus: ['공개가능여부', '공개 가능 여부', '공개여부'],
  sourceSheet: ['원본시트', '원본 시트', '시트', 'sheet'],
  sourceNo: ['번호', 'No', 'NO', '원본번호', '원본 번호', '행번호', '행 번호'],
  sourceText: ['출처', '출처문구', '출처 문구', '원문출처', '원문 출처', '자료출처', '자료 출처']
});

function valueOf(row, englishKey) {
  const koreanKey = FIELD_MAP[englishKey];
  const directValue = row?.[koreanKey] ?? row?.[englishKey] ?? row?.[snakeCase(englishKey)];
  if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') return directValue;
  const aliases = [koreanKey, englishKey, snakeCase(englishKey), ...(FIELD_ALIASES[englishKey] || [])]
    .filter(Boolean)
    .map(normalizeColumnName);
  const matchedKey = Object.keys(row || {}).find((key) => aliases.includes(normalizeColumnName(key)));
  return matchedKey ? row[matchedKey] : '';
}

function snakeCase(value) {
  return String(value).replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function normalizeColumnName(value) {
  return String(value || '').toLowerCase().replace(/[\s\n\r\t()[\]{}·ㆍ_\-/:.]/g, '');
}

function cleanText(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function localSuccessCases() {
  if (localSuccessCasesCache) return localSuccessCasesCache;
  const filePath = path.join(__dirname, '..', 'data', 'successData.js');
  const source = fs.readFileSync(filePath, 'utf8');
  localSuccessCasesCache = vm.runInNewContext(`${source}\nSUCCESS_CASE_DB;`, {}, { filename: filePath });
  return Array.isArray(localSuccessCasesCache) ? localSuccessCasesCache : [];
}

function maskPersonName(value) {
  const text = cleanText(value, 200);
  if (!text) return '';
  const compact = text.replace(/\s+/g, '');
  const first = [...compact][0] || '';
  return first ? `${first}${'*'.repeat(Math.max([...compact].length - 1, 1))}` : '';
}

function normalizeYear(value) {
  const text = cleanText(value, 20);
  return text ? text : null;
}

function buildSearchText(item) {
  return [
    item.sourceNo,
    item.personName,
    item.currentJob,
    item.previousCareer,
    item.certTraining,
    item.preparation,
    item.activities,
    item.sourceOrg,
    item.sourceYear,
    item.transitionType,
    item.recommendedTarget,
    item.keywords,
    item.successFactors,
    item.sourceText
  ].filter(Boolean).join(' ');
}

function normalizeSuccessCase(row = {}) {
  const item = {
    sourceOrg: cleanText(valueOf(row, 'sourceOrg'), 200),
    sourceYear: normalizeYear(valueOf(row, 'sourceYear')),
    personName: cleanText(valueOf(row, 'personName'), 200),
    serialNo: cleanText(valueOf(row, 'serialNo'), 120),
    currentJob: cleanText(valueOf(row, 'currentJob'), 500),
    previousCareer: cleanText(valueOf(row, 'previousCareer')),
    certTraining: cleanText(valueOf(row, 'certTraining')),
    preparation: cleanText(valueOf(row, 'preparation')),
    activities: cleanText(valueOf(row, 'activities')),
    transitionType: cleanText(valueOf(row, 'transitionType'), 300),
    recommendedTarget: cleanText(valueOf(row, 'recommendedTarget')),
    keywords: cleanText(valueOf(row, 'keywords')),
    successFactors: cleanText(valueOf(row, 'successFactors')),
    counselingSentence: cleanText(valueOf(row, 'counselingSentence')),
    publicStatus: cleanText(valueOf(row, 'publicStatus'), 120),
    sourceSheet: cleanText(valueOf(row, 'sourceSheet'), 300),
    sourceNo: cleanText(valueOf(row, 'sourceNo'), 80),
    sourceText: cleanText(valueOf(row, 'sourceText')),
    status: cleanText(row.status || 'active', 20)
  };
  if (!item.currentJob) {
    const columns = Object.keys(row || {}).filter(Boolean).slice(0, 12).join(', ');
    throw new Error(`현재직업 컬럼을 찾지 못했습니다. 엑셀 컬럼명 확인 필요${columns ? `: ${columns}` : ''}`);
  }
  if (!STATUSES.has(item.status)) item.status = 'active';
  item.searchText = buildSearchText(item);
  item.rawData = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  return item;
}

function legacyCase(row, options = {}) {
  const result = {
    '출처기관': row.source_org || '',
    '출처연도': row.source_year || '',
    '사례자명': maskPersonName(row.person_name),
    '데이터 일련번호': row.serial_no || '',
    '현재직업': row.current_job || '',
    '이전경력': row.previous_career || '',
    '보유자격교육': row.cert_training || '',
    '준비방법': row.preparation || '',
    '주요활동': row.activities || '',
    '전환유형': row.transition_type || '',
    '추천대상': row.recommended_target || '',
    '핵심키워드': row.keywords || '',
    '성공요인': row.success_factors || '',
    '공개가능여부': row.public_status || '',
    '원본시트': row.source_sheet || '',
    '원본번호': row.source_no || '',
    '출처문구': row.source_text || ''
  };
  if (options.includeCounselingSentence) result['상담활용문장'] = row.counseling_sentence || '';
  return result;
}

function adminCase(row) {
  return {
    id: row.id,
    ...legacyCase(row, { includeCounselingSentence: true }),
    '사례자명원본': row.person_name || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    importBatchId: row.import_batch_id
  };
}

function searchScore(row, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return 0;
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const fields = [
    [row.current_job, 30],
    [row.keywords, 20],
    [row.cert_training, 14],
    [row.previous_career, 12],
    [row.preparation, 12],
    [row.activities, 8],
    [row.transition_type, 8],
    [row.recommended_target, 8],
    [row.success_factors, 6]
  ];
  return fields.reduce((score, [value, weight]) => {
    const text = String(value || '').toLowerCase();
    const compact = text.replace(/\s+/g, '');
    if (text.includes(normalizedQuery) || compact.includes(compactQuery)) return score + weight;
    return score;
  }, 0);
}

function localSuccessScore(row, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return 0;
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const fields = [
    [row['현재직업'], 30],
    [row['핵심키워드'], 20],
    [row['보유자격교육'], 14],
    [row['이전경력'], 12],
    [row['준비방법'], 12],
    [row['주요활동'], 8],
    [row['전환유형'], 8],
    [row['추천대상'], 8],
    [row['성공요인'], 6]
  ];
  return fields.reduce((score, [value, weight]) => {
    const text = String(value || '').toLowerCase();
    const compact = text.replace(/\s+/g, '');
    if (text.includes(normalizedQuery) || compact.includes(compactQuery)) return score + weight;
    return score;
  }, 0);
}

function publicLocalCase(row) {
  return {
    '사례ID': cleanText(row['사례ID'], 120),
    '출처기관': cleanText(row['출처기관'], 200),
    '출처연도': row['출처연도'] || '',
    '데이터 일련번호': cleanText(row['데이터 일련번호'], 120),
    '현재직업': cleanText(row['현재직업'], 500),
    '이전경력': cleanText(row['이전경력']),
    '보유자격교육': cleanText(row['보유자격교육']),
    '준비방법': cleanText(row['준비방법']),
    '주요활동': cleanText(row['주요활동']),
    '전환유형': cleanText(row['전환유형'], 300),
    '추천대상': cleanText(row['추천대상']),
    '핵심키워드': cleanText(row['핵심키워드']),
    '성공요인': cleanText(row['성공요인']),
    '공개가능여부': cleanText(row['공개가능여부'], 120),
    '원본시트': cleanText(row['원본시트'], 300),
    '원본번호': row['원본번호'] || '',
    '출처문구': cleanText(row['출처문구'])
  };
}

function searchLocalSuccessCases(query, limit) {
  return localSuccessCases()
    .map((row, index) => ({ id: row['사례ID'] || `local-${index}`, case: publicLocalCase(row), score: localSuccessScore(row, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.case['현재직업']).localeCompare(String(b.case['현재직업']), 'ko'))
    .slice(0, limit);
}

router.get('/success-cases/search', authRequired, async (req, res) => {
  try {
    const query = cleanText(req.query.q || req.query.query || '', 200);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    if (!query) return res.json({ cases: [] });
    if (!db.enabled) return res.json({ cases: searchLocalSuccessCases(query, limit) });
    const terms = query.split(/\s+/).filter(Boolean).slice(0, 6);
    const params = terms.map((term) => `%${term}%`);
    const where = params.map((_, index) => `search_text ILIKE $${index + 1}`).join(' OR ');
    const result = await db.query(
      `SELECT id,source_org,source_year,person_name,serial_no,current_job,previous_career,cert_training,preparation,activities,transition_type,recommended_target,keywords,success_factors,counseling_sentence,public_status,source_sheet,source_no,source_text,status,created_at,updated_at,import_batch_id
       FROM success_cases
       WHERE status = 'active' AND (${where})
       ORDER BY updated_at DESC
       LIMIT $${params.length + 1}`,
      [...params, Math.max(limit * 4, limit)]
    );
    const cases = result.rows
      .map((row) => ({ id: row.id, case: legacyCase(row), score: searchScore(row, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.case['현재직업']).localeCompare(String(b.case['현재직업']), 'ko'))
      .slice(0, limit);
    return res.json({ cases });
  } catch (err) {
    console.error('[success-cases-search-error]', err);
    return res.status(500).json({ error: { message: 'Could not search success cases' } });
  }
});

router.get('/success-cases/admin', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.json({ cases: [] });
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    const result = await db.query(
      `SELECT id,source_org,source_year,person_name,serial_no,current_job,previous_career,cert_training,preparation,activities,transition_type,recommended_target,keywords,success_factors,counseling_sentence,public_status,source_sheet,source_no,source_text,status,created_at,updated_at,import_batch_id
       FROM success_cases
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ cases: result.rows.map(adminCase) });
  } catch (err) {
    console.error('[success-cases-admin-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list success cases' } });
  }
});

router.get('/success-cases/import-batches', authRequired, adminRequired, async (_req, res) => {
  try {
    if (!db.enabled) return res.json({ batches: [] });
    const result = await db.query(
      `SELECT id,file_name,file_mime_type,file_size,(file_data IS NOT NULL) AS has_file,total_rows,inserted_count,updated_count,skipped_count,error_count,imported_by,imported_at,errors
       FROM success_case_import_batches
       ORDER BY imported_at DESC
       LIMIT 50`
    );
    return res.json({ batches: result.rows });
  } catch (err) {
    console.error('[success-case-batches-error]', err);
    return res.status(500).json({ error: { message: 'Could not list import batches' } });
  }
});

router.get('/success-cases/import-batches/:id/file', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const id = cleanText(req.params.id, 80);
    if (!id) return res.status(400).json({ error: { message: 'Import batch id is required' } });
    const result = await db.query(
      `SELECT file_name,file_mime_type,file_data
       FROM success_case_import_batches
       WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: { message: 'Import batch not found' } });
    if (!row.file_data) return res.status(404).json({ error: { message: 'Stored import file not found' } });
    const fileName = row.file_name || `success-cases-${id}.xlsx`;
    res.setHeader('Content-Type', row.file_mime_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(row.file_data);
  } catch (err) {
    console.error('[success-case-batch-file-download-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

router.delete('/success-cases/import-batches/:id/file', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const id = cleanText(req.params.id, 80);
    if (!id) return res.status(400).json({ error: { message: 'Import batch id is required' } });
    const result = await db.query(
      `UPDATE success_case_import_batches
       SET file_data = NULL, file_mime_type = NULL, file_size = NULL
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: { message: 'Import batch not found' } });
    return res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[success-case-batch-file-delete-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

router.put('/success-cases/:id', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const id = cleanText(req.params.id, 80);
    if (!id) return res.status(400).json({ error: { message: 'Success case id is required' } });

    const item = normalizeSuccessCase(req.body || {});
    const result = await db.query(
      `UPDATE success_cases
       SET
         source_org = $1,
         source_year = $2,
         person_name = $3,
         serial_no = $4,
         current_job = $5,
         previous_career = $6,
         cert_training = $7,
         preparation = $8,
         activities = $9,
         transition_type = $10,
         recommended_target = $11,
         keywords = $12,
         success_factors = $13,
         counseling_sentence = $14,
         public_status = $15,
         source_sheet = $16,
         source_no = $17,
         source_text = $18,
         status = $19,
         search_text = $20,
         raw_data = $21::jsonb,
         updated_at = now()
       WHERE id = $22
       RETURNING id,source_org,source_year,person_name,serial_no,current_job,previous_career,cert_training,preparation,activities,transition_type,recommended_target,keywords,success_factors,counseling_sentence,public_status,source_sheet,source_no,source_text,status,created_at,updated_at,import_batch_id`,
      [
        item.sourceOrg || null,
        item.sourceYear,
        item.personName || null,
        item.serialNo || null,
        item.currentJob,
        item.previousCareer || null,
        item.certTraining || null,
        item.preparation || null,
        item.activities || null,
        item.transitionType || null,
        item.recommendedTarget || null,
        item.keywords || null,
        item.successFactors || null,
        item.counselingSentence || null,
        item.publicStatus || null,
        item.sourceSheet || null,
        item.sourceNo || null,
        item.sourceText || null,
        item.status,
        item.searchText,
        JSON.stringify(item.rawData),
        id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: { message: 'Success case not found' } });
    return res.json({ case: adminCase(result.rows[0]) });
  } catch (err) {
    console.error('[success-cases-update-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

router.delete('/success-cases/:id', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const id = cleanText(req.params.id, 80);
    if (!id) return res.status(400).json({ error: { message: 'Success case id is required' } });
    const result = await db.query('DELETE FROM success_cases WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: { message: 'Success case not found' } });
    return res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[success-cases-delete-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

router.post('/success-cases/import', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const rows = Array.isArray(req.body?.cases) ? req.body.cases : [];
    const fileName = cleanText(req.body?.fileName || req.body?.file_name || '', 300);
    const file = req.body?.file && typeof req.body.file === 'object' ? req.body.file : {};
    const fileDataBase64 = typeof file.dataBase64 === 'string' ? file.dataBase64 : '';
    const fileBuffer = fileDataBase64 ? Buffer.from(fileDataBase64, 'base64') : null;
    const fileMimeType = cleanText(file.mimeType || file.type || '', 200);
    const fileSize = Number(file.size) || (fileBuffer ? fileBuffer.length : null);
    if (!rows.length) return res.status(400).json({ error: { message: 'No success cases provided' } });

    const batchResult = await db.query(
      `INSERT INTO success_case_import_batches (file_name,total_rows,imported_by,file_mime_type,file_size,file_data)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [fileName || null, rows.length, req.user?.accountId || null, fileMimeType || null, fileSize, fileBuffer]
    );
    const batchId = batchResult.rows[0].id;
    const errors = [];
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      try {
        const item = normalizeSuccessCase(rows[index]);
        const result = await db.query(
          `INSERT INTO success_cases (
             source_org,source_year,person_name,serial_no,current_job,previous_career,cert_training,preparation,activities,transition_type,recommended_target,keywords,success_factors,counseling_sentence,public_status,source_sheet,source_no,source_text,status,search_text,raw_data,import_batch_id
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22
           )
           RETURNING id`,
          [
            item.sourceOrg || null,
            item.sourceYear,
            item.personName || null,
            item.serialNo || null,
            item.currentJob,
            item.previousCareer || null,
            item.certTraining || null,
            item.preparation || null,
            item.activities || null,
            item.transitionType || null,
            item.recommendedTarget || null,
            item.keywords || null,
            item.successFactors || null,
            item.counselingSentence || null,
            item.publicStatus || null,
            item.sourceSheet || null,
            item.sourceNo || null,
            item.sourceText || null,
            item.status,
            item.searchText,
            JSON.stringify(item.rawData),
            batchId
          ]
        );
        if (result.rows[0]?.id) insertedCount += 1;
      } catch (err) {
        skippedCount += 1;
        errors.push({ row: index + 1, message: String(err.message || err).slice(0, 500) });
      }
    }

    await db.query(
      `UPDATE success_case_import_batches
       SET inserted_count = $1, updated_count = $2, skipped_count = $3, error_count = $4, errors = $5::jsonb
       WHERE id = $6`,
      [insertedCount, updatedCount, skippedCount, errors.length, JSON.stringify(errors), batchId]
    );

    return res.json({
      success: true,
      batchId,
      totalRows: rows.length,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors
    });
  } catch (err) {
    console.error('[success-cases-import-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

module.exports = router;
