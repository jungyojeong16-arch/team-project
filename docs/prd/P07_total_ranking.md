# P07 통합 랭킹

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (11/17주) |
| Figma | [통합 랭킹](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-6421) |
| 코드(예정) | `backend/core/management/commands/build_rankings.py`, `views.py`(rankings), `app/ranking/page.tsx` |
| 테이블 | `ranking`(content, period, ranked_on, rank (+score, D7)), `content`, `rating` |
| 검수 | 정준교(집계 방법·DB), 정재준(화면) |

## 1. 목적
여러 OTT에 흩어진 인기 작품을 **하나의 순위표(TOP 100)** 로 보여 준다.

## 2. 사용자 이야기
- 회원으로서, OTT마다 따로 찾지 않고 지금 모두가 보는 작품을 한 번에 보고 싶다.
- 회원으로서, 지난주보다 순위가 오른 작품, 새로 들어온 작품을 알고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 주간 · 월간 탭 | 필수 |
| FR2 | 필터: 전체/영화/시리즈, OTT(전체 + 6개), 장르(모든 장르 + 12개). 필터를 걸면 조건에 맞는 작품만 1위부터 다시 번호를 매김 | 필수 |
| FR3 | "먼저 만나보는 TOP 3" 큰 카드 (유형·장르·연도·지수·OTT) | 필수 |
| FR4 | 1~20위 먼저, [펼치기]로 21–40, 41–60, 61–80, 81–100 | 필수 |
| FR5 | 순위 변동: 지난 집계 대비 ↑n / ↓n / — / NEW | 필수 |
| FR6 | ViewFit 지수(0~100) 표시 | 필수 (D7) |
| FR7 | 작품 클릭 → 상세 팝업(P06), [맨 위로] | 필수 |
| FR8 | 집계 명령 `python manage.py build_rankings --period weekly|monthly` | 필수 |

### ViewFit 지수 계산 (처음 제안 — 팀 검토)
```
지수 = 70 × (TMDB 인기도 순위 백분위) + 30 × (ViewFit 보정 평점 / 5)
ViewFit 보정 평점 = (평가 수 × 평균 + 5 × 전체 평균) / (평가 수 + 5)   ← 평가가 1~2개뿐인 작품이 1위가 되는 것 방지
```
- 지금은 회원 평점이 적어서 TMDB 인기도 비중을 크게 둔다. 사용자가 늘면 비중을 조정한다.
- 결과 상위 100개를 `ranking`에 (period, ranked_on=집계일, rank, score)로 저장한다.

## 4. 데이터 · API
`GET /api/v1/rankings/?period=weekly&type=movie&platform=NETFLIX&genre=드라마&offset=0&limit=20`

응답: `{period, ranked_on, total, items:[{rank, rank_change, is_new, score, content:{id,title,content_type,release_year,poster_url,genres,platforms}}]}`

- 변동 = (지난 집계일 순위) − (이번 순위). 지난 집계에 없으면 `is_new=true`.
- 같은 날 다시 집계하면 그날 행을 지우고 새로 저장 (DB 중복 금지 규칙: (period, ranked_on, rank), (period, ranked_on, content)).

## 5. 규칙 · 예외
- 집계가 한 번도 없으면 "아직 랭킹을 집계하지 않았어요" 안내.
- 로그인 없이도 볼 수 있다.
- Figma의 "샘플 지수/가상 예시" 문구는 실제 데이터로 바뀌면 "ViewFit 지수 · 집계일 기준"으로 바꾼다.

## 6. 완료 기준
- [ ] `build_rankings --period weekly` 실행 → `ranking` 표에 100행
- [ ] 화면 1위가 표의 rank=1 작품과 같다
- [ ] 다음 날짜로 한 번 더 집계 → 변동 화살표·NEW가 표시된다
- [ ] 영화 + 넷플릭스 필터 → 넷플릭스 영화만, 1위부터 다시 번호
- [ ] [펼치기]로 100위까지 보인다
- [ ] 화면이 Figma 144:6421 과 같다

## 7. 범위 밖
- OTT별 공식 순위 가져오기 (공개 API 없음), 실시간(시간 단위) 집계

## 8. 바이브 코딩 프롬프트
### Step 1 — (D7 승인 후) ranking.score 칸
```
DB 담당이 D7 을 승인했어. ranking 테이블에 score DECIMAL(5,1) 칸을 추가하는 migration 을 만들고,
docs/erd/ViewFit_ERD_physical.md 의 ranking 칸 목록에 score 와 '집계 당시 값이라 저장' 이유를 적어 줘.
```
### Step 2 — 집계 명령
```
docs/prd/P07_total_ranking.md 의 FR8 과 'ViewFit 지수 계산' 을 구현해 줘.
build_rankings 명령이 TMDB 인기도(P04 의 tmdb.py 사용)와 rating 평균으로 지수를 계산해 상위 100개를 저장하게 해 줘.
--date 옵션으로 집계일을 바꿀 수 있게 해서 변동 테스트가 가능하게 해 줘.
tests.py 에 '두 날짜 집계 → 변동·NEW 계산' 테스트를 추가해 줘.
```
### Step 3 — 랭킹 API
```
docs/prd/P07_total_ranking.md 4번의 GET /api/v1/rankings/ 를 만들어 줘. 필터를 걸면 조건에 맞는 작품만 1부터 다시 번호를 매기고,
rank_change 는 전체 순위 기준으로 계산해. offset/limit 으로 20개씩 받을 수 있게 해 줘.
```
### Step 4 — 화면
```
Figma 노드 144:6421 "통합 랭킹" 을 app/ranking/page.tsx 로 만들어 줘.
주간/월간 탭, 필터(영화·시리즈, OTT, 장르), TOP 3 카드, 1–20위 목록, [펼치기]로 20개씩, [맨 위로].
'샘플' 문구는 'ViewFit 지수 · {집계일} 기준' 으로 바꾸고, 작품을 누르면 P06 상세 팝업을 열어 줘.
상단 메뉴 '통합 랭킹' 과 홈의 [전체보기] 를 이 페이지로 연결해 줘.
```
