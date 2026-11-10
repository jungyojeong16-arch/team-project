# P04 작품 데이터 수집 · 시연 데이터

| 항목 | 내용 |
|---|---|
| 상태 | ⬜ 예정 (11/17주, 가장 먼저) |
| Figma | 화면 없음 (관리자 명령). 모든 화면의 작품 카드가 이 데이터를 씀 |
| 코드(예정) | `backend/core/management/commands/import_tmdb.py`, `seed_demo.py`, `backend/core/tmdb.py` |
| 테이블 | `content`, `genre`, `content_genre`, `ott_platform`, `content_platform`, `tpo`, `content_tpo` (+ 시연용 `member`, `rating`) |
| 필요한 것 | TMDB API Read Access Token (`backend/.env` 의 `TMDB_API_TOKEN`) |
| 검수 | 정준교(DB), 홍준화(데이터 범위) |

## 1. 목적
홈·랭킹·추천에 쓸 **진짜 영화·시리즈 정보**(제목·줄거리·포스터·장르·제공 OTT)를 TMDB에서 가져와 DB에 채운다.
세대별 랭킹처럼 회원 평점이 많이 필요한 화면을 시연하기 위해 **가상 회원·평점**도 만든다.

## 2. 사용자 이야기
- 개발자로서, 명령어 한 줄로 작품 수백 개를 DB에 채우고 싶다.
- 발표자로서, 실제 사용자가 적어도 세대별 랭킹이 어떻게 보이는지 시연하고 싶다.

## 3. 기능 요구사항
| ID | 내용 | 구분 |
|---|---|---|
| FR1 | `python manage.py import_tmdb` : 한국어(ko-KR)로 인기 영화·시리즈를 가져와 `content`에 저장 (기본 영화 300 + 시리즈 300) | 필수 |
| FR2 | 같은 작품을 다시 가져오면 새로 만들지 않고 **수정** (`tmdb_id` + `content_type` 기준) | 필수 |
| FR3 | TMDB 장르 → ViewFit 장르 12개로 연결해 `content_genre` 저장 (아래 표) | 필수 |
| FR4 | TMDB 한국(KR) 제공처 정보로 `content_platform` 저장. ViewFit 6개 OTT만 | 필수 |
| FR5 | `deeplink_url`: 각 OTT의 작품 검색 주소 + 제목 (예: 넷플릭스 검색 결과로 이동) | 필수 |
| FR6 | 장르 → 상황(TPO) 규칙으로 `content_tpo` 저장 (아래 표) | 필수 |
| FR7 | 6개 OTT 중 어디에도 없는 작품은 저장하지 않음 (OTT 큐레이션 서비스라서) | 필수 |
| FR8 | `python manage.py seed_demo` : 연령대별 가상 회원 60명(`@demo.viewfit.local`)과 평점·좋아요 생성. `--clear` 로 전부 삭제 | 필수 |
| FR9 | 화면 맨 아래 TMDB 로고와 출처 문구 ("This product uses the TMDB API but is not endorsed or certified by TMDB.") | 필수 |
| FR10 | (D6 결정 시) `backdrop_url`, `age_rating`, `runtime_minutes`, `episode_count`, `tmdb_rating`, `tmdb_vote_count` 도 저장 | 선택 |

### 장르 연결
| ViewFit | TMDB 영화 | TMDB 시리즈 |
|---|---|---|
| 드라마 | Drama | Drama |
| 로맨스 | Romance | (TMDB 시리즈 장르에 없음 → TMDB 키워드 "romance" 가 붙은 시리즈만 로맨스로 연결) |
| 코미디 | Comedy | Comedy |
| 액션 | Action, Adventure | Action & Adventure |
| 스릴러 | Thriller, Crime | Crime |
| 미스터리 | Mystery | Mystery |
| SF | Science Fiction | Sci-Fi & Fantasy |
| 판타지 | Fantasy | Sci-Fi & Fantasy |
| 공포 | Horror | (없음) |
| 다큐멘터리 | Documentary | Documentary |
| 애니메이션 | Animation | Animation |
| 예능 | (없음) | Reality, Talk |

### 상황(TPO) 규칙 (처음 버전 — 추천 품질을 보며 조정)
| 상황 | 이런 장르면 연결 |
|---|---|
| 혼자 보는 밤 | 스릴러, 미스터리, 공포, SF |
| 퇴근 후 | 코미디, 예능, 애니메이션, 로맨스 |
| 주말에 함께 | 액션, 판타지, SF, 코미디 |
| 가족과 함께 | 애니메이션, 다큐멘터리, 코미디(관람등급 12세 이하) |
| 여행이 필요할 때 | 다큐멘터리, 드라마, 로맨스 |

