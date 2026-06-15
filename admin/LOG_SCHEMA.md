# Usage Event Schema

## 저장소
계정 저장소

- ai_career_accounts_v1

사용 이벤트 저장소

- ai_career_usage_events_v1

레거시 저장소

- ai_career_report_index_v2

---

## Usage Event 구조

```
{
  eventName: string,
  payload: object,
  recordedAt: string
}
```

---

## eventName 목록

### report_generation_started
설명:
리포트 생성 시작

payload

```
{
  reportType,
  counselorId,
  counselorName
}
```

---

### report_generation_succeeded
설명:
리포트 생성 성공

payload

```
{
  reportType,
  durationMs,
  counselorId,
  counselorName
}
```

---

### report_generation_failed
설명:
리포트 생성 실패

payload

```
{
  reportType,
  durationMs,
  counselorId,
  counselorName,
  reason,
  errorName
}
```

---

### ai_request_succeeded
설명:
Gemini API 호출 성공

payload

```
{
  durationMs,
  status
}
```

---

### ai_request_failed
설명:
Gemini API 호출 실패

payload

```
{
  durationMs,
  status,
  errorName
}
```

---

## 관리자페이지 사용 규칙
관리자페이지는 리포트 본문을 읽지 않는다.

관리자페이지는 ai_career_usage_events_v1만 읽는다.

통계는 usage event 기반으로 계산한다.

---

## 유지보수 원칙
새 리포트 추가 시:

1. reportType 추가
2. report_generation_started 기록
3. report_generation_succeeded 기록
4. report_generation_failed 기록

기존 통계 로직은 수정하지 않는다.

eventName 규칙을 유지한다.
