# P06 작품 검색 · 상세 · OTT 바로가기

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (11/17주) |
| Figma | 상단 검색창 "어떤 이야기를 찾으세요?"(모든 화면), [상세 정보]·[바로 보기] 버튼([Home Feed](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=9-5)). 상세 화면 자체는 Figma에 없음 (D5) |
| 코드(예정) | `backend/core/views.py`(content_search, content_detail, content_watch), `app/_components/content-modal.tsx` |
| 테이블 | `content`, `content_genre`, `content_platform`, `rating`, `content_like`, `watch_history`(source=direct) |
| 검수 | 정재준(화면), 정준교(API) |

## 1. 목적
보고 싶은 작품을 제목으로 찾고, 어떤 OTT에 있는지 확인한 뒤 바로 그 OTT로 이동한다. ViewFit은 추천만 하고 시청은 각 OTT에서 한다.

## 2. 사용자 이야기
- 회원으로서, 제목 일부만 입력해도 작품을 찾고 싶다.
- 회원으로서, 이 작품이 넷플릭스에 있는지 티빙에 있는지 알고 한 번에 이동하고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 상단 검색창에 2글자 이상 입력 → 제목에 포함된 작품 최대 20개 (포스터·제목·연도·유형) | 필수 |
| FR2 | 작품을 누르면 **상세 팝업**: 포스터, 제목, 연도, 유형, 장르, 줄거리, 제공 OTT 뱃지, ViewFit 평균 평점·평가 수, 세대별 평균(평가 3개 이상인 연령대만) | 필수 |
| FR3 | 상세 팝업에서 좋아요(P12), 별점 남기기(P11) | 필수 |
| FR4 | [바로 보기] → 제공 OTT가 1개면 바로, 여러 개면 고르게 한 뒤 `deeplink_url`을 새 탭으로 연다 | 필수 |
| FR5 | [바로 보기]를 누르면 `watch_history`에 `source='direct'`로 기록 (P10·P14에서 사용) | 필수 |
| FR6 | 검색 결과 없음 → "찾는 작품이 아직 없어요" | 필수 |

## 4. 데이터 · API
| 방식 | 주소 | 받는 값 |
|---|---|---|
| GET | `/api/v1/contents/search/?q=폭싹` | `[{id, title, content_type, release_year, poster_url}]` |
| GET | `/api/v1/contents/{id}/` | 작품 정보 + genres + platforms(code, name, watch_url) + rating{overall, total_count, by_age_group[]} + my{score, liked} |
| POST | `/api/v1/contents/{id}/watch/` 🔒 | `{platform}` 보내면 204 |

- `GET /contents/{id}/` 응답 모양은 `app/_lib/viewfit.ts` 의 `Movie` 타입과 맞춘다.
- 검색·상세는 로그인 없이도 되고, `my` 칸과 시청 기록은 로그인했을 때만.

## 5. 규칙 · 예외
- 없는 작품 번호 → 404 "작품을 찾을 수 없어요".
- 검색어 앞뒤 공백은 지우고, 1글자 이하면 요청하지 않는다.
- 시청 기록은 같은 작품을 여러 번 눌러도 매번 남긴다 (ERD 원칙 ③ — 중복 허용).

## 6. 완료 기준
- [ ] 검색창에 "오징어" → 결과에 오징어 게임
- [ ] 결과를 누르면 상세 팝업, 제공 OTT 뱃지가 관리자 페이지의 작품 제공 OTT와 같다
- [ ] [바로 보기] → OTT 검색 화면이 새 탭으로, HeidiSQL `watch_history`에 direct 행 추가
- [ ] 로그아웃 상태에서도 검색·상세는 되고 좋아요·별점은 로그인 창이 뜬다

## 7. 범위 밖
- 배우·감독 검색, 자동 완성 순위, 상세 전용 페이지 (D5에서 페이지로 정하면 추가)

## 8. 바이브 코딩 프롬프트
### Step 1 — 검색·상세·시청 기록 API
```
docs/prd/P06_search_detail.md 의 4번 API 3개를 만들어 줘.
상세 응답은 app/_lib/viewfit.ts 의 Movie 타입 모양에 맞추고, 평균·세대별 평균은 rating 에서 그때그때 계산해
(세대별은 age_group_at_rating 기준, 평가 3개 이상인 연령대만). 시청 기록은 watch_history 에 source='direct'.
tests.py 에 검색·없는 작품 404·로그인 안 한 상세 조회 테스트를 추가해 줘.
```
### Step 2 — 검색창 + 상세 팝업 + 바로 보기
```
docs/prd/P06_search_detail.md 의 FR1~FR6 화면을 만들어 줘.
상단 바의 검색창("어떤 이야기를 찾으세요?")을 모든 화면 공통 컴포넌트로 만들고, 입력 0.3초 뒤 검색해.
app/_components/content-modal.tsx 로 상세 팝업을 만들고, 홈의 [상세 정보]·[바로 보기]를 이것과 연결해 줘.
OTT 가 여러 개면 OTT 뱃지 중 하나를 고르게 한 뒤 새 탭으로 열어 줘. 디자인은 Figma 9:5 의 카드·뱃지 모양을 따라 줘.
```
