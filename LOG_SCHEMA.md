## tokenUsage 연결 계획

현재 상태:
- usageMetadata를 normalizeTokenUsage()로 표준화하는 함수는 존재한다.
- usage event payload는 tokenUsage 저장을 허용한다.
- 하지만 현재 report_generation_succeeded 이벤트에는 tokenUsage가 아직 연결되어 있지 않다.

수집 가능 위치:
- generateGeminiJobAnalysis()
- requestGeminiNoTargetJobReportData()
- requestGeminiTargetInterestReportData()
- requestGeminiSuccessAnalysis()

권장 연결 방식:
```text
data.usageMetadata
→ normalizeTokenUsage()
→ 생성 결과의 tokenUsage로 반환
→ 모듈 generate()에서 반환
→ report_generation_succeeded payload에 tokenUsage 추가
```
