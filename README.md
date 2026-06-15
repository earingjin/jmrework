# RE:WORK CENTER

Gemini 요청은 브라우저에서 직접 전송하지 않고, 같은 도메인의 Express 프록시인 `POST /api/gemini`를 통해 전송됩니다. API 키는 서버 환경변수에서만 읽습니다.

## 실행 방법

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. `.env.example`을 복사해 `.env`를 만들고 실제 키를 입력합니다.

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

3. 서버를 실행합니다.

   ```bash
   npm start
   ```

4. 브라우저에서 `http://localhost:3000`에 접속합니다.

실제 `.env` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다. 배포 환경에서는 배포 서비스의 환경변수 설정에 `GEMINI_API_KEY`를 등록하세요.
