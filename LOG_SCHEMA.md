# Usage Event Schema

## tokenUsage 연결 상태

현재 리포트 생성 완료 이벤트는 Gemini `usageMetadata`를 아래 흐름으로 저장한다.

```text
Gemini usageMetadata
→ normalizeTokenUsage()
→ result.tokenUsage
→ report_generation_completed payload.tokenUsage
→ /api/usage-events
→ usage_events.payload
```

## 주요 이벤트

- `report_generation_started`: 리포트 생성 시작
- `report_generation_completed`: 리포트 생성 완료, 성공/복구성공/실패는 `payload.finalStatus`로 구분
- `ai_request_succeeded`: Gemini 요청 성공
- `ai_request_failed`: Gemini 요청 실패

## report_generation_completed payload

```json
{
  "finalStatus": "SUCCESS | RECOVERED_SUCCESS | FAILED",
  "reportType": "interest | success",
  "durationMs": 0,
  "modelName": "gemini-2.5-flash",
  "errorType": "NONE | JSON_PARSE_ERROR | ...",
  "retryCount": 0,
  "retryReason": "NONE | RATE_LIMIT | ...",
  "recoveryType": "NONE | AI_JSON_REPAIR | ...",
  "tokenUsage": {
    "promptTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "thoughtsTokens": 0
  }
}
```

관리자페이지 통계는 리포트 본문을 읽지 않고 `usage_events`만 집계한다.
