# P12 좋아요

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (12/1주) — 테이블(`content_like`, 중복 금지)은 ✅ |
| Figma | [좋아요 표시한 작품](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2521), 프로필의 "최근 좋아요 표시한 작품"([프로필 정보](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=130-846)) |
| 코드(예정) | `views.py`(like_content, my_likes), `app/me/likes/page.tsx`, `app/_components/like-button.tsx` |
| 테이블 | `content_like`(member, content, liked_at) |
| 검수 | 정준교(DB), 정재준(화면) |

## 1. 목적
"나중에 보고 싶은 작품"을 모아 두고, 좋아요한 작품의 장르를 추천(P09)·취향 분석(P13)에 쓴다.

## 2. 사용자 이야기
- 회원으로서, 마음에 드는 작품에 하트를 눌러 모아 두고 싶다.
- 회원으로서, 모아 둔 작품을 OTT별로 골라 보고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 작품 카드·상세 팝업의 하트 버튼: 누르면 좋아요, 다시 누르면 해제 | 필수 |
| FR2 | **좋아요 표시한 작품** 화면: 프로필 요약, 필터(전체/시리즈/영화, 플랫폼 전체/6개), 최근 좋아요순, 한 페이지 4개 + 페이지 번호 | 필수 |
| FR3 | 각 카드: 포스터, OTT, 제목, ★ 평점 · 연도, "좋아요 표시됨" | 필수 |
| FR4 | [목록 편집]: 여러 개 골라 한 번에 좋아요 해제 | 선택 |
| FR5 | 프로필에 최근 좋아요 4개 + [좋아요 전체보기] | 필수 |

## 4. 데이터 · API
| 방식 | 주소 | 내용 |
|---|---|---|
| PUT | `/api/v1/contents/{id}/like/` 🔒 | 좋아요 (이미 있으면 그대로 200) |
| DELETE | `/api/v1/contents/{id}/like/` 🔒 | 해제 |
| GET | `/api/v1/me/likes/?type=&platform=&page=1` 🔒 | 목록(4개씩) + 전체 개수 |
| POST | `/api/v1/me/likes/bulk-delete/` 🔒 | `{content_ids: [..]}` |

- DB 규칙(이미 적용): `UNIQUE(member, content)` → 같은 작품 두 번 좋아요 불가.

## 5. 규칙 · 예외
- 로그인 안 한 사용자가 하트를 누르면 로그인 창(P02).
- 하트는 누르는 즉시 바뀌어 보이고, 서버 저장이 실패하면 원래대로 돌리고 안내.

## 6. 완료 기준
- [ ] 홈 카드 하트 → `content_like` 1행, 다시 누르면 삭제
- [ ] 좋아요 화면 "넷플릭스" 필터 → 넷플릭스 작품만
- [ ] 5개 이상이면 2페이지가 생긴다
- [ ] 목록 편집으로 2개 해제 → 개수가 2 줄어든다
- [ ] 화면이 Figma 220:2521 과 같다

## 7. 범위 밖
- 좋아요 목록 공유, 폴더 나누기

## 8. 바이브 코딩 프롬프트
### Step 1 — API
```
docs/prd/P12_like.md 4번의 API 4개를 만들어 줘. PUT 은 get_or_create, DELETE 는 없으면 그냥 204.
목록은 liked_at 최신순, type/platform 필터, 4개씩 page. tests.py 에 '두 번 눌러도 1행', 'bulk 삭제' 테스트 추가.
```
### Step 2 — 하트 버튼 + 화면
```
app/_components/like-button.tsx 하트 버튼을 만들어 홈 카드·상세 팝업·랭킹 카드에 붙여 줘 (누르면 바로 바뀌고 실패 시 되돌림).
Figma 노드 220:2521 "좋아요 표시한 작품" 을 app/me/likes/page.tsx 로 만들고 [목록 편집]도 넣어 줘.
프로필 메뉴의 '좋아요 표시한 작품' 과 연결해 줘.
```
