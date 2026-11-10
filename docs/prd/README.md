# ViewFit 프로그램 목록 · PRD · 바이브 코딩 프롬프트

- 기준: Figma 화면 16개 ([Figma 파일](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq)), 물리 ERD(`docs/erd/ViewFit_ERD_physical.md`), 11/10 기준 코드
- 진행 방식 (교수님 안내):
  **① 기능을 프로그램 목록으로 구체화 → ② 프로그램마다 PRD 작성 → ③ PRD를 바탕으로 단계별 프롬프트 작성 → ④ 프롬프트로 단계별 바이브 코딩 → ⑤ 완료 기준으로 확인**

## 1. 프로그램 목록

상태: ✅ 완료 · 🟡 일부 완료 · ⬜ 예정  /  검수: 결과를 직접 확인하는 사람

| ID | 프로그램 | 분류 | Figma 화면 | 핵심 기능 | 주요 테이블 | 주차 | 검수 | 상태 |
|---|---|---|---|---|---|---|---|---|
| [P01](P01_signup.md) | 회원가입 | 계정 | 회원가입, 회원가입 완료 안내 | 이메일·닉네임(중복 확인)·비밀번호·약관 동의 | member | 11/10 | 정준교·정재준 | 🟡 |
| [P02](P02_login.md) | 웹 시작 화면 · 로그인 · 로그아웃 | 계정 | 웹 시작 화면, 로그인 창 | 이메일 로그인, 이메일 기억하기, 로그아웃 | member, authtoken | 11/10 | 정준교·정재준 | 🟡 |
| [P03](P03_survey.md) | 맞춤 추천 설문 | 취향 | 맞춤 추천 설문 | 연령대·직업·선호/비선호 장르·기억에 남는 작품 | member, genre_preference, watch_history | 11/10~17 | 정준교·정재준 | 🟡 |
| [P04](P04_tmdb_import.md) | 작품 데이터 수집 · 시연 데이터 | 데이터 | (화면 없음, 관리자) | TMDB에서 작품·장르·OTT 가져오기 | content, content_genre, content_platform, content_tpo | 11/17 | 정준교·홍준화 | ⬜ |
| [P05](P05_home_feed.md) | 홈 피드 | 탐색 | Home Feed, 프로필 메뉴 | 오늘의 추천, 통합 랭킹 TOP 10, 세대별 교차 평점, 또래 추천 | 전체 조회 | 11/17 | 정재준·정준교 | 🟡 |
| [P06](P06_search_detail.md) | 작품 검색 · 상세 · OTT 바로가기 | 탐색 | 상단 검색창, 상세 정보·바로 보기 버튼 | 제목 검색, 작품 정보, OTT로 이동 | content, content_platform, watch_history | 11/17 | 정재준·정준교 | ⬜ |
| [P07](P07_total_ranking.md) | 통합 랭킹 | 랭킹 | 통합 랭킹 | 주간·월간 TOP 100, 순위 변동, 필터 | ranking | 11/17 | 정준교·정재준 | ⬜ |
| [P08](P08_generation_ranking.md) | 세대별 랭킹(평점) | 랭킹 | 세대별 평점 | 연령대별 평점 TOP 30 | rating | 11/17 | 정준교·정재준 | ⬜ |
| [P09](P09_tpo_recommend.md) | 맞춤 추천 (TPO · AI) | 추천 | 맞춤 추천 | 상황별 추천 TOP 50, 한 줄 큐레이션 | recommendation, content_tpo | 11/24 | 홍준화·정준교 | ⬜ |
| [P10](P10_revisit_feedback.md) | 재방문 추천 피드백 | 추천 | 재방문 추천 피드백 | 지난 추천 별점·못 봤어요·한마디 | recommendation, rating | 11/24 | 홍준화·정재준 | ⬜ |
| [P11](P11_rating.md) | 평점 (작성 · 나의 평점 · 반영 결과) | 평가 | 나의 평점, 평점 반영 결과 | 0.5점 별점, 감상, 랭킹 변화 확인 | rating, ranking | 12/1 | 정준교·정재준 | ⬜ |
| [P12](P12_like.md) | 좋아요 | 평가 | 좋아요 표시한 작품 | 좋아요 표시·해제, 모아 보기 | content_like | 12/1 | 정준교·정재준 | ⬜ |
| [P13](P13_profile_taste.md) | 프로필 · 취향 수정 | 계정 | 프로필 정보, 취향 수정 | 내 요약, 취향 키워드, 설문 다시 저장 | member, genre_preference, rating, content_like | 12/1 | 정재준·정준교 | 🟡 |
| [P14](P14_interest_update.md) | 최근 관심사 반영 | 추천 | 최근 관심사 반영 확인 | 동의 시 최근 활동으로 추천 새로 만들기 | recommendation, watch_history, content_like, rating | 12/1 | 홍준화·정준교 | ⬜ |

