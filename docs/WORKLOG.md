# ViewFit 작업 일지 (팀 공용)

**누가 Claude로 무엇을 했는지** 모아 두는 곳입니다. 세 사람의 Claude는 서로의 대화를 볼 수 없어서, 이 파일이 유일한 연결 고리입니다.
- 작업을 **시작할 때**: 맨 위 10개 항목을 읽기 (Claude가 `CLAUDE.md` 안내대로 자동으로 읽음)
- 작업을 **끝낼 때**: 맨 위에 항목 추가 → 커밋 → push
- 최신이 맨 위. 날짜는 한국 시간. 양식은 `CLAUDE.md` 2번 참고.

> 11/21 이전 항목은 GitHub 커밋 기록으로 정리했습니다. 커밋에 요청한 사람이 적혀 있지 않은 것은 "요청: 기록 없음"으로 두었습니다 — 본인 작업이면 이름을 채워 주세요.

---

### 11/23 · 0-4 홈 PRD 규칙 2개 (설문 안내 · 오류 안내) · 요청: 홍준화
- 한 일: 설문을 안 한 회원은 오늘의 추천 자리에 "취향을 알려주시면 딱 맞는 작품을 골라 드릴게요 [설문하기]"(`SurveyPrompt`, `app/_components/home/today-pick.tsx`). 홈 API 가 실패(404·연결 실패)하면 샘플 데이터 대신 오류 안내 + [다시 시도] (`fetchHomeFeed` 의 TODO(11/17) 대체 처리 삭제)
- 커밋: `4b4ba24`
- 확인: 타입 검사 통과. 홍준화 PC 브라우저: 설문 안 함 → 설문 안내·[설문하기] → `/onboarding`, 홈 피드 요청 실패 → "서버에 연결할 수 없어요…" + [다시 시도] → 다시 누르면 정상
- 남은 일·주의: **백엔드 서버가 꺼져 있으면 이제 홈이 샘플 대신 오류 안내를 보여 줌** (예전처럼 "폭싹 속았수다" 샘플이 보이면 `.env.local` 이 없는 것). `fetchContent`(4-1 작품 상세)에도 같은 TODO(11/17) 대체 처리가 남아 있음 — 4-1 담당(정재준) 확인 필요. 이 상태의 Figma 화면은 없어서 정재준 검수 때 같이 봐 주기

### 11/22 · 7-2 재방문 추천 피드백 (Step 1~2) · 요청: 홍준화
- 한 일: 추천받은 작품을 [바로 보기]로 열고 12시간 뒤 홈에 오면 "이번 작품은 어떠셨나요?" 팝업(Figma 145:2341). 별점 0.5 단위 → 평점 저장 + `feedback=rated`, "아직 못 봤어요" → `feedback=not_watched`, [나중에 할게요]는 이번 방문 동안 안 뜸. `backend/core/feedback.py`, API `GET /api/v1/recommendations/pending-feedback/`·`POST /api/v1/recommendations/<id>/feedback/`, 화면 `app/_components/feedback-modal.tsx`(홈 `app/page.tsx` 에서 띄움)
- **5-1(정준교) 참고**: 평점 저장 `common.save_rating()`(한 작품 1개·다시 하면 수정)과 입력 검사 `serializers.RatingInputSerializer`(0.5 단위·한마디 200자, 한국어 오류)를 만들어 둠 → 5-1 평점 PUT 에서 그대로 쓰면 같은 규칙
- 공용 파일: `Modal` 에 `frameClassName` 옵션(기본값 그대로), `viewfit.ts` 의 `authHeader`·`getWithLogin` 을 export, `settings.FEEDBACK_DELAY_HOURS`(`.env.example` 에 설명)
- 7-1 규칙 추가(홍준화 결정): "아직 못 봤어요" 작품은 [바로 보기] 기록이 있어도 다시 추천 후보
- 커밋: `e442e93`
- 확인: 테스트 74개 통과, 타입 검사 통과. 홍준화 PC 브라우저: 3.5점 + 한마디 → `rating` 3.5·`rated`, 못 봤어요 → 평점 없음·`not_watched`, 나중에 할게요 → 새로고침해도 안 뜨고 브라우저 다시 열면 뜸, 375px 화면 넘침 없음
- 남은 일·주의: 화면 검수(정재준). 손으로 확인하려면 `backend/.env` 에 `FEEDBACK_DELAY_HOURS=0.02`(약 1분) 넣고 서버 다시 켜기

