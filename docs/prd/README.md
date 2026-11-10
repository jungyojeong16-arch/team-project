# ViewFit 프로그램 목록 · PRD · 바이브 코딩 프롬프트

- 기준: **Figma 화면 16개**([Figma 파일](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq)) + **물리 ERD**(`docs/erd/ViewFit_ERD_physical.md`). 둘 중 어디에도 없는 기능은 넣지 않았습니다.
- 진행 방식 (교수님 안내): **① 기능을 프로그램 목록으로 구체화 → ② 프로그램마다 PRD 작성 → ③ PRD로 단계별 프롬프트 작성 → ④ 단계별 바이브 코딩 → ⑤ 완료 기준으로 확인**
- 구성 (팀장 안): **0번 공통 기반을 3명이 먼저 함께 만들고**, 그 위에 1~8번 기능을 담당자별로 나눠 세부 진행합니다.

## 1. 프로그램 목록

우선순위: **P1** 반드시 / **P2** 시간 남으면 · 상태: ✅ 완료 · 🟡 일부 · ⬜ 예정

| # | 프로그램 | 기능 | 담당 |
|---|---|---|---|
| **0** | **공통 기반 (0순위)** | 개발 환경·DB 스키마, 공통 규칙, 공통 레이아웃(상단 바·검색창·메뉴·하단)·공통 부품, 홈 화면 틀 | **3명 공동** |
| 1 | 회원관리 | 회원가입(이메일·닉네임 중복 확인·비밀번호 암호화), 웹 시작 화면, 로그인/로그아웃, 소셜 로그인(P2) | 정준교 |
| 2 | 작품 데이터 수집 | TMDB 작품 1,000개 수집, OTT 제공 정보·바로가기 주소, 상황(TPO) 연결, 시연용 가상 평점 생성 | 홍준화 |
| 3 | 취향 설문 | 연령대·직업·선호 장르·비선호 장르·기억에 남는 작품 (5문항) | 홍준화 |
| 4 | 작품 탐색 | 통합 검색, 작품 상세, OTT 바로가기 | 정재준 |
| 5 | 평가·좋아요 | 평점·감상(0.5점, 200자), 나의 평점, 평점 반영 결과, 좋아요와 목록 관리 | 정준교 |
| 6 | 랭킹 | 통합 랭킹(주간/월간 TOP 100, 필터, 순위 변동), 세대별 랭킹(TOP 30) | 정준교 |
| 7 | AI 추천 | 맞춤 추천 TOP 50(상황별), 한 줄 큐레이션 문구, 재방문 추천 피드백 | 홍준화 |
| 8 | 마이페이지 | 내 프로필(좋아요·평점 수, 취향 키워드, 장르 비율), 취향 수정, 최근 관심사 반영 | 정재준 |

### 세부 프로그램 (PRD 파일)
| 번호 | 세부 프로그램 | Figma 화면 | 주요 테이블 | 우선 | 주차 | 담당 | 상태 |
|---|---|---|---|---|---|---|---|
| [0-1~0-3](0_common_base.md) | 개발 환경·DB / 공통 규칙 / 공통 레이아웃·부품 | Home Feed 상단·하단, 프로필 메뉴 | 전체 | P1 | **11/10** | 3명 공동 | 🟡 0-1·0-3 ✅ / 0-2 회의 확정 ⬜ |
| [0-4](0-4_home.md) | 홈 화면 (틀 → 영역별 연결) | Home Feed | 조회만 | P1 | 11/10 틀 · 11/24 연결 | 3명 공동 | 🟡 틀 ✅ |
| [1-1](1-1_signup.md) | 회원가입 | 회원가입, 회원가입 완료 안내 | member | P1 | 11/17 | 정준교 | 🟡 |
| [1-2](1-2_login.md) | 웹 시작 화면·로그인·로그아웃 | 웹 시작 화면, 로그인 창 | member, authtoken | P1 (소셜 P2) | 11/17 | 정준교 | 🟡 |
| [2-1](2-1_tmdb_import.md) | 작품 데이터 수집·시연 데이터 | (관리자 명령) | content, content_genre, content_platform, content_tpo | P1 | 11/17 | 홍준화 | ⬜ |
| [3-1](3-1_survey.md) | 맞춤 추천 설문 | 맞춤 추천 설문 | member, genre_preference, watch_history | P1 | 11/17 | 홍준화 | 🟡 |
| [4-1](4-1_search_detail.md) | 작품 검색·상세·OTT 바로가기 | 상단 검색창, 상세 정보·바로 보기 버튼 | content, content_platform, watch_history | P1 | 11/24 | 정재준 | ⬜ |
| [5-1](5-1_rating.md) | 평점 (작성·나의 평점·반영 결과) | 나의 평점, 평점 반영 결과 | rating, ranking | P1 | 12/1 | 정준교 | ⬜ |
| [5-2](5-2_like.md) | 좋아요 | 좋아요 표시한 작품 | content_like | P1 | 12/1 | 정준교 | ⬜ |
| [6-1](6-1_total_ranking.md) | 통합 랭킹 | 통합 랭킹 | ranking | P1 | 11/24 | 정준교 | ⬜ |
| [6-2](6-2_generation_ranking.md) | 세대별 랭킹 | 세대별 평점 | rating | P1 | 11/24 | 정준교 | ⬜ |
| [7-1](7-1_tpo_recommend.md) | 맞춤 추천 (TPO·AI) | 맞춤 추천 | recommendation, content_tpo | P1 | 11/24 | 홍준화 | ⬜ |
| [7-2](7-2_revisit_feedback.md) | 재방문 추천 피드백 | 재방문 추천 피드백 | recommendation, rating | P1 | 12/1 | 홍준화 | ⬜ |
| [8-1](8-1_profile_taste.md) | 프로필·취향 수정 | 프로필 정보, 취향 수정 | member, genre_preference, rating, content_like | P1 | 12/1 | 정재준 | 🟡 |
| [8-2](8-2_interest_update.md) | 최근 관심사 반영 | 최근 관심사 반영 확인 | recommendation, watch_history | P2 | 12/1 | 정재준 | ⬜ |