> 화면 16개 중 Figma의 Watch 화면 2개는 쓰지 않습니다 (OTT 바로가기로 대신 — P06).

## 2. 주차별 진행

| 주 | 프로그램 | 비고 |
|---|---|---|
| 11/3 | (준비) 물리 ERD, 백엔드 기본 구조 | ✅ |
| 11/10 | P01 · P02 · P03 남은 부분 + 기존 화면 Figma와 똑같이 | 회원가입·로그인·설문 저장은 ✅ |
| 11/17 | P04 → P05 · P06 · P07 · P08 | TMDB API 키 필요 |
| 11/24 | P09 · P10 | LLM API 키 필요 (팀 결정 D10) |
| 12/1 | P11 · P12 · P13 · P14 + AWS 배포 테스트 | |
| 12/8 | 통합 테스트, 버그 수정, 최종 발표 | 새 기능 추가 중단 |
| 12/15 | 보고서, GitHub 최종 정리 | |

순서 이유: 작품 데이터(P04)가 있어야 홈·랭킹·추천이 진짜 데이터로 동작하고, 평점(P11)이 쌓여야 세대별 랭킹(P08)이 의미가 있어서 P04를 가장 먼저 합니다. 세대별 랭킹은 처음에 시연 데이터(P04)로 확인합니다.

## 3. 바이브 코딩 진행 방법

각 PRD의 **8. 바이브 코딩 프롬프트**를 Step 1부터 순서대로 사용합니다.

1. AI(Claude Code)에게 아래 **공통 컨텍스트 프롬프트**를 먼저 보냅니다 (새 대화마다 한 번).
2. 해당 PRD의 Step 1 프롬프트를 보냅니다.
3. AI가 만든 결과를 PRD의 **6. 완료 기준**으로 직접 확인합니다.
4. 문제가 있으면 아래 **수정 요청 프롬프트**로 고칩니다.
5. 통과하면 다음 Step으로 넘어갑니다. 마지막 Step까지 끝나면 GitHub에 올리고 프로그램 목록의 상태를 ✅로 바꿉니다.

### 공통 컨텍스트 프롬프트
```
[ViewFit 공통 컨텍스트]
너는 ViewFit 팀의 개발을 돕는 AI 개발자야.
- 서비스: 여러 OTT(넷플릭스·티빙·쿠팡플레이·웨이브·디즈니+·왓챠)의 영화·시리즈를 한곳에서 추천하는 큐레이션 웹.
  상황(TPO)·취향 기반 AI 추천, 통합 랭킹, 세대별 평점, OTT 바로가기가 핵심이야.
- 저장소: jungyojeong16-arch/team-project (브랜치 claude/viewfit-project-planning-qiqv1h)
- 프론트: Next.js 15 + React + TypeScript + Tailwind + lucide-react (app/ 폴더)
- 백엔드: Python 3.12 + Django 5.2 + Django REST Framework (backend/ 폴더, 앱 이름 core)
- DB: MariaDB(utf8mb4). 테이블은 backend/core/models.py, 설명은 docs/erd/ViewFit_ERD_physical.md
- 로그인: DRF Token (요청 헤더 Authorization: Token <키>), API 주소는 /api/v1/...
- 화면 기준: Figma 파일 MCj90ViECjscPBHzbGNyqq (PRD마다 화면 링크가 있어)
지켜야 할 규칙:
1. 기능 범위는 docs/prd/ 의 해당 PRD만 따른다. PRD에 없는 기능이 필요하면 만들기 전에 먼저 물어본다.
2. 테이블(models.py)을 바꿔야 하면 바로 고치지 말고, 바꿀 칸과 이유를 먼저 설명하고 확인을 받는다.
3. 평균·개수처럼 계산할 수 있는 값은 저장하지 않고 조회할 때 계산한다.
4. API를 만들면 backend/core/tests.py 에 테스트를 추가하고 python manage.py test core 가 통과해야 한다.
5. 비밀번호·API 키는 코드나 GitHub에 쓰지 않고 backend/.env 에서 읽는다.
6. 화면 문구는 한국어로, Figma 문구를 그대로 쓴다.
7. 작업이 끝나면 바뀐 파일 목록과 내가 확인할 방법(주소, 순서)을 알려준다.
```