### 11/22 · 0-4 홈 오늘의 추천 문구를 설문 답으로 · 요청: 홍준화
- 한 일: 설문을 마친 회원의 오늘의 추천 칩을 시간대 상황 이름("주말에 함께") 대신 **직업 + 요일**로("저녁 · 과제 끝난 금요일 밤", Figma 예시와 같은 모양), 한 줄은 **기억에 남는 작품 → 선호 장르 → 취향 점수 1위** 순서로 설문 답과 겹치는 것, 태그는 작품 장르(선호 장르 먼저). `backend/core/home.py` 의 `member_moment`·`taste_headline`·`taste_tags` (직업별 말은 `JOB_MOMENTS` 표 한 곳에서 고침)
- 이유: 홈 칩은 "저녁 · 주말에 함께"인데 한 줄은 "혼자 보는 밤에 어울리는 …"으로 서로 어긋났음
- 커밋: `db87a8e`
- 확인: 테스트 67개 통과. 홍준화 PC 실제 데이터: "저녁 · 과제 없는 일요일" / "20대 학생 ○○님, 스릴러·SF 좋아하는 취향에 딱 맞는 한 편"
- 남은 일·주의: 오늘의 추천 **작품**은 그대로 7-1 맞춤 추천 1위. 설문 안 한 회원·손님은 예전 그대로. 화면 코드는 안 바뀜(`tpo.situation`·`headline`·`mood_tags` 값만 바뀜)

### 11/22 · 7-1 맞춤 추천 (Step 1~4) · 요청: 홍준화
- 한 일: 취향 점수로 회원×상황 TOP 50을 `recommendation`에 저장(`backend/core/recommend.py`), 상황 라벨·한 줄 이유 문장 틀(`backend/core/curation.py`, D10 — LLM 없음), `GET /api/v1/recommendations/`·`POST /api/v1/recommendations/refresh/`, 화면 `/recommend`(Figma 144:36577), 홈 오늘의 추천 = 맞춤 추천 1위
- DB: `recommendation.reason` 칸 추가(D9, migration `0005`, 정준교 확인) → **받은 뒤 `python manage.py migrate` 필요**
- 공용 부품: `TopPickCard`(plainLabel·note), `RangeHeader`(accent·note), `filter-bar.tsx`의 `ChipGroup`, `viewfit.ts`의 `fetchRecommendations` — 선택 옵션만 추가해서 기존 화면은 그대로 (통합 랭킹 화면 확인)
- 커밋: `398859e` (11/19 작업을 6-1 위에 합침 — `home.py`·`views.py`·`tests.py` 두 작업 모두 살림), 기록 `docs/prompts/7_recommend.md`
- 확인: 테스트 65개 통과(SQLite), 타입 검사 통과. 홍준화 PC에서 실제 작품 200편으로 홈 오늘의 추천 = 맞춤 추천 1위, 홈 TOP 10 = 통합 랭킹 1~10위
- 남은 일·주의: 화면 검수(정재준). 8-1 취향 수정·8-2에서 추천을 새로 만들 때는 `POST /api/v1/recommendations/refresh/` 를 부르면 됨. 다음은 7-2 재방문 피드백(11/26)

### 11/21 · 팀 작업 안내 `CLAUDE.md` + 작업 일지 · 요청: 정준교
- 한 일: 팀원 Claude가 작업 전에 읽을 안내(`CLAUDE.md`)와 이 작업 일지(`docs/WORKLOG.md`)를 만듦
- 확인: 문서만 바뀜
- 남은 일·주의: **앞으로 작업이 끝나면 이 파일 맨 위에 항목을 꼭 추가**

### 11/21 · 1-2 로그인 오류 수정 · 요청: 정준교
- 한 일: 저장된 로그인 토큰이 DB에 없으면(예: DB를 새로 만듦) 홈이 "HTTP 401"로 멈추던 문제 → 로그인 정보를 지우고 웹 시작 화면으로 (`app/_lib/viewfit.ts`)
- 커밋: `be7cc12`
- 남은 일·주의: DB를 새로 만들었다면 예전 회원은 없으니 새로 가입하거나 `createsuperuser`

