# 7 AI 추천 — 프롬프트 사용 기록

- PRD: [docs/prd/7-1_tpo_recommend.md](../prd/7-1_tpo_recommend.md), [docs/prd/7-2_revisit_feedback.md](../prd/7-2_revisit_feedback.md)
- 요청·확인: 홍준화 / 코드 작성: AI(Claude Code)

---

### 기록 1 — 7-1 Step 1~4 (추천 점수 · 한 줄 이유 · 추천 API · 화면)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/19 (11/22 6-1 통합 랭킹과 합친 뒤 다시 확인) |
| 보낸 프롬프트 | "그럴필요는 없고 7-1 해보자" (앞 문장은 정재준 브랜치를 합치지 않는다는 뜻) → AI가 PRD Step 1~4 순서대로 진행. 중간에 AI가 물어본 결정 2개는 홍준화가 고름: **D9** "recommendation.reason 칸 추가", **D10** "지금은 문장 틀만" (LLM 호출 코드는 만들지 않음) |
| 기준 PRD | 7-1 [8. 바이브 코딩 프롬프트](../prd/7-1_tpo_recommend.md) **Step 1** 추천 점수 계산(`build_recommendations`, 비선호·평가·상황 필터 테스트) · **Step 2** 한 줄 큐레이션(FR6 — D10에 따라 LLM 대신 문장 틀, 저장 위치는 D9대로 `recommendation.reason`) · **Step 3** 추천 API 2개 + 홈 hero = 추천 1위 · **Step 4** 화면 Figma 144:36577 |
| AI가 한 일 | 추천 점수(선호 장르 +3, 상황 +4, 좋아한 작품과 장르 겹침 +1 최대 4, 내 연령대 평균)로 회원×상황 TOP 50을 `recommendation`에 저장(`backend/core/recommend.py`), 상황 라벨·한 줄 이유 문장 틀(`backend/core/curation.py`), `recommendation.reason` 칸(migration `0005`, 정준교 확인), `GET /api/v1/recommendations/`·`POST /api/v1/recommendations/refresh/`, 화면 `/recommend`, 홈 오늘의 추천·맞춤 추천작품을 추천 1위·1~10위로 교체. 공통 부품 `TopPickCard`·`RangeHeader`·`ChipGroup`에 선택 옵션 추가(기존 화면 그대로). PRD에 정해지지 않았던 것: 상황·장르 짝 규칙(2-1 상황 규칙 + 가족과 함께 = 코미디), 상황 라벨 문구, 같은 점수일 때 순서(주간 통합 랭킹 → 평가 수), 새 묶음을 만드는 때(하루 첫 방문·설문 다시 저장·새로 만들기), 화면 순위 = 필터 결과 안의 순서 → PRD에 적음 |
| 결과 | 커밋 [`398859e`](https://github.com/jungyojeong16-arch/team-project/commit/398859e) · `backend/core/recommend.py`, `curation.py`, `migrations/0005_recommendation_reason.py`, `models.py`, `views.py`, `urls.py`, `home.py`, `tests.py`, `app/recommend/page.tsx`, `app/_lib/viewfit.ts`, `app/_components/top-pick-card.tsx`·`expand-list.tsx`·`filter-bar.tsx` |
| 확인 | 자동 테스트 14개 + 브라우저(홍준화 PC, 실제 TMDB 작품 200편·가상 평점) <br> - [x] 공포를 비선호로 고른 회원의 추천 50개에 공포 작품 없음 <br> - [x] "혼자 보는 밤" 칩 → 그 상황과 연결된 작품만 <br> - [x] 평점을 남긴 작품은 다음 추천에 안 나옴 <br> - [x] `recommendation`에 오늘 날짜로 50행 (같은 추천일시, rank 1~50) <br> - [x] LLM 키 없이 문장 틀로 나옴 <br> - [x] 홈 오늘의 추천 = 맞춤 추천 1위 (11/22 합친 뒤 다시 확인, 홈 TOP 10 = 통합 랭킹 1~10위도 확인) <br> - [x] `python manage.py test core` 65개 통과 (6-1과 합친 뒤, SQLite) <br> - [ ] 정재준 화면 검수 (Figma의 "샘플 추천·가상 작품" 문구는 실제 추천이라 뺌) |
| 수정 요청 | 홍준화의 수정 요청은 없음. AI가 실제 데이터·브라우저로 확인하다 고친 것: ① 10개 모두 "늦은 밤 · 혼자"이고 상황과 안 맞는 장르 문장("혼자 보는 밤에 어울리는 코미디") → 상황·장르 짝 규칙으로 여러 상황이 섞이게 ② 1000px 화면에서 카드가 한 줄 3장 → 줄바꿈 배치(1440px 5장, 375px 2장) ③ TOP 3 한 줄 이유가 잘림 → 2줄까지. 11/22 6-1과 합칠 때: `home.py`·`views.py`·`tests.py` 충돌을 두 작업 모두 살려 정리, 추천 화면도 6-1의 로그인 오류 처리(`getWithLogin`) 사용 |

### 기록 2 — 홈 오늘의 추천 문구를 설문 답으로 (7-1 홈 연결 · 0-4 FR2)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/22 |
| 보낸 프롬프트 | "홈 멘트는 회원가입할때 물어보는거 반영해서 할순없어?" (AI가 합친 뒤 확인하다 "홈 칩 '저녁 · 주말에 함께'와 한 줄 '혼자 보는 밤에 어울리는 …'이 서로 어긋난다"고 알린 데 대한 답) |
| 기준 PRD | 0-4 FR2 (지금 시간대 문구 예: "저녁 · 과제 끝난 금요일 밤", "20대 대학생 OO님, ~ 보기 좋은 신작" 한 줄) |
| AI가 한 일 | 설문을 마친 회원만: 칩 = 직업 + 요일(`member_moment`, 직업별 말은 `JOB_MOMENTS` 표), 한 줄 = ① 기억에 남는 작품과 장르 겹침 "'인셉션' 좋아하셨다면 딱 맞을 SF 한 편" ② 선호 장르 겹침 "스릴러·SF 좋아하는 취향에 딱 맞는 한 편" ③ "오늘 취향 점수 1위 액션 한 편"(`taste_headline`, 1년 안 작품은 '신작'), 태그 = 작품 장르를 선호 장르부터(`taste_tags`). 오늘의 추천 작품은 그대로 추천 1위 |
| 결과 | 커밋 [`db87a8e`](https://github.com/jungyojeong16-arch/team-project/commit/db87a8e) · `backend/core/home.py`, `tests.py`, `docs/prd/0-4_home.md`, `7-1_tpo_recommend.md` |
| 확인 | - [x] 테스트 2개 추가, `python manage.py test core` 67개 통과 <br> - [x] 금 21시 학생 → "과제 끝난 금요일 밤"(Figma 예시와 같음), 일 18시 학생 → "과제 없는 일요일", 직업 응답 안 함 → 요일만 <br> - [x] 홍준화 PC 실제 데이터: 칩 "저녁 · 과제 없는 일요일", 한 줄 "스릴러·SF 좋아하는 취향에 딱 맞는 한 편", 태그 #스릴러 #SF #액션 |
| 수정 요청 | 없음 |
