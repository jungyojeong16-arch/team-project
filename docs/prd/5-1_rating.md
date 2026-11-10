# 5-1 평점 (작성 · 나의 평점 · 반영 결과)

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (12/1주) — 테이블·규칙(별점 CHECK, 평가 당시 연령대)은 ✅ |
| Figma | [나의 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2672) · [평점 반영 결과 · 랭킹 변화](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=224-4225) |
| 코드(예정) | `views.py`(rate_content, my_ratings, rating_result), `app/me/ratings/page.tsx`, `app/me/ratings/result/[id]/page.tsx` |
| 테이블 | `rating`(member, content, score, comment, age_group_at_rating, rated_at, updated_at), `ranking` |
| 담당 | **정준교** (PRD 확정·바이브 코딩) |
| 함께 확인 | 정재준(화면) |

## 1. 목적
회원이 본 작품에 별점과 감상을 남기고 모아 본다. 이 평점이 세대별 랭킹(6-2)과 통합 랭킹 지수(6-1), 추천(7-1)의 재료가 된다.

## 2. 사용자 이야기
- 회원으로서, 본 작품에 0.5점 단위로 별점과 짧은 감상을 남기고 싶다.
- 회원으로서, 내가 남긴 평점을 한곳에서 보고 고치고 싶다.
- 회원으로서, 내 평가가 랭킹에 어떻게 반영됐는지 보고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 별점 남기기 (상세 팝업 4-1, 피드백 7-2, 나의 평점에서 수정). 0.5~5.0, 0.5 단위 | 필수 |
| FR2 | 감상 한마디 (선택, 200자) | 선택 |
| FR3 | 같은 작품에 다시 평가하면 **기존 평점 수정** (새로 추가 X) | 필수 |
| FR4 | 평가 당시 연령대를 `age_group_at_rating`에 자동 복사 | 필수 ✅ |
| FR5 | **나의 평점** 화면: 프로필 요약(좋아요 수·평점 수·평균), 필터(전체/시리즈/영화, 별점 전체/5점/4점대…), 최근 평가순, 한 페이지 3개 + 페이지 번호 | 필수 |
| FR6 | 각 평점 카드: 포스터, 제목, 연도·장르, 별점, 감상, "10월 5일 평가함", [평점·감상 수정], 삭제 | 필수 |
| FR7 | **평점 반영 결과** 화면: 방금 평가한 작품·별점·감상, 통합 랭킹 현재/이전 순위와 변동, 주변 순위(위·아래 1개), [나의 평점 보기] [통합 랭킹 확인] | 필수 |
| FR8 | 반영 결과 안내: "여러 사용자의 평가를 합산한 집계 변화예요. 내 평점 하나만으로 즉시 바뀌지 않아요." | 필수 |

## 4. 데이터 · API
| 방식 | 주소 | 내용 |
|---|---|---|
| PUT | `/api/v1/contents/{id}/rating/` 🔒 | `{score, comment}` → 없으면 만들고 있으면 수정 |
| DELETE | `/api/v1/contents/{id}/rating/` 🔒 | 내 평점 삭제 |
| GET | `/api/v1/me/ratings/?type=&score=4&sort=recent&page=1` 🔒 | 나의 평점 목록 + 요약 |
| GET | `/api/v1/contents/{id}/rating-result/` 🔒 | 내 평점 + 최근 두 번의 주간 랭킹 순위 + 주변 순위 |

- DB 규칙(이미 적용): `score DECIMAL(2,1)` + CHECK(0.5 단위), `UNIQUE(member, content)`.
- 랭킹 순위는 `ranking`(weekly)의 가장 최근 집계일과 그 전 집계일에서 찾는다. TOP 100 밖이면 "아직 TOP 100 밖이에요".

## 5. 규칙 · 예외
- 4.3처럼 0.5 단위가 아니면 400 (DB도 거부).
- 연령대 "응답 안 함" 회원의 평점은 저장되지만 세대별 랭킹에는 들어가지 않는다 (age_group_at_rating = NULL).
- Figma의 "예시 데이터" 문구는 실제 데이터로 바뀌면 지운다.

## 6. 완료 기준
- [ ] 상세 팝업에서 4.5점 + 감상 → `rating` 1행, `age_group_at_rating` 이 내 연령대
- [ ] 같은 작품에 3.0으로 다시 → 행은 1개 그대로, 점수만 3.0
- [ ] 나의 평점에서 "시리즈" + "4점대" 필터가 맞게 걸린다, 3개씩 페이지가 넘어간다
- [ ] 평가 후 반영 결과 화면 → 현재/이전 순위가 `ranking` 표와 같다
- [ ] `python manage.py test core` 통과 (4.3 거부 테스트는 이미 있음)
- [ ] 화면이 Figma 220:2672, 224:4225 와 같다

## 7. 범위 밖
- 다른 회원의 감상 목록·댓글, 평점 신고

## 8. 바이브 코딩 프롬프트
### Step 1 — 평점 API
```
docs/prd/5-1_rating.md 4번의 API 4개를 만들어 줘.
PUT 은 update_or_create 로 한 작품 1개 규칙을 지키고, age_group_at_rating 은 모델 save() 가 채우니 건드리지 마.
나의 평점 목록은 type/score/sort/page(3개씩)를 지원하고, 요약(좋아요 수·평점 수·평균)도 같이 돌려줘.
rating-result 는 ranking 의 최근 두 주간 집계에서 순위와 위·아래 1개를 찾아 줘.
tests.py 에 '다시 평가하면 수정', '응답 안 함 회원 평점은 세대 NULL', 'TOP 100 밖' 테스트를 추가해 줘.
```
### Step 2 — 별점 입력 컴포넌트
```
7-2 피드백 팝업과 4-1 상세 팝업에서 같이 쓸 별점 입력 컴포넌트를 app/_components/star-input.tsx 로 만들어 줘.
반 별 클릭, 키보드 좌우 화살표 0.5씩, 감상 200자 + 글자 수 표시. 저장하면 평점 반영 결과 화면으로 이동해.
```
### Step 3 — 나의 평점·반영 결과 화면
```
Figma 노드 220:2672 "나의 평점" 을 app/me/ratings/page.tsx 로,
Figma 노드 224:4225 "평점 반영 결과 · 랭킹 변화" 를 app/me/ratings/result/[id]/page.tsx 로 만들어 줘.
'예시 데이터' 문구는 지우고, FR8 안내 문구는 그대로 둬. 프로필 메뉴의 '나의 평점' 과 연결해 줘.
```
