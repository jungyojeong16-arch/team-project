# 6-2 세대별 랭킹(평점)

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (11/24주) |
| Figma | [세대별 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-33778) (상단 메뉴 이름은 "세대별 랭킹") |
| 코드(예정) | `views.py`(generation_rankings), `app/generation/page.tsx` |
| 테이블 | `rating`(score, age_group_at_rating), `content` |
| 담당 | **정준교** (PRD 확정·바이브 코딩) |
| 함께 확인 | 정재준(화면) |

## 1. 목적
같은 작품도 세대마다 평가가 다르다는 점을 보여 주고, **내 또래가 높게 평가한 작품**을 찾게 한다. ViewFit만의 차별 기능이다.

## 2. 사용자 이야기
- 20대 회원으로서, 20대가 높게 평가한 작품 순위를 보고 싶다.
- 회원으로서, 부모님 세대(50대)가 좋아하는 작품도 궁금하다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 연령대 탭: 10대 · 20대 · 30대 · 40대 · 50대 · 60대 이상. 처음엔 **내 연령대**(없으면 20대) | 필수 |
| FR2 | 필터: 전체/영화/시리즈, OTT, 장르 | 필수 |
| FR3 | "OO대가 높게 평가한 TOP 3" 큰 카드 | 필수 |
| FR4 | TOP 30: 1~20위 먼저, [펼치기]로 21–30 | 필수 |
| FR5 | 각 작품: 순위, 제목, 유형·장르·연도, ★ 연령대 평균(소수 둘째 자리), OTT | 필수 |
| FR6 | 작품 클릭 → 상세 팝업(4-1) — 다른 연령대 평균도 비교 | 필수 |

## 4. 데이터 · API
`GET /api/v1/rankings/generation/?age=20s&type=series&platform=TVING&genre=로맨스&offset=0&limit=20`

계산 (저장하지 않고 조회할 때 SQL로):
```sql
SELECT content_id, AVG(score) AS average, COUNT(*) AS count
FROM rating
WHERE age_group_at_rating = '20s'
GROUP BY content_id
HAVING COUNT(*) >= 3          -- 평가 3개 미만은 제외
ORDER BY average DESC, count DESC
LIMIT 30;
```
- **회원 연령대가 아니라 평가할 당시 연령대(age_group_at_rating)** 로 묶는다 → 해가 바뀌어도 과거 평가가 다른 세대로 옮겨 가지 않음 (ERD 원칙 ④).

## 5. 규칙 · 예외
- 조건에 맞는 작품이 30개보다 적으면 있는 만큼만 보여 주고 "아직 평가가 모이고 있어요" 안내.
- 시연 데이터(2-1 FR8)가 섞여 있으면 화면 아래에 "시연용 가상 평점이 포함되어 있어요" 표시 (D12).
- 로그인 없이도 볼 수 있다.

## 6. 완료 기준
- [ ] `seed_demo` 후 세대별 랭킹 → 연령대 탭마다 순위가 다르다
- [ ] 20대 1위 작품의 평균이 HeidiSQL에서 위 SQL로 계산한 값과 같다
- [ ] 평가 2개뿐인 작품은 순위에 없다
- [ ] 회원 연령대를 30대로 바꿔도, 20대일 때 남긴 평점은 20대 순위에 남아 있다
- [ ] 화면이 Figma 144:33778 과 같다

## 7. 범위 밖
- 성별·직업별 랭킹

## 8. 바이브 코딩 프롬프트
### Step 1 — 세대별 랭킹 API
```
docs/prd/6-2_generation_ranking.md 4번의 API 를 만들어 줘.
rating 의 age_group_at_rating 으로 묶어 평균을 계산하고, 평가 3개 미만은 빼고, 평균 높은 순·같으면 평가 수 많은 순.
type/platform/genre 필터와 offset/limit 을 지원해 줘. 결과는 저장하지 마.
tests.py 에 '평가 2개 작품 제외', '회원 연령대를 바꿔도 예전 평가는 예전 세대에 남음' 테스트를 추가해 줘.
```
### Step 2 — 화면
```
Figma 노드 144:33778 "세대별 평점" 을 app/generation/page.tsx 로 만들어 줘.
연령대 탭(처음엔 로그인한 회원의 연령대), 필터, TOP 3 카드, 1–20위, [펼치기] 21–30.
평균은 소수 둘째 자리까지, '샘플 평점' 문구는 '평균 평점 · 평가 3개 이상' 으로 바꾸고,
시연 데이터가 있으면 하단에 '시연용 가상 평점이 포함되어 있어요' 를 보여 줘. 상단 메뉴 '세대별 랭킹' 과 연결해 줘.
```