- 담당 = 그 PRD를 확정하고 바이브 코딩으로 만드는 사람. 각 PRD 위쪽 표에 **함께 확인**할 사람도 적어 두었습니다.
- Figma의 Watch 화면 2개는 쓰지 않습니다 (OTT 바로가기로 대신 — 4-1).

### Figma·ERD 기준으로 정리하면서 바꾼 점 (팀장 안 대비)
| 팀장 안 | 정리 | 이유 |
|---|---|---|
| 3번 "선호 OTT" | 선호 **장르**로 봄 | Figma 설문·ERD에 선호 OTT 없음 |
| 3번 "페르소나 8유형", "대화형 설문" | 뺌 | Figma에 화면 없음, ERD에 칸 없음. 넣으려면 ERD 수정 필요 |
| 4번 "선호 OTT 3개 표시" | 작품의 **제공 OTT** 뱃지 표시 | 위와 같음 |
| 7번 "맞춤 추천 TOP 10" | **TOP 50** | Figma 맞춤 추천 화면이 TOP 50 |
| 2번 "AI 임시 데이터 생성과 검토" | **시연용 가상 회원·평점 생성**(2-1 FR8) | 세대별 랭킹 시연에 필요 |
| 0번 "홈 화면 틀" | 0번에서 **틀만**, 영역별 데이터는 6·7번 담당이 연결 | 홈이 랭킹·추천 결과를 보여 주는 화면이라서 |

## 2. 진행 순서 · 주차

```
0 공통 기반 (3명) ──┬─ 1 회원관리 (정준교)
                    ├─ 2 작품 데이터 (홍준화) ──┬─ 3 설문의 '기억에 남는 작품'
                    │                           ├─ 4 작품 탐색 (정재준)
                    │                           ├─ 6 랭킹 (정준교) ── 5 평가·좋아요
                    │                           └─ 7 AI 추천 (홍준화) ── 8 마이페이지 (정재준)
                    └─ 0-4 홈 틀 ───────────── 6·7 끝나면 홈 영역 연결
```

| 주 | 정준교 | 홍준화 | 정재준 | 같이 |
|---|---|---|---|---|
| **11/10** | 0-1 팀원 세팅 돕기, 0-2 규칙 초안 | 0-2 규칙 확정, TMDB 키 발급 | **0-3 공통 레이아웃·부품**, 0-4 홈 틀 | **0번 회의** |
| 11/17 | 1-1, 1-2 (Figma 맞추기) | **2-1 작품 데이터**, 3-1 설문 | 0-3 마무리, 4-1 준비 | |
| 11/24 | 6-1, 6-2 랭킹 | 7-1 AI 추천 | 4-1 탐색 | 0-4 홈 연결 |
| 12/1 | 5-1, 5-2 평가·좋아요 | 7-2 피드백 | 8-1, 8-2 마이페이지 | AWS 배포 테스트 |
| 12/8 | | | | 통합 테스트·버그 수정·최종 발표 |
| 12/15 | | | | 보고서, GitHub 정리 |

## 3. 바이브 코딩 진행 방법

각 PRD의 **바이브 코딩 프롬프트**를 Step 순서대로 사용합니다.

