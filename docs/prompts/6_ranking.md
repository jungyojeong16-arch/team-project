# 6 랭킹 — 프롬프트 사용 기록

- PRD: [docs/prd/6-1_total_ranking.md](../prd/6-1_total_ranking.md), [docs/prd/6-2_generation_ranking.md](../prd/6-2_generation_ranking.md)
- 요청·확인: 정준교 / 코드 작성: AI(Claude Code)

---

### 기록 1 — 6-1 Step 1 (ranking.score 칸)
0번 기록 7(11/17, D7 반영)과 같은 작업입니다 → [0_common_base.md 기록 7](0_common_base.md)

### 기록 2 — 6-1 Step 2~4 (집계 명령 · 랭킹 API · 화면)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/21 |
| 보낸 프롬프트 | "저번에 한 이후 금일까지 아무것도 못했는데 오늘 좀 하려고 해. 남은 부분 할 수 있게 해줘." → AI가 일정표에서 밀린 6-1(11/20)을 골라 PRD Step 프롬프트대로 진행 |
| 기준 PRD | **6-1 Step 2** ("docs/prd/6-1_total_ranking.md 의 FR8 과 'ViewFit 지수 계산' 을 구현해 줘. build_rankings 명령이 TMDB 인기도(2-1 의 tmdb.py 사용)와 rating 평균으로 지수를 계산해 상위 100개를 저장하게 해 줘. --date 옵션으로 집계일을 바꿀 수 있게 해서 변동 테스트가 가능하게 해 줘. tests.py 에 '두 날짜 집계 → 변동·NEW 계산' 테스트를 추가해 줘.") · **6-1 Step 3** ("docs/prd/6-1_total_ranking.md 4번의 GET /api/v1/rankings/ 를 만들어 줘. 필터를 걸면 조건에 맞는 작품만 1부터 다시 번호를 매기고, rank_change 는 전체 순위 기준으로 계산해. offset/limit 으로 20개씩 받을 수 있게 해 줘.") · **6-1 Step 4** ("Figma 노드 144:6421 "통합 랭킹" 을 app/ranking/page.tsx 로 만들어 줘. 주간/월간 탭, 필터(영화·시리즈, OTT, 장르), TOP 3 카드, 1–20위 목록, [펼치기]로 20개씩, [맨 위로]. '샘플' 문구는 'ViewFit 지수 · {집계일} 기준' 으로 바꾸고, 작품을 누르면 4-1 상세 팝업을 열어 줘. 상단 메뉴 '통합 랭킹' 과 홈의 [전체보기] 를 이 페이지로 연결해 줘.") |
| AI가 한 일 | 지수 계산·저장·순위 변동(`backend/core/ranking.py`), 집계 명령 `build_rankings`(`--period`·`--date`·`--offline`, TMDB 실패 시 TMDB 평가 수로 대신), `GET /api/v1/rankings/`, 화면 `/ranking`(Figma 144:6421 — 0-3 공통 부품 사용, 한 줄 5장), 홈 TOP 10을 주간 랭킹으로 교체. PRD에 정해지지 않았던 것: 주간 = 최근 7일 평점·월간 = 최근 30일 평점, 첫 집계는 변동 '—' 로 정하고 PRD에 적음 |
| 결과 | 커밋 [`8804b70`](https://github.com/jungyojeong16-arch/team-project/commit/8804b70) · `backend/core/ranking.py`, `management/commands/build_rankings.py`, `views.py`, `urls.py`, `home.py`, `tests.py`, `app/_lib/ranking.ts`, `app/ranking/page.tsx` |
| 확인 | 자동 테스트 12개 + 브라우저(가짜 작품 120개·가상 평점으로) <br> - [x] `build_rankings` → `ranking` 100행 <br> - [x] 다른 날짜로 다시 집계 → ↑n ↓n NEW <br> - [x] 같은 날 다시 집계 → 덮어씀(100행 그대로) <br> - [x] 영화 + 넷플릭스 → 17개, 1위부터 다시 번호 <br> - [x] [펼치기] → 21–40위 <br> - [x] 작품 클릭 → 상세 팝업 <br> - [x] `python manage.py test core` 51개 통과 (SQLite·MariaDB) <br> - [x] 정준교 PC에서 실제 TMDB 작품으로 확인 (11/21 — 통합 랭킹 TOP 10과 홈 TOP 10이 같음) <br> - [ ] 정재준 화면 검수 |
| 수정 요청 | Figma는 한 줄에 카드 5장 → 6장으로 나와서 5장으로 맞춤 · 정준교 PC에서 홈이 "HTTP 401"로 멈춤(DB를 새로 만들어 예전 로그인 토큰이 없어짐) → 401이면 로그인 정보를 지우고 시작 화면으로 가도록 수정 [`be7cc12`](https://github.com/jungyojeong16-arch/team-project/commit/be7cc12) |

![통합 랭킹](images/6-1_ranking.png)

### 기록 3 — 6-2 Step 1~2 (세대별 랭킹 API · 화면)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/23 |
| 보낸 프롬프트 | "6-2 시작하자" → AI가 PRD 6-2의 Step 프롬프트대로 진행 |
| 기준 PRD | **6-2 Step 1** ("docs/prd/6-2_generation_ranking.md 4번의 API 를 만들어 줘. rating 의 age_group_at_rating 으로 묶어 평균을 계산하고, 평가 3개 미만은 빼고, 평균 높은 순·같으면 평가 수 많은 순. type/platform/genre 필터와 offset/limit 을 지원해 줘. 결과는 저장하지 마. tests.py 에 '평가 2개 작품 제외', '회원 연령대를 바꿔도 예전 평가는 예전 세대에 남음' 테스트를 추가해 줘.") · **6-2 Step 2** ("Figma 노드 144:33778 "세대별 평점" 을 app/generation/page.tsx 로 만들어 줘. 연령대 탭(처음엔 로그인한 회원의 연령대), 필터, TOP 3 카드, 1–20위, [펼치기] 21–30. 평균은 소수 둘째 자리까지, '샘플 평점' 문구는 '평균 평점 · 평가 3개 이상' 으로 바꾸고, 시연 데이터가 있으면 하단에 '시연용 가상 평점이 포함되어 있어요' 를 보여 줘. 상단 메뉴 '세대별 랭킹' 과 연결해 줘.") |
| AI가 한 일 | 연령대별 평균 계산(`backend/core/ranking.py` `generation_rows`), `GET /api/v1/rankings/generation/`, 화면 `/generation`, 랭킹 위쪽 탭을 공용 부품(`app/_components/ranking-tabs.tsx`)으로 빼서 6-1 화면도 같이 사용. 작품 상세 팝업에서 다른 세대 평균 비교(FR6)는 4-1 팝업에 이미 있어 그대로 연결 |
| 결과 | 커밋 [`1d9e632`](https://github.com/jungyojeong16-arch/team-project/commit/1d9e632) · `backend/core/ranking.py`, `views.py`, `urls.py`, `tests.py`, `app/_lib/ranking.ts`, `app/generation/page.tsx`, `app/_components/ranking-tabs.tsx`, `app/ranking/page.tsx` |
| 확인 | - [x] 테스트 7개 추가, 전체 81개 통과 (MariaDB) <br> - [x] `seed_demo` 데이터로 6개 연령대 1위가 모두 다름 <br> - [x] 20대 1~3위 평균·평가 수 = PRD 4번 SQL 직접 실행 결과 <br> - [x] 40대 탭 → "40대가 높게 평가한 TOP 3", [펼치기] → 21–30위, 상세 팝업, "시연용 가상 평점이 포함되어 있어요" <br> - [ ] 정준교 PC 확인 <br> - [ ] 정재준 화면 검수 |
| 수정 요청 | 없음 |

![세대별 랭킹](images/6-2_generation.png)
