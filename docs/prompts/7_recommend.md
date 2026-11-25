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

### 기록 3 — 7-2 Step 1~2 (재방문 피드백 API · 팝업 화면)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/22 |
| 보낸 프롬프트 | "7-2 해보자" → AI가 PRD 7-2 Step 1~2 순서대로 진행. PRD에 없던 결정 1개는 AI가 물어보고 홍준화가 고름: "아직 못 봤어요"라고 답한 작품을 다음 맞춤 추천에 **다시 넣기** |
| 기준 PRD | 7-2 [8. 바이브 코딩 프롬프트](../prd/7-2_revisit_feedback.md) **Step 1** API(팝업 조건, 12시간 = `FEEDBACK_DELAY_HOURS`, 5-1 과 같은 평점 저장, 테스트) · **Step 2** 팝업 화면(Figma 145:2341, 반 별 클릭·키보드, sessionStorage) |
| AI가 한 일 | `backend/core/feedback.py`(조건·저장), `views.py`·`urls.py` 7-2 구역 API 2개, 평점 저장 `common.save_rating()`·입력 검사 `serializers.RatingInputSerializer`(5-1 이 아직 없어서 공용으로 만듦), 7-1 `load_taste` 에 못 봤어요 규칙, `app/_components/feedback-modal.tsx`·`app/_lib/feedback.ts`, Figma 별·라디오 그림 `public/images/feedback/`, `Modal` 에 `frameClassName` 옵션. PRD에 정해지지 않았던 것: [바로 보기]는 추천을 받은 뒤 누른 것만 셈, 답은 같은 작품의 pending 행 모두에 적용, 이미 답한 추천은 400 → PRD에 적음 |
| 결과 | 커밋 [`e442e93`](https://github.com/jungyojeong16-arch/team-project/commit/e442e93) |
| 확인 | 자동 테스트 7개(전체 74개 통과) + 브라우저(홍준화 PC, 테스트 계정에 13시간 전 클릭 기록을 넣어 확인) <br> - [x] [바로 보기] 뒤 새로고침 → 팝업 (가장 최근에 누른 작품) <br> - [x] 3.5점 + 한마디 → `rating` 3.5, `feedback=rated` <br> - [x] 못 봤어요 → `feedback=not_watched`, `rating` 행 없음, 다음 추천 후보로 돌아옴 <br> - [x] 나중에 할게요 → 같은 방문 중엔 안 뜨고 브라우저 다시 열면 뜸 <br> - [x] 별점·못 봤어요 없이 보내기 → "별점을 선택해 주세요." <br> - [ ] 정재준 화면 검수 (너비 600·여백 32·모서리 20·별 44px 은 Figma 와 같음, 375px 넘침 없음) |
| 수정 요청 | 홍준화의 수정 요청은 없음. AI가 확인하다 고친 것: 머리줄↔질문 간격이 10px(Figma 18px)로 나옴 → margin 겹침 때문이라 padding 으로. Figma 와 다르게 한 것: 작품 줄 추가(PRD FR1 작품 이름), 입력 칸 둘째 줄 "추천 작품에 반영됩니다" → "남긴 글은 내 평점과 함께 저장돼요"(한마디는 추천 계산에 안 쓰임) |

### 기록 4 — 추천 정확도 확인 ② 숨겨 두고 맞히기 (교수님 지적 4번)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/25 |
| 보낸 프롬프트 | "1번 추천대로 ㄱㄱ" — 앞에서 AI가 정준교의 제안 문서(`docs/presentation/추천 정확도 기준과 확인 방법.md`)를 읽고 "③ 실제 사람 평가는 구글 폼으로, ② 숨겨 두고 맞히기는 확인 명령을 만들자"고 추천한 데 대한 답. 목표 숫자(적중 6/10, 별점 평균 3.5, 4점 이상 60%)는 제안값 그대로 |
| 기준 PRD | 7-1 추천 점수(처음 버전)를 그대로 평가 — PRD 기능 추가는 없음. 정확도 문서 2번 ② 단계 |
| AI가 한 일 | `python manage.py recommend_accuracy` — 가상 회원이 4점 이상 준 작품을 하나씩 숨기고(평점·좋아요·시청 기록을 transaction 안에서 지웠다가 되돌림) 7-1 `rank_contents` 로 순서를 다시 계산, 숨긴 작품이 TOP 10 안이면 적중. 같은 후보 안에서 통합 랭킹 순·무작위와 비교, 평균 순위도 출력. 테스트 `RecommendAccuracyTests` 3개. 문서: 정확도 문서에 결정·결과, `backend/README.md` 명령 안내 |
| 결과 | 커밋 [`554eb03`](https://github.com/jungyojeong16-arch/team-project/commit/554eb03) · `backend/core/management/commands/recommend_accuracy.py`, `tests.py`, `backend/README.md` |
| 확인 | 홍준화 PC(SQLite, 작품 200 · 가상 회원 60 · 794번 숨김) <br> - [x] TOP 10 적중률 맞춤 추천 **13.4%** > 통합 랭킹 순 8.6% > 무작위 5.9% (TOP 20: 25.1% · 14.6% · 11.8%) <br> - [x] 숨긴 작품 평균 순위 맞춤 추천 54위 · 통합 랭킹 순 78위 (후보 평균 169개) <br> - [x] 실행 전후 평점 1,852 · 좋아요 388 · 추천 300행 그대로 (DB 안 바뀜) <br> - [x] `python manage.py test core` 92개 통과 <br> - [ ] 서버(MariaDB)에서 한 번 더 |
| 수정 요청 | 홍준화의 수정 요청은 없음. AI가 돌려 보다 바꾼 것: 처음에는 문서대로 회원마다 1개만 숨겼는데(60번), seed 에 따라 적중률이 5~17% 로 흔들리고 통합 랭킹 순보다 낮은 경우도 나옴 → 4점 이상 평점을 모두 숨기는 방식(794번, 항상 같은 결과)으로 바꾸고 문서에 이유를 적음 |