1. AI(Claude Code)에게 아래 **공통 컨텍스트 프롬프트**를 먼저 보냅니다 (새 대화마다 한 번).
2. 해당 PRD의 Step 1 프롬프트를 보냅니다.
3. AI가 만든 결과를 PRD의 **완료 기준**으로 직접 확인합니다.
4. 문제가 있으면 아래 **수정 요청 프롬프트**로 고칩니다.
5. 통과하면 다음 Step으로. 마지막 Step까지 끝나면 GitHub에 올리고 목록의 상태를 ✅로 바꿉니다.

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
- 공통 규칙과 공통 부품: docs/prd/0_common_base.md (화면을 만들 때 app/_components/ 의 공통 부품을 먼저 써)
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
[수정 요청] (프로그램 번호, 예: 6-2) Step (번호) 결과를 확인했는데 아래가 PRD와 달라.
- 내가 한 것: (예: 세대별 랭킹에서 30대 탭을 눌렀음)
- 기대한 결과: (PRD 완료 기준의 몇 번째 항목)
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

## 5. 팀이 정해야 할 것 (0번 회의 안건)

| 번호 | 내용 | 제안 | 관련 |
|---|---|---|---|
| D1 | 로그인 아이디 | **이메일** (Figma 웹 시작 화면도 이메일 입력칸) | 1-2 |
| D2 | 설문의 수면·생활 패턴·스트레스 질문 | **화면에서 빼기** (Figma 회원가입 완료 안내가 "다섯 가지 질문") | 3-1 |
| D3 | 닉네임 중복 확인 | Figma처럼 **"중복 확인" 버튼** | 1-1 |
| D4 | 소셜 로그인(카카오·네이버·구글), 비밀번호 찾기 | **P2**. 버튼은 두고 누르면 "준비 중이에요" (ERD에 소셜 계정 칸이 없고, 비밀번호 찾기는 메일 발송 서버가 필요) | 1-2 |
| D5 | 작품 상세 화면 | Figma에 없음 → **간단한 상세 팝업** | 4-1 |
| D6 | content 테이블 칸 추가 | Figma 카드에 보이는 값: `backdrop_url`, `age_rating`(12+ 등), `runtime_minutes`, `episode_count`, `tmdb_rating`, `tmdb_vote_count` | 2-1, 0-4 |
| D7 | ranking 테이블 칸 추가 | 화면의 "지수" 표시용 `score` (집계 당시 값이라 저장 필요) | 6-1 |
| D8 | 프로필 한 줄 소개("과제 끝나면, 좋은 이야기 한 편.") | ① 회원이 직접 입력(`member.bio` 추가) ② AI 자동 생성 | 8-1 |
| D9 | 추천마다 다른 한 줄 이유 | ① 작품당 1개 `content.tagline` ② 추천마다 `recommendation.reason` 추가 | 7-1 |
| D10 | AI 문구에 쓸 LLM API와 키 | 비용·발급 담당 결정 (키 없으면 정해진 문장 틀로 동작) | 7-1 |
| D11 | 상단 알림(종) 아이콘 | 범위 밖 (아이콘만 표시) | 0-3 |
| D12 | 시연용 가상 회원·평점 | 사용하되 화면 하단에 "가상 데이터 포함" 표시 | 2-1, 6-2 |

> D6·D7·D8·D9처럼 **테이블을 바꾸는 결정은 DB 담당(정준교)이 ERD 문서와 함께 반영**합니다.

## 6. Figma 화면 ↔ 프로그램

| Figma 화면 | 프로그램 |
|---|---|
| [Home Feed](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=9-5) · [프로필 메뉴 열림](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=40-1849) | 0-3, 0-4 |
| [웹 시작 화면](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=179-1801) · [로그인 창 열림](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=161-1637) | 1-2 |
| [회원가입](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=157-1355) · [회원가입 완료 안내](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=61-591) | 1-1 |
| [맞춤 추천 설문](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=39-3071) | 3-1 |
| (상단 검색창, 상세 정보·바로 보기 버튼) | 4-1 |
| [나의 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2672) · [평점 반영 결과](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=224-4225) | 5-1 |
| [좋아요 표시한 작품](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-2521) | 5-2 |
| [통합 랭킹](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-6421) | 6-1 |
| [세대별 평점](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-33778) | 6-2 |
| [맞춤 추천](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=144-36577) | 7-1 |
| [재방문 추천 피드백](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=145-2341) | 7-2 |
| [프로필 정보](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=130-846) · [취향 수정](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=220-5925) | 8-1 |
| [최근 관심사 반영 확인](https://www.figma.com/design/MCj90ViECjscPBHzbGNyqq?node-id=224-5091) | 8-2 |
