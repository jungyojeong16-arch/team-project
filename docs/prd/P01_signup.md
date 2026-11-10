# P01 회원가입

| 항목 | 내용 |
|---|---|
| 상태 | 🟡 일부 완료 — 가입 API·화면 연결 ✅(11/10), Figma 모양 맞추기·중복 확인 버튼·가입 완료 안내 화면 ⬜ |
| Figma | [회원가입](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=157-1355) · [회원가입 완료 안내](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=61-591) |
| 코드 | `app/signup/page.tsx`, `app/_lib/account.ts`, `backend/core/serializers.py`(SignupSerializer), `views.py`(signup, check_nickname_view) |
| 테이블 | `member` (+ Django `authtoken_token`) |
| 검수 | 정준교(DB·API), 정재준(화면) |

## 1. 목적
이메일로 계정을 만들어 취향 설문과 추천 기록을 회원별로 저장할 수 있게 한다.

## 2. 사용자 이야기
- 처음 온 사용자로서, 이메일·닉네임·비밀번호만으로 빠르게 가입하고 싶다.
- 가입한 사용자로서, 다음에 무엇을 하면 되는지(취향 설문) 바로 안내받고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 | 상태 |
|---|---|---|---|
| FR1 | 이메일 입력. 형식 검사, 이미 가입된 이메일이면 오류 | 필수 | ✅ |
| FR2 | 닉네임 입력 + **"중복 확인" 버튼**. 2~12자, 한글·영문·숫자·밑줄(_)만 | 필수 | 🟡 (지금은 칸을 벗어나면 자동 확인) |
| FR3 | 비밀번호 + 비밀번호 확인. 8자 이상, 영문·숫자·특수문자 포함, 두 값 일치 | 필수 | ✅ |
| FR4 | 약관 동의: 만 14세 이상·이용약관·개인정보(필수), 마케팅(선택), 전체 동의 | 필수 | ✅ |
| FR5 | 가입 성공 시 토큰 발급 → 로그인 상태가 됨 | 필수 | ✅ |
| FR6 | 가입 직후 **회원가입 완료 안내** 화면: "다섯 가지 질문", 약 2분, [맞춤 추천 설문 시작하기] | 필수 | ⬜ |
| FR7 | 화면 모양을 Figma와 똑같이 | 필수 | ⬜ |

## 4. 데이터 · API
| 방식 | 주소 | 보내는 값 | 받는 값 |
|---|---|---|---|
| GET | `/api/v1/auth/check-nickname/?nickname=` | 닉네임 | `{nickname, available, reason}` |
| POST | `/api/v1/auth/signup/` | email, nickname, password, agree_age14, agree_terms, agree_privacy, agree_marketing | 201 `{token, member}` |

저장: `member.email`(소문자로 저장, 중복 불가), `nickname`(중복 불가), `password`(해시), `marketing_opt_in`, `terms_agreed_at`(가입 시각)

## 5. 규칙 · 예외
- 비밀번호는 절대 그대로 저장하지 않는다 (Django 해시).
- 서버 오류 메시지는 해당 입력칸 아래에 보여 준다 (예: "이미 가입된 이메일이에요").
- 중복 확인을 하지 않았거나 확인 후 닉네임을 바꾸면 가입 버튼을 눌렀을 때 "닉네임 중복 확인을 해 주세요" 안내.
- 이미 로그인한 사용자가 `/signup`에 오면 홈으로 보낸다.

## 6. 완료 기준
- [ ] 새 이메일·닉네임으로 가입 → 회원가입 완료 안내 화면이 나온다
- [ ] [맞춤 추천 설문 시작하기] → `/onboarding`으로 이동
- [ ] 같은 이메일로 다시 가입 → "이미 가입된 이메일" 오류
- [ ] 쓰고 있는 닉네임으로 [중복 확인] → "이미 사용 중" 안내, 새 닉네임 → "사용할 수 있어요"
- [ ] `password1` 처럼 특수문자 없는 비밀번호 → 오류
- [ ] 관리자 페이지 **회원** 표에 이메일·닉네임·약관 동의 시각이 저장되어 있다
- [ ] `python manage.py test core` 통과

## 7. 범위 밖
- 이메일 인증 메일 발송, 소셜 가입 (D4)

## 8. 바이브 코딩 프롬프트
### Step 1 — 닉네임 중복 확인 버튼 (FR2)
```
docs/prd/P01_signup.md 의 FR2 를 구현해 줘.
app/signup/page.tsx 의 닉네임 칸 오른쪽에 Figma(노드 157:1355)처럼 "중복 확인" 버튼을 넣고,
누르면 GET /api/v1/auth/check-nickname/ 결과를 칸 아래에 보여 줘.
지금 있는 '칸을 벗어나면 자동 확인' 동작은 버튼 방식으로 바꿔 줘.
확인하지 않았거나 확인 뒤 닉네임을 바꾼 상태로 가입하면 "닉네임 중복 확인을 해 주세요"를 보여 줘.
백엔드는 이미 있으니 바꾸지 마.
```
### Step 2 — 회원가입 완료 안내 화면 (FR6)
```
docs/prd/P01_signup.md 의 FR6 을 구현해 줘.
Figma 노드 61:591 "회원가입 완료 안내" 를 app/signup/complete/page.tsx 로 만들어 줘.
문구: "회원가입이 완료되었어요!", "나만의 추천을 위한 다섯 가지 질문 · 약 2분",
연령대 1/5, 직업 2/5, 선호 장르 3/5, 비선호 장르 4/5, 기억에 남는 작품 5/5,
버튼 [맞춤 추천 설문 시작하기] → /onboarding, 아래 안내 "편하게 답해주세요. 취향은 나중에도 수정할 수 있어요."
가입 성공 후 이동하는 곳을 /onboarding 에서 /signup/complete 로 바꿔 줘. 로그인 안 한 사용자는 /signup 으로 보내.
```
### Step 3 — Figma와 똑같이 (FR7)
```
app/signup/page.tsx 의 모양을 Figma 노드 157:1355 와 똑같이 맞춰 줘.
색·글자 크기·간격·입력칸 순서·약관 문구를 Figma 기준으로 바꾸고, 동작(검사·API 호출)은 그대로 둬.
바꾼 뒤 Figma와 다른 점이 남아 있으면 목록으로 알려 줘.
```