### 11/21 · 6-1 통합 랭킹 (Step 2~4) · 요청: 정준교
- 한 일: ViewFit 지수 계산·저장(`backend/core/ranking.py`), 집계 명령 `build_rankings`, `GET /api/v1/rankings/`, 화면 `/ranking`(Figma 144:6421), 홈 TOP 10을 주간 랭킹으로 교체
- 커밋: `8804b70`, 기록 `4a17b01`, 확인 `c86472a`
- 확인: 테스트 51개 통과(SQLite·MariaDB), 정준교 PC에서 실제 TMDB 작품으로 통합 랭킹 TOP 10 = 홈 TOP 10
- 남은 일·주의: 화면 검수(정재준). 주간 = 최근 7일 평점, 월간 = 최근 30일. 다음은 6-2 세대별 랭킹

### 11/17 · 3-1 취향 설문 (Figma 39:3071) · 요청: 홍준화
- 한 일: 한 화면 5문항, 기억에 남는 작품 검색·등록·삭제 → `watch_history`(source=survey), 수면·생활 패턴·스트레스 질문 삭제
- 커밋: `27c031a`
- 남은 일·주의: 화면 검수(정재준)

### 11/17 · 4-1 작품 상세 팝업 + 0-4 홈 피드 API · 요청: 홍준화
- 한 일: 작품 검색·상세·바로 보기 API(`views.py` 4-1 구역), 홈 피드 API(`backend/core/home.py`), 작품 상세 공통 팝업(`app/_components/content-detail-modal.tsx`, Figma 375:1666)
- 커밋: `8b0a6c3`, `0298c41`
- 남은 일·주의: **상단 검색창 화면(4-1 FR1·FR6)은 아직 없음.** 정재준의 브랜치 `jaejun/4-1-search`(커밋 `d8de531`)에도 같은 검색·상세 API가 따로 있음 → 합치지 말고 공용 브랜치 위에서 검색창 화면만 이어서 하기

### 11/17 · 2-1 작품 데이터 수집 + 0번 백엔드 공통 규칙 · 요청: 홍준화
- 한 일: `backend/core/tmdb.py`, 명령 `import_tmdb`·`seed_demo`, 공통 목록 규칙 `backend/core/common.py`, `GET /api/v1/contents/`
- 커밋: `4afba5f`, `9cda9f9`, `6eab85c`
- 남은 일·주의: 각자 PC에서 `import_tmdb` 실행 필요 (정준교 ✅ 11/21)

### 11/17 · 0-1 DB 칸 추가 (D6·D7) + TMDB 키 형식 수정 · 요청: 정준교
- 한 일: `content` 에 배경 이미지·관람 등급·상영 시간·회차·TMDB 평점·평가 수, `ranking.score` (migration `0004`). TMDB 짧은 API 키도 동작하게
- 커밋: `451b5ff`, `93c9752`, `2c8e557`
- 남은 일·주의: 받은 뒤 `python manage.py migrate` 필요

### 11/17 · 담당 재배정·.gitignore · 요청: 홍준화 / 기록 없음
- 한 일: 담당을 0번 3명 공동 · 1·5·6 정준교 · 2·3·7 홍준화 · 4·8 정재준 으로 (`docs/prd/README.md`), 모든 `.env` 를 GitHub에서 제외
- 커밋: `66f12b9`(홍준화), `fb102f0`, `073ae19`

### 11/16 · 1번 회원관리 화면 + 홈을 Figma와 똑같이 · 요청: 정준교
- 한 일: 회원가입(닉네임 중복 확인)·가입 완료·웹 시작 화면·로그인 창, 홈 화면 Figma 9:5 맞춤
- 커밋: `38b42a3`, `fd5f1ca`

### 11/10 · 0번 공통 기반 + 회원가입·로그인·설문 저장 · 요청: 정준교
- 한 일: 공통 상단 바·프로필 메뉴·하단·공통 부품·홈 틀, 회원가입·로그인·설문 API와 MariaDB 저장, PRD 15개 작성
- 커밋: `651d70f`, `2f39ac5`, `b998b00`, `0f04d58`
