# P03 맞춤 추천 설문

| 항목 | 내용 |
|---|---|
| 상태 | 🟡 일부 완료 — 연령대·직업·선호/비선호 장르 저장 ✅(11/10), 기억에 남는 작품 DB 저장·Figma 모양·추가 질문 정리 ⬜ |
| Figma | [맞춤 추천 설문](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=39-3071) |
| 코드 | `app/onboarding/page.tsx`, `app/_lib/account.ts`(saveOnboarding), `backend/core/serializers.py`(SurveySerializer), `views.py`(save_survey) |
| 테이블 | `member`(age_group, job, survey_completed_at), `genre_preference`, `watch_history`(source=survey) |
| 검수 | 정준교(DB), 정재준(화면) |

## 1. 목적
추천에 필요한 최소한의 정보(나이대·직업·장르 취향·기억에 남는 작품)를 가입 직후에 받는다.

## 2. 사용자 이야기
- 새 회원으로서, 2분 안에 몇 가지만 고르면 바로 나에게 맞는 추천을 받고 싶다.
- 답하기 싫은 질문은 "응답 안 함"으로 넘어가고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 | 상태 |
|---|---|---|---|
| FR1 | 연령대 하나 선택: 14–19세 · 20대 · 30대 · 40대 · 50대 · 60대 이상 · 응답 안 함 | 필수 | ✅ |
| FR2 | 직업 하나 선택: 학생 · 직장인 · 자영업·프리랜서 · 가사·돌봄 · 구직·휴직 중 · 기타 · 응답 안 함 | 필수 | ✅ |
| FR3 | 선호 장르 여러 개 + "모든 장르가 좋아요" / 비선호 장르 여러 개 + "딱히 없어요". 같은 장르는 양쪽에 동시에 못 고름 | 필수 | ✅ |
| FR4 | **기억에 남는 작품**: 제목 검색 → 작품 DB에서 골라 여러 개 등록·삭제 (비워도 됨) | 필수 | ⬜ (P04 작품 데이터 필요) |
| FR5 | 수면 시간·생활 패턴·스트레스 질문 **삭제** (D2) | 필수 | ⬜ |
| FR6 | 저장 시 `survey_completed_at` 기록 → 다음 로그인부터 홈으로 바로 이동 | 필수 | ✅ |
| FR7 | [건너뛰고 둘러볼게요] → 홈 (설문 미완료 상태 유지) | 선택 | ✅ |
| FR8 | 화면 모양을 Figma와 똑같이 (5문항 흐름) | 필수 | ⬜ |

## 4. 데이터 · API
| 방식 | 주소 | 보내는 값 | 받는 값 |
|---|---|---|---|
| GET | `/api/v1/options/` | — | 연령대·직업·장르·OTT·상황 선택지 |
| PUT | `/api/v1/me/survey/` 🔒 | age_group, job, liked_genres[], liked_all, disliked_genres[], **memorable_content_ids[]**(추가 예정) | 저장된 내 정보 |
| GET | `/api/v1/contents/search/?q=` | 제목 일부 | 작품 목록 (P06) |

- 기억에 남는 작품은 `watch_history`에 `source='survey'`로 저장한다. 다시 저장하면 survey 기록만 지우고 새로 넣는다 (직접 기록 `direct`는 건드리지 않음).
- "응답 안 함"은 DB에 NULL로 저장한다.

## 5. 규칙 · 예외
- 로그인하지 않으면 `/login`으로 보낸다.
- 없는 장르 이름, 양쪽에 같은 장르 → 400 오류.
- 없는 작품 번호 → 400 오류.

## 6. 완료 기준
- [ ] 설문이 Figma처럼 5문항(연령대·직업·선호·비선호·기억에 남는 작품) 흐름이다
- [ ] "폭싹" 을 검색해 작품을 고르고 등록 → 목록에 나오고 [삭제]도 된다
- [ ] 저장 후 HeidiSQL에서 `genre_preference`(like/dislike), `watch_history`(source=survey) 행 확인
- [ ] 다른 브라우저에서 로그인 → 프로필에 같은 설문 결과
- [ ] `python manage.py test core` 통과

## 7. 범위 밖
- 작품을 몇 화까지 봤는지 같은 상세 시청 기록

## 8. 바이브 코딩 프롬프트
### Step 1 — 질문 정리 + Figma 모양 (FR5, FR8)
```
docs/prd/P03_survey.md 의 FR5·FR8 을 구현해 줘.
app/onboarding/page.tsx 에서 평균 수면 시간·생활 패턴·스트레스 질문을 지우고,
Figma 노드 39:3071 처럼 연령대 → 직업 → 선호 장르 → 비선호 장르 → 기억에 남는 작품 흐름으로 바꿔 줘.
저장 API(PUT /api/v1/me/survey/)는 그대로 쓰고, 지금 저장되는 값은 바뀌면 안 돼.
```
### Step 2 — 기억에 남는 작품 저장 (FR4) ※ P04·P06 Step 1 이후
```
docs/prd/P03_survey.md 의 FR4 를 구현해 줘.
1) backend: SurveySerializer 에 memorable_content_ids(작품 번호 목록, 비어도 됨)를 추가하고,
   save_survey 에서 watch_history 의 source='survey' 행만 지우고 새로 넣어 줘. 없는 번호면 400.
2) frontend: 기억에 남는 작품 칸에 제목을 입력하면 GET /api/v1/contents/search/?q= 로 찾고,
   결과를 골라 등록·삭제할 수 있게 해 줘 (Figma 220:5925 의 "등록한 작품" 카드 모양).
3) tests.py 에 '작품 2개 저장 → 1개로 다시 저장하면 1개만 남음' 테스트를 추가해 줘.
```
