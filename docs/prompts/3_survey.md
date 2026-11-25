# 3 취향 설문 — 프롬프트 사용 기록

- PRD: [docs/prd/3-1_survey.md](../prd/3-1_survey.md)
- 요청·확인: 홍준화 / 코드 작성: AI(Claude Code)

> **원문에 대해 (정직하게)**: 3-1 작업(11/17)은 claude.ai 의 다른 Claude Code 세션에서 해서, 그때 보낸 문장 원문이 이 저장소나 지금 PC 에 남아 있지 않습니다.
> 아래 "보낸 프롬프트"는 커밋 기록·PRD Step 프롬프트·작업 일지로 다시 정리한 것이고, 원래 대화는 **세션 주소**에서 볼 수 있습니다.
> 세션에서 원문을 찾으면 이 칸에 그대로 붙여 넣어 주세요. (11/23 정리 — 홍준화 요청)
>
> 설문의 처음 버전(3단계 화면 10/06, 회원가입·로그인·설문을 DB 에 저장 11/10)은 0번·1번 작업이라 [0_common_base.md](0_common_base.md)·[1_member.md](1_member.md) 에 있습니다.

---

### 기록 1 — 3-1 Step 1~2 (Figma 한 화면 5문항 · 기억에 남는 작품 저장)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/17 |
| 보낸 프롬프트 | 원문 기록 없음 — 세션 `https://claude.ai/code/session_01Bv65Y69YU5vXvKL3GgBA6h` (2-1 과 같은 세션, 2-1·4-1 API 다음에 진행). 커밋 내용으로 보면 PRD 3-1 Step 1~2 를 요청 |
| 기준 PRD | 3-1 [8. 바이브 코딩 프롬프트](../prd/3-1_survey.md) **Step 1** 질문 정리 + Figma 모양(FR5·FR8: 수면·생활 패턴·스트레스 질문 삭제, Figma 39:3071 의 연령대 → 직업 → 선호 장르 → 비선호 장르 → 기억에 남는 작품, 저장 API 는 그대로) · **Step 2** 기억에 남는 작품 저장(FR4: `memorable_content_ids`, `watch_history` 의 source='survey' 행만 교체, 없는 번호면 400, 제목 검색으로 골라 등록·삭제, '2개 저장 → 1개로 다시 저장하면 1개' 테스트) |
| AI가 한 일 | 설문을 3단계 → **한 화면 5문항**으로(`app/onboarding/page.tsx`), 수면·생활 패턴·스트레스·시청 시간 질문 삭제(팀 결정 D2, Figma). 기억에 남는 작품: 제목 검색(2글자 이상) → 골라서 추가·삭제, 결과가 없으면 "찾는 작품이 아직 없어요". 백엔드: `SurveySerializer.memorable_content_ids` → `watch_history(source=survey)` 만 바꾸고 [바로 보기] 기록(direct)은 그대로, `GET /me/` 에 `memorable_contents`, 검색 결과에 장르·OTT 코드 추가. 테스트 5개(그때 총 38개) |
| 결과 | 커밋 [`27c031a`](https://github.com/jungyojeong16-arch/team-project/commit/27c031a) · `app/onboarding/page.tsx`, `app/_lib/account.ts`(saveOnboarding), `app/_lib/viewfit.ts`(searchContents), `backend/core/serializers.py`, `views.py`, `tests.py`(SurveyMemorableContentTests) |
| 확인 | (PRD 3-1 완료 기준, 11/17 브라우저 데스크톱·모바일) <br> - [x] 설문이 Figma 처럼 5문항 흐름 <br> - [x] "쇼생"·"어벤" 검색해 등록 → 1개 삭제 → 저장, 없는 제목은 "찾는 작품이 아직 없어요" <br> - [x] 저장 후 `genre_preference`(like/dislike)·`watch_history`(source=survey) 행, `GET /me/` 의 `memorable_contents` <br> - [x] `python manage.py test core` 통과 (그때 38개, 11/23 기준 전체 74개 — `test_two_then_one_leaves_one`, `test_unknown_content_is_400_and_nothing_saved`, `test_direct_watch_history_is_kept` 등) <br> - [ ] 다른 브라우저에서 로그인 → 프로필에 같은 설문 결과 (프로필의 기억에 남는 작품 표시는 8-1 정재준이 `memorable_contents` 로 연결) <br> - [ ] 정재준 화면 검수 |
| 수정 요청 | 없음 |

### 기록 2 — 3-1 화면 검수 뒤 Figma 차이 3개 정리
| 칸 | 내용 |
|---|---|
| 날짜 | 11/25 |
| 보낸 프롬프트 | "1번 ㄱㄱ" — AI가 다음 할 일 1번으로 "정재준이 11/23 검수에서 남긴 3-1 Figma 차이 3개(안내 아이콘 ⓘ→체크리스트, 버튼 위 구분선 없음, '지금은 건너뛰고' 밑줄 없음) 정하기"를 제안한 데 대한 답 |
| 기준 PRD | 3-1 FR5(Figma 39:3071 모양), 6. 완료 기준 화면 검수 |
| AI가 한 일 | Figma 설계값(`get_design_context`)으로 3곳 확인 → ① 기억에 남는 작품 안내(120:680)의 아이콘은 레이어 이름만 `info` 이고 그림은 체크리스트 → `app/_components/survey-questions.tsx` 의 `Info` 를 `ListChecks` 로 ② 버튼 위 구분선(Survey actions 39:3235 의 `border-t` 흰색 12%, `pt` 24px) ③ 건너뛰기 링크(39:3243) 밑줄은 Figma 에도 있고 11/17 코드와 값이 같아서 그대로 (Figma 그림에서는 선이 연해서 안 보임). 8-1 취향 수정은 이 안내를 숨기고(`hideHeading`) 써서 영향 없음 |
| 결과 | 커밋: 이 기록과 같은 커밋 · `app/_components/survey-questions.tsx`, `docs/prd/3-1_survey.md` |
| 확인 | - [x] `npx tsc --noEmit` 통과 <br> - [ ] 브라우저에서 아이콘 확인 (개발 서버가 꺼져 있어 못 봄 — 같은 화면 위쪽 안내 줄과 같은 아이콘) |
| 수정 요청 | 없음 |

### 이후 이 설문 답을 쓰는 곳 (참고)
- 7-1 맞춤 추천: 선호 장르 +3, 비선호 장르 제외, 기억에 남는 작품과 장르가 겹치면 +1, 기억에 남는 작품은 추천에서 제외 → [7_recommend.md 기록 1](7_recommend.md)
- 0-4 홈: 오늘의 추천 칩(직업 + 요일)·한 줄(기억에 남는 작품 → 선호 장르) → [7_recommend.md 기록 2](7_recommend.md), 설문 안 한 회원 안내 → [0_common_base.md 기록 8](0_common_base.md)
