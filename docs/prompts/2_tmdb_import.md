# 2 작품 데이터 수집 — 프롬프트 사용 기록

- PRD: [docs/prd/2-1_tmdb_import.md](../prd/2-1_tmdb_import.md)
- 요청·확인: 홍준화 (기록 3은 정준교) / 코드 작성: AI(Claude Code)

> **원문에 대해 (정직하게)**: 2-1 작업(11/17)은 claude.ai 의 다른 Claude Code 세션에서 해서, 그때 보낸 문장 원문이 이 저장소나 지금 PC 에 남아 있지 않습니다.
> 아래 "보낸 프롬프트"는 커밋 기록·PRD Step 프롬프트·작업 일지로 다시 정리한 것이고, 원래 대화는 각 기록의 **세션 주소**에서 볼 수 있습니다.
> 세션에서 원문을 찾으면 이 칸에 그대로 붙여 넣어 주세요. (11/23 정리 — 홍준화 요청)

---

### 기록 1 — 2-1 Step 1~3 (TMDB 연결 · import_tmdb 명령 · 시연 데이터 seed_demo)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/17 |
| 보낸 프롬프트 | 원문 기록 없음 — 세션 `https://claude.ai/code/session_01Bv65Y69YU5vXvKL3GgBA6h` (3-1 과 같은 세션). 커밋 내용으로 보면 PRD 2-1 Step 1~3 을 순서대로 요청 |
| 기준 PRD | 2-1 [8. 바이브 코딩 프롬프트](../prd/2-1_tmdb_import.md) **Step 1** TMDB 연결 모듈(키는 `.env`, 3번 재시도·0.25초 쉬기) · **Step 2** `import_tmdb`(FR1~FR7: 장르 연결 표·상황 규칙 표, `update_or_create`, 6개 OTT 없으면 건너뜀, 가짜 TMDB 응답 테스트) · **Step 3** `seed_demo`(FR8: 연령대 6 × 10명 = 가상 회원 60명, 0.5 단위 평점·좋아요, seed 고정, `--clear`) |
| AI가 한 일 | `backend/core/tmdb.py`(TMDB 호출·재시도, 장르는 TMDB 장르 번호로 연결, OTT 6개는 TMDB 한국 제공처 이름으로 연결, 상황(TPO) 연결 규칙, OTT 바로가기 = 각 OTT **검색 주소** — 작품별 공식 주소가 TMDB 에 없음), 명령 `import_tmdb`·`seed_demo`, 가짜 TMDB 응답 테스트 7개(그때 총 21개), `backend/README.md` 사용법·TMDB 키 받는 법. PRD 와 다르게 한 것: 기본 수집 수를 영화 100 + 시리즈 100 으로 (PRD Step 2 예시는 500 + 500 — `--movies`·`--series` 로 늘릴 수 있음) |
| 결과 | 커밋 [`9cda9f9`](https://github.com/jungyojeong16-arch/team-project/commit/9cda9f9) · 실제 수집 확인 반영 [`6eab85c`](https://github.com/jungyojeong16-arch/team-project/commit/6eab85c) · `backend/core/tmdb.py`, `management/commands/import_tmdb.py`, `seed_demo.py`, `tests.py`(ImportTmdbTests·SeedDemoTests), `config/settings.py`, `.env.example` |
| 확인 | **11/17** 실제 TMDB 로 영화 20 + 시리즈 20 수집 — OTT 6개 이름 연결·장르 번호 일치, 다시 실행하면 수정만 (PRD 상태 칸) <br> **11/23 홍준화 PC DB 확인** <br> - [x] 작품 200개(영화 100·시리즈 100), 같은 (tmdb_id, 유형) 중복 0개 → 다시 실행해도 두 배가 되지 않음 (테스트 `test_running_twice_updates_instead_of_duplicating` 도 통과) <br> - [x] 200개 모두 포스터 주소·장르·제공 OTT·상황(TPO) 연결 있음 (OTT별: 넷플릭스 95, 디즈니+ 57, 왓챠 48, 웨이브 37, 티빙 34, 쿠팡플레이 1) <br> - [x] `seed_demo` → 가상 회원 60명·평점 1,850개, `--clear` 는 테스트 `test_seed_and_clear` 로 확인 (진짜 회원은 그대로) <br> - [x] `python manage.py test core` 통과 (11/23 기준 전체 74개) <br> - [ ] `deeplink_url` 을 열면 OTT 검색 화면이 나오는지 — 6개 OTT 직접 열어 보기 남음 |
| 수정 요청 | 없음 (TMDB 키 형식 문제는 기록 3) |

### 기록 2 — 2-1 Step 4 (D6 작품 카드 칸)
0번 기록 7(11/17, D6·D7 반영)과 같은 작업입니다 → [0_common_base.md 기록 7](0_common_base.md)

### 기록 3 — TMDB 짧은 API 키도 받기 (수정)
| 칸 | 내용 |
|---|---|
| 날짜 | 11/17 |
| 보낸 프롬프트 | 원문 기록 없음 — 세션 `https://claude.ai/code/session_01AGHPrWPVMewxqzuUC2ocdc`. 작업 일지(`docs/WORKLOG.md` 11/17 "0-1 DB 칸 추가 (D6·D7) + TMDB 키 형식 수정")에는 **요청: 정준교** 로 적혀 있음. 11/21 팀 공지: "TMDB 키 문제 해결 → 작품 데이터 수집 성공 (32자 짧은 API 키도 이제 그대로 쓸 수 있어요)" |
| 기준 PRD | 2-1 FR (TMDB 키는 `backend/.env` 의 `TMDB_API_TOKEN`) — Step 프롬프트에 없던 수정 |
| AI가 한 일 | `tmdb.py`: 긴 "API 읽기 액세스 토큰"뿐 아니라 32자 짧은 "API 키"도 받게 함, 붙여 넣을 때 섞인 따옴표·`Bearer ` 를 지움, 키 오류 안내에 키 길이를 보여 줌(키 자체는 안 보여 줌). 테스트 추가 |
| 결과 | 커밋 [`2c8e557`](https://github.com/jungyojeong16-arch/team-project/commit/2c8e557) · `backend/core/tmdb.py`, `tests.py`(`test_token_forms`), `backend/README.md` |
| 확인 | - [x] 테스트 `test_token_forms` 통과 <br> - [x] 정준교 PC 에서 짧은 API 키로 수집 성공 (11/21, PRD 상태 칸) |
| 수정 요청 | — (이 기록 자체가 수집이 안 되던 문제에 대한 수정) |
