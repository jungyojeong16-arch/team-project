# 8 마이페이지 — 프롬프트 사용 기록 (요청·확인: 정재준)

PRD: [8-1 프로필·취향 수정](../prd/8-1_profile_taste.md) · [8-2 최근 관심사 반영](../prd/8-2_interest_update.md)

### 기록 1 — 8-1 Step 3 취향 수정 화면
| 칸 | 내용 |
|---|---|
| 날짜 | 11/23(시작, GitHub Copilot) · 11/24(마무리, Claude Code) |
| 보낸 프롬프트 | 11/23: PRD Step 3 프롬프트를 Copilot 에 보냄 — Copilot 대화라 **원문이 남아 있지 않음**. 아래는 PRD Step 3 원문:<br>`Figma 노드 220:5925 "취향 수정" 을 app/me/taste/page.tsx 로 만들어 줘. 설문(app/onboarding)의 선택 컴포넌트를 재사용하고, 처음에 /me/ 값으로 채워 줘. [변경사항 저장] → PUT /me/survey/ 성공 후 POST /recommendations/refresh/ 를 부르고 프로필로 이동, [취소] → 프로필.`<br>11/24 (Claude Code, 인계 메시지 중 해당 부분): "8-1 Step 3 취향 수정 화면 … 아직 안 한 것: git status 로 실제 바뀐 파일 확인, 브라우저 확인 … Figma 220:5925 와 비교 (한 줄 소개 D8 은 팀 결정 전이라 넣지 않음) … WORKLOG·PRD·README·prompts 기록 → 커밋" |
| 기준 PRD | 8-1 FR8~FR10, Step 3 |
| AI가 한 일 | Copilot: 화면 초안, 설문 부품을 `app/_components/survey-questions.tsx` 로 복사, `refreshRecommendations()`.<br>Claude Code: 점검 후 수정 — ① 공용 장르 부품에 설문 화면에 없던 안내 상자가 들어가 설문 화면이 바뀌던 것 되돌림 ② `onboarding/page.tsx` 에 남은 옛 부품 두 벌 삭제 ③ `viewfit.ts` 주석 글자 실수 되돌림 ④ 다른 브라우저에서 저장하면 기억에 남는 작품이 지워지던 버그(`account.ts` 가 `memorable_contents` 를 받도록) ⑤ Figma 220:5925 와 비교해 기본 정보(○ 선택, 위아래 배치)·장르(체크 3칸, 개수, 요약+안내 상자)·왼쪽 안내 문구·보라 강조색(`#b99aff`) 맞춤 |
| 결과 | 커밋: `bf6f543`, 파일: `app/me/taste/page.tsx`, `app/_components/survey-questions.tsx`, `app/onboarding/page.tsx`, `app/_lib/account.ts`, `app/_lib/viewfit.ts` |
| 확인 | - [x] 취향 수정 화면에 기존 설문 값이 채워져 있다 (정재준 PC)<br>- [x] 저장 → `/profile`, 다시 열면 바뀐 값 유지, 취소 → `/profile`<br>- [x] `/onboarding` 설문 화면이 전과 같다<br>- [ ] 비선호에 공포 추가 후 저장 → 맞춤 추천에서 공포 작품이 사라진다 (작품 데이터 수집 후)<br>- [ ] 화면이 Figma 220:5925 와 같다 — 기억에 남는 작품 카드(포스터)·한 줄 소개(D8) 남음 |
| 수정 요청 | "Figma와 차이: 기본 정보·장르·왼쪽 문구를 Figma대로 고치고, 기억에 남는 작품 카드는 다음 작업으로" (11/24, A안 선택) |
