# 7-2 재방문 추천 피드백

| 항목 | 내용 |
|---|---|
| 상태 | ✅ 완료 (11/22) — API 2개, 홈 팝업(Figma 145:2341), "아직 못 봤어요" 작품은 다시 추천 · 화면 검수 대기(정재준) |
| Figma | [재방문 추천 피드백](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=145-2341) (홈 위에 뜨는 팝업) |
| 코드 | `backend/core/feedback.py`(팝업 조건·답 저장), `views.py`(pending_feedback, submit_feedback), 평점 저장 `common.save_rating()`·입력 검사 `serializers.RatingInputSerializer`(5-1 과 같이 씀), `app/_components/feedback-modal.tsx`, `app/_lib/feedback.ts`, 홈 `app/page.tsx`, 테스트 `RevisitFeedbackTests` |
| 테이블 | `recommendation.feedback`(pending → rated / not_watched), `rating`(score, comment) |
| 담당 | **홍준화** (PRD 확정·바이브 코딩) |
| 함께 확인 | 정준교(DB), 정재준(화면) |

## 1. 목적
지난번 추천을 실제로 봤는지, 어땠는지를 다시 방문했을 때 짧게 묻고, 그 답을 다음 추천에 반영한다.

## 2. 사용자 이야기
- 다시 온 회원으로서, 지난번 추천작이 어땠는지 10초 안에 알려 주고 싶다.
- 아직 안 봤으면 "아직 못 봤어요"로 간단히 넘기고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 다시 방문했을 때 홈 위에 팝업: "다시 오셨네요, 반가워요!", "이번 작품은 어떠셨나요?", 작품 이름 | 필수 ✅ (작품 이름은 Figma 에 없어서 질문 아래 작품 줄로 추가) |
| FR2 | 별점 0.5점 단위 (별 5개, 반 별 가능) + "3.5 / 5 선택됨" | 필수 ✅ (별의 왼쪽 반 = .5, 키보드 ←→) |
| FR3 | "아직 못 봤어요" 선택 (별점 대신) | 필수 ✅ |
| FR4 | 한마디 (선택, 200자, 글자 수 표시) | 선택 ✅ |
| FR5 | [의견 보내기] → 별점이면 평점 저장(5-1) + feedback=rated, 못 봤어요면 feedback=not_watched | 필수 ✅ |
| FR6 | [나중에 할게요] · X → 이번 방문 동안 다시 뜨지 않음 | 필수 ✅ (Esc·바깥 클릭도 같음) |

### 팝업을 띄우는 조건
1. 로그인한 회원이 홈에 들어왔고
2. **[바로 보기]를 누른(시청 기록 direct가 있는) 추천 작품** 중 `feedback='pending'` 이고 누른 지 **12시간 이상** 지난 것이 있으면
3. 가장 최근 것 1개만 묻는다. 없으면 띄우지 않는다.
- (11/22 정함) [바로 보기]는 그 추천을 받은 **뒤에** 누른 것만 센다. 12시간은 `settings.FEEDBACK_DELAY_HOURS` (`backend/.env` 에서 바꿀 수 있음, 손으로 확인할 때 0.02 ≒ 1분).
- 답은 작품에 대한 것이라, 같은 작품의 pending 추천 행(다른 날·다른 상황 묶음)을 모두 같은 답으로 바꾼다.
- **다음 추천 반영** (11/22 홍준화 결정): 별점은 평점이 되어 7-1 점수에 쓰이고(4점 이상이면 '좋아한 작품'), 평가한 작품은 추천에서 빠진다. "아직 못 봤어요" 작품은 [바로 보기] 기록이 있어도 **다시 추천 후보**가 된다 (`recommend.load_taste`).

