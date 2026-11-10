# P10 재방문 추천 피드백

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (11/24주) |
| Figma | [재방문 추천 피드백](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=145-2341) (홈 위에 뜨는 팝업) |
| 코드(예정) | `views.py`(pending_feedback, submit_feedback), `app/_components/feedback-modal.tsx` |
| 테이블 | `recommendation.feedback`(pending → rated / not_watched), `rating`(score, comment) |
| 검수 | 홍준화(기획), 정재준(화면) |

## 1. 목적
지난번 추천을 실제로 봤는지, 어땠는지를 다시 방문했을 때 짧게 묻고, 그 답을 다음 추천에 반영한다.

## 2. 사용자 이야기
- 다시 온 회원으로서, 지난번 추천작이 어땠는지 10초 안에 알려 주고 싶다.
- 아직 안 봤으면 "아직 못 봤어요"로 간단히 넘기고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | 다시 방문했을 때 홈 위에 팝업: "다시 오셨네요, 반가워요!", "이번 작품은 어떠셨나요?", 작품 이름 | 필수 |
| FR2 | 별점 0.5점 단위 (별 5개, 반 별 가능) + "3.5 / 5 선택됨" | 필수 |
| FR3 | "아직 못 봤어요" 선택 (별점 대신) | 필수 |
| FR4 | 한마디 (선택, 200자, 글자 수 표시) | 선택 |
| FR5 | [의견 보내기] → 별점이면 평점 저장(P11) + feedback=rated, 못 봤어요면 feedback=not_watched | 필수 |
| FR6 | [나중에 할게요] · X → 이번 방문 동안 다시 뜨지 않음 | 필수 |

### 팝업을 띄우는 조건
1. 로그인한 회원이 홈에 들어왔고
2. **[바로 보기]를 누른(시청 기록 direct가 있는) 추천 작품** 중 `feedback='pending'` 이고 누른 지 **12시간 이상** 지난 것이 있으면
3. 가장 최근 것 1개만 묻는다. 없으면 띄우지 않는다.

## 4. 데이터 · API
| 방식 | 주소 | 내용 |
|---|---|---|
| GET | `/api/v1/recommendations/pending-feedback/` 🔒 | 물어볼 추천 1개 또는 `null` |
| POST | `/api/v1/recommendations/{id}/feedback/` 🔒 | `{watched: true, score: 3.5, comment: ""}` 또는 `{watched: false}` |

- 별점 저장은 P11과 같은 규칙(0.5 단위, 한 작품당 1개, 다시 하면 수정, 평가 당시 연령대 저장).

## 5. 규칙 · 예외
- 별점도 "못 봤어요"도 안 고르고 보내기 → "별점을 선택해 주세요".
- 이미 그 작품에 평점이 있으면 별점을 미리 채워 보여 주고, 보내면 수정한다.
- [나중에 할게요]는 브라우저 세션에만 기억 (다음 방문 때 다시 물음).

## 6. 완료 기준
- [ ] 추천 작품 [바로 보기] → (테스트용으로 시간 조건을 1분으로 바꾸고) 새로고침 → 팝업
- [ ] 3.5점 + 한마디 보내기 → `rating`에 3.5, `recommendation.feedback=rated`
- [ ] 못 봤어요 → `feedback=not_watched`, `rating` 행 없음
- [ ] 나중에 할게요 → 같은 방문 중엔 안 뜨고, 브라우저를 다시 열면 뜬다
- [ ] 화면이 Figma 145:2341 과 같다

## 7. 범위 밖
- 이메일·앱 푸시로 피드백 요청

## 8. 바이브 코딩 프롬프트
### Step 1 — API
```
docs/prd/P10_revisit_feedback.md 의 '팝업을 띄우는 조건' 과 4번 API 2개를 만들어 줘.
조건의 12시간은 settings 의 FEEDBACK_DELAY_HOURS 로 빼서 테스트 때 바꿀 수 있게 해 줘.
평점 저장은 P11 과 같은 함수를 써서 0.5 단위·한 작품 1개 규칙을 지켜 줘.
tests.py 에 '조건 충족 시 1개', '못 봤어요', '이미 평점 있으면 수정' 테스트를 추가해 줘.
```
### Step 2 — 팝업 화면
```
Figma 노드 145:2341 의 '지난 추천 만족도 설문' 팝업을 app/_components/feedback-modal.tsx 로 만들어
홈(app/page.tsx)에 들어올 때 GET pending-feedback 결과가 있으면 띄워 줘.
별은 반 별 클릭이 되게(왼쪽 반 = .5), 키보드 화살표로도 조절되게 해 줘.
[나중에 할게요]·X 는 sessionStorage 에 기억해 이번 방문 동안 다시 띄우지 마.
```