### 수정 요청 프롬프트 (확인하다 문제가 생겼을 때)
```
[수정 요청] P__ Step __ 결과를 확인했는데 아래가 PRD와 달라.
- 내가 한 것: (예: 세대별 랭킹에서 30대 탭을 눌렀음)
- 기대한 결과: (PRD 6. 완료 기준의 몇 번)
- 실제 결과: (화면 캡처 또는 터미널 오류 메시지 그대로)
PRD 범위 안에서만 고치고, 고친 이유와 바뀐 파일을 알려줘.
```

## 4. PRD 형식

모든 PRD는 같은 순서로 씁니다.

| 순서 | 내용 |
|---|---|
| 1. 목적 | 이 프로그램이 왜 필요한지 |
| 2. 사용자 이야기 | "나는 ~로서 ~하고 싶다" |
| 3. 기능 요구사항 | 번호(FR) · 내용 · 필수/선택 |
| 4. 데이터 · API | 쓰는 테이블, API 주소, 주고받는 값 |
| 5. 규칙 · 예외 | 입력 제한, 오류 메시지, 로그인 필요 여부 |
| 6. 완료 기준 | 직접 해 보고 확인할 체크리스트 |
| 7. 범위 밖 | 이번 학기에 하지 않는 것 |
| 8. 바이브 코딩 프롬프트 | Step별로 AI에게 보낼 문장 |

## 5. 팀이 정해야 할 것 (PRD를 쓰면서 나온 것)

| 번호 | 내용 | 제안 | 관련 |
|---|---|---|---|
| D1 | 로그인 아이디 | **이메일** (Figma 웹 시작 화면도 이메일 입력칸) | P02 |
| D2 | 설문의 수면·생활 패턴·스트레스 질문 | **화면에서 빼기** (Figma 회원가입 완료 안내가 "다섯 가지 질문": 연령대·직업·선호 장르·비선호 장르·기억에 남는 작품) | P03 |
| D3 | 닉네임 중복 확인 | Figma처럼 **"중복 확인" 버튼** 추가 | P01 |
| D4 | 소셜 로그인(카카오·네이버·구글), 비밀번호 찾기 | **이번 학기 범위 밖**. 버튼은 두고 누르면 "준비 중이에요" 안내 (ERD에 소셜 계정 칸이 없고, 비밀번호 찾기는 메일 발송 서버가 필요) | P02 |
| D5 | 작품 상세 화면 | Figma에 없음 → **간단한 상세 팝업(모달)** 으로 만들기 | P06 |
| D6 | content 테이블 칸 추가 | Figma 카드에 보이는 값 저장용: `backdrop_url`, `age_rating`(12+ 등), `runtime_minutes`, `episode_count`, `tmdb_rating`, `tmdb_vote_count` | P04, P05 |
| D7 | ranking 테이블 칸 추가 | 화면의 "지수" 표시용 `score`. 집계 당시 값이라 나중에 다시 계산할 수 없어서 저장 필요 | P07 |
| D8 | 프로필 한 줄 소개("과제 끝나면, 좋은 이야기 한 편.") | ① 회원이 직접 입력(`member.bio` 칸 추가) ② AI가 자동 생성 중 선택 | P13 |
| D9 | 추천마다 다른 한 줄 이유 | ① 작품당 1개 `content.tagline` 사용 ② 추천마다 다른 문장 `recommendation.reason` 칸 추가 | P09 |
| D10 | AI 문구 생성에 쓸 LLM API와 키 | 비용·발급 담당 결정 (키 없으면 정해진 문장 틀로 대신 동작) | P09 |
| D11 | 상단 알림(종) 아이콘 | 이번 학기 범위 밖 (아이콘만 표시) | P05 |
| D12 | 시연용 가상 회원·평점 | 세대별 랭킹 시연에 필요. 가상 데이터라는 표시를 화면 하단에 남기기 (Figma 화면에도 "샘플" 표시가 있음) | P04, P08 |

## 6. Figma 화면 ↔ 프로그램

| Figma 화면 | 프로그램 |
|---|---|
| [웹 시작 화면](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=179-1801) · [로그인 창 열림](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=161-1637) | P02 |
| [회원가입](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=157-1355) · [회원가입 완료 안내](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=61-591) | P01 |
| [맞춤 추천 설문](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=39-3071) | P03 |
| [Home Feed](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=9-5) · [프로필 메뉴 열림](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=40-1849) | P05, P06 |
| [통합 랭킹](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-6421) | P07 |
| [세대별 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-33778) | P08 |
| [맞춤 추천](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-36577) | P09 |
| [재방문 추천 피드백](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=145-2341) | P10 |
| [나의 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2672) · [평점 반영 결과](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=224-4225) | P11 |
| [좋아요 표시한 작품](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2521) | P12 |
| [프로필 정보](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=130-846) · [취향 수정](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-5925) | P13 |
| [최근 관심사 반영 확인](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=224-5091) | P14 |