## 4. 데이터 · API
| 방식 | 주소 | 내용 |
|---|---|---|
| GET | `/api/v1/recommendations/pending-feedback/` 🔒 | `{"recommendation": {id, tpo, recommended_at, clicked_at, content: 작품 카드, my_rating: {score, comment} 또는 null}}` 또는 `{"recommendation": null}` |
| POST | `/api/v1/recommendations/{id}/feedback/` 🔒 | `{watched: true, score: 3.5, comment: ""}` 또는 `{watched: false}` |

- 별점 저장은 5-1과 같은 규칙(0.5 단위, 한 작품당 1개, 다시 하면 수정, 평가 당시 연령대 저장) — `common.save_rating()` 과 `serializers.RatingInputSerializer` 를 만들어 두었으니 5-1 평점 API 도 이것을 쓰면 같은 규칙이 된다.
- 오류: 별점도 못 봤어요도 없음 → `400 {"score": ["별점을 선택해 주세요."]}`, 4.3 → 400, 한마디 201자 → 400, 남의 추천 → 404, 이미 답한 추천 → 400, 로그인 안 함 → 401.

## 5. 규칙 · 예외
- 별점도 "못 봤어요"도 안 고르고 보내기 → "별점을 선택해 주세요".
- 이미 그 작품에 평점이 있으면 별점을 미리 채워 보여 주고, 보내면 수정한다.
- [나중에 할게요]는 브라우저 세션에만 기억 (다음 방문 때 다시 물음).

## 6. 완료 기준
- [x] 추천 작품 [바로 보기] → (테스트용으로 시간 조건을 1분으로 바꾸고) 새로고침 → 팝업 (테스트 `test_not_asked_too_early_or_clicked_before_recommendation` 는 시간 조건을 바꿔서, 브라우저는 13시간 전 클릭 기록으로 확인 — 가장 최근에 누른 작품을 물음)
- [x] 3.5점 + 한마디 보내기 → `rating`에 3.5, `recommendation.feedback=rated` (11/22 브라우저: 4번째 별 왼쪽 반 클릭 → "3.5 / 5 선택됨", 평가 당시 연령대도 저장)
- [x] 못 봤어요 → `feedback=not_watched`, `rating` 행 없음 (+ 다음 추천 후보로 돌아옴)
- [x] 나중에 할게요 → 같은 방문 중엔 안 뜨고, 브라우저를 다시 열면 뜬다 (sessionStorage `viewfit.feedback.later`)
- [ ] 화면이 Figma 145:2341 과 같다 — 1000px·375px 확인(너비 600, 여백 32, 모서리 20, 별 44px), 정재준 검수 대기. Figma 와 다른 점: 작품 줄 추가(FR1), 입력 칸 둘째 줄 "추천 작품에 반영됩니다" → "남긴 글은 내 평점과 함께 저장돼요"(한마디는 추천 계산에 쓰이지 않음)

## 7. 범위 밖
- 이메일·앱 푸시로 피드백 요청

## 8. 바이브 코딩 프롬프트
### Step 1 — API
```
docs/prd/7-2_revisit_feedback.md 의 '팝업을 띄우는 조건' 과 4번 API 2개를 만들어 줘.
조건의 12시간은 settings 의 FEEDBACK_DELAY_HOURS 로 빼서 테스트 때 바꿀 수 있게 해 줘.
평점 저장은 5-1 과 같은 함수를 써서 0.5 단위·한 작품 1개 규칙을 지켜 줘.
tests.py 에 '조건 충족 시 1개', '못 봤어요', '이미 평점 있으면 수정' 테스트를 추가해 줘.
```
### Step 2 — 팝업 화면
```
Figma 노드 145:2341 의 '지난 추천 만족도 설문' 팝업을 app/_components/feedback-modal.tsx 로 만들어
홈(app/page.tsx)에 들어올 때 GET pending-feedback 결과가 있으면 띄워 줘.
별은 반 별 클릭이 되게(왼쪽 반 = .5), 키보드 화살표로도 조절되게 해 줘.
[나중에 할게요]·X 는 sessionStorage 에 기억해 이번 방문 동안 다시 띄우지 마.
```
