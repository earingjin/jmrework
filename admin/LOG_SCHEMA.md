# 관리자 통계 스키마

관리자페이지는 리포트 본문을 읽지 않고 `usage_events`만 집계한다.

## 현재 리포트 이벤트

- `report_generation_started`: 리포트 생성 시작
- `report_generation_completed`: 리포트 생성 완료

`report_generation_completed.payload.finalStatus` 값으로 최종 상태를 구분한다.

```json
{
  "finalStatus": "SUCCESS | RECOVERED_SUCCESS | FAILED",
  "reportType": "interest | success",
  "durationMs": 0,
  "modelName": "gemini-2.5-flash",
  "errorType": "NONE | JSON_PARSE_ERROR | RATE_LIMIT | ...",
  "retryCount": 0,
  "retryReason": "NONE | JSON_PARSE_ERROR | RATE_LIMIT | ...",
  "recoveryType": "NONE | CODE_REPAIR | AI_JSON_REPAIR | FULL_REGENERATION | RETRY_SUCCESS",
  "tokenUsage": {
    "promptTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "thoughtsTokens": 0
  },
  "branch": "지사명"
}
```

## 레거시 이벤트 호환

기존 데이터의 아래 이벤트도 계속 집계한다.

- `report_generation_succeeded` → `SUCCESS`
- `report_generation_failed` → `FAILED`

레거시 이벤트에 `tokenUsage`, `retryCount`, `finalStatus`가 없으면 기본값으로 집계한다.

## 관리자페이지 집계 기준

- 전체 생성 건수
- 리포트 종류별 성공/실패/토큰/평균 시간
- 모델별 성공/실패/토큰/평균 시간
- 지사별 성공/실패/토큰/평균 시간
- 오류 유형별 발생/복구/실패
- Gemini 서버 오류