## 4. 데이터 · API
- TMDB 주소: `/discover/movie`, `/discover/tv` (watch_region=KR, 인기순), `/{type}/{id}/watch/providers`, `/genre/{type}/list`
- 인증: 헤더 `Authorization: Bearer <TMDB_API_TOKEN>` — 키는 `backend/.env` 에만
- 포스터 주소: `https://image.tmdb.org/t/p/w500` + poster_path

## 5. 규칙 · 예외
- 키가 없으면 "backend/.env 에 TMDB_API_TOKEN 을 넣어 주세요" 를 보여 주고 멈춘다.
- TMDB 요청이 실패하면 3번까지 다시 시도하고, 그래도 실패한 작품은 건너뛰고 마지막에 개수를 알려 준다.
- 요청 사이에 짧게 쉬어서 TMDB 사용량 제한을 넘지 않게 한다.
- 시연 데이터는 실제 회원과 섞이지 않게 이메일 도메인으로 구분하고, 발표·보고서에서 "가상 데이터"라고 밝힌다 (D12).

## 6. 완료 기준
- [ ] `python manage.py import_tmdb` 실행 → 끝에 "영화 N개, 시리즈 N개 저장" 출력
- [ ] 한 번 더 실행해도 작품 수가 두 배가 되지 않는다
- [ ] 관리자 페이지 **작품**에서 포스터 주소·장르·제공 OTT·상황이 채워져 있다
- [ ] 아무 작품의 `deeplink_url` 을 열면 해당 OTT 검색 화면이 나온다
- [ ] `seed_demo` → 회원 60명·평점 생성, `seed_demo --clear` → 전부 삭제 (진짜 회원은 그대로)
- [ ] `python manage.py test core` 통과 (TMDB 응답은 가짜 데이터로 테스트)

## 7. 범위 밖
- 매일 자동으로 새 작품 가져오기 (배포 후 필요하면 추가)
- OTT 앱 안의 작품 페이지로 바로 가는 링크 (OTT들이 공식 주소를 공개하지 않아 검색 주소로 대신)

## 8. 바이브 코딩 프롬프트
### Step 1 — TMDB 연결 모듈
```
docs/prd/P04_tmdb_import.md 를 읽고 Step 1 을 해 줘.
backend/core/tmdb.py 에 TMDB API 를 부르는 함수를 만들어 줘
(인기 영화/시리즈 목록, 작품별 KR 제공처, 장르 목록). 키는 settings 에서 os.environ['TMDB_API_TOKEN'] 으로 읽고,
backend/.env.example 에 TMDB_API_TOKEN= 줄을 추가해 줘. 실패 시 3번 재시도, 요청 사이 0.25초 쉬기.
아직 DB 에 저장하지는 마.
```
### Step 2 — import_tmdb 명령
```
docs/prd/P04_tmdb_import.md 의 FR1~FR7 을 구현해 줘.
backend/core/management/commands/import_tmdb.py 를 만들어
--movies 300 --series 300 옵션으로 작품을 가져오고, PRD 의 장르 연결 표·상황 규칙 표대로
content, content_genre, content_platform(deeplink_url 포함), content_tpo 를 저장해 줘.
같은 (tmdb_id, content_type) 은 update_or_create 로 수정만 해.
6개 OTT 어디에도 없는 작품은 건너뛰고, 마지막에 저장·수정·건너뜀 개수를 출력해 줘.
테스트는 TMDB 응답을 가짜(mock)로 만들어 tests.py 에 추가해 줘.
```
### Step 3 — 시연 데이터
```
docs/prd/P04_tmdb_import.md 의 FR8 을 구현해 줘.
backend/core/management/commands/seed_demo.py: 연령대 6개 × 10명 = 가상 회원 60명(이메일 demoNN@demo.viewfit.local),
각 회원이 작품 20~40개에 0.5 단위 평점을 남기고 일부는 좋아요를 누르게 해 줘.
연령대마다 좋아하는 장르를 조금 다르게 해서 세대별 랭킹에 차이가 보이게 해 줘. 같은 결과가 나오도록 random seed 고정.
--clear 는 @demo.viewfit.local 회원과 그 기록만 지워.
```
### Step 4 — (D6 결정 후) 카드 표시용 칸
```
DB 담당이 D6 을 승인했어. content 에 backdrop_url, age_rating, runtime_minutes, episode_count,
tmdb_rating, tmdb_vote_count 칸을 추가하는 migration 을 만들고 import_tmdb 에서 채워 줘.
docs/erd/ViewFit_ERD_physical.md 의 content 칸 목록도 같이 고쳐 줘.
```
