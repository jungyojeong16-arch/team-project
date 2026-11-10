# ViewFit 물리 설계 (테이블 14개)

- 기준: 최종 개념 ERD (`docs/erd/ViewFit_ERD_midterm_final.drawio`)
- 그림: `docs/erd/ViewFit_ERD_physical.drawio` (미리보기 `ViewFit_ERD_physical_preview.png`)
- 코드: `backend/core/models.py` (Django 모델 → `python manage.py migrate` 하면 MariaDB에 그대로 만들어짐)
- 교수님 안내에 따라 물리 설계는 AI의 도움을 받아 진행했습니다.

## 1. 개념 ERD → 테이블

| 개념 ERD | 종류 | 테이블 | 한글 |
|---|---|---|---|
| 회원 | 엔터티 | `member` | 회원 |
| 작품 | 엔터티 | `content` | 작품 |
| 장르 | 엔터티 | `genre` | 장르 |
| OTT | 엔터티 | `ott_platform` | OTT 플랫폼 |
| TPO | 엔터티 | `tpo` | TPO(상황) |
| 랭킹 | 엔터티 (작품 1 : N) | `ranking` | 랭킹 |
| ◇ 평가한다 | 회원 N : M 작품 | `rating` | 평점 |
| ◇ 좋아요 | 회원 N : M 작품 | `content_like` | 좋아요 |
| ◇ 시청한다 | 회원 N : M 작품 | `watch_history` | 시청 이력 |
| ◇ ai에게 추천 받는다 | 회원 N : M 작품 | `recommendation` | AI 추천 |
| ◇ 선호한다 | 회원 N : M 장르 | `genre_preference` | 장르 취향 |
| ◇ 속한다 | 작품 N : M 장르 | `content_genre` | 작품 장르 |
| ◇ 제공된다 | 작품 N : M OTT | `content_platform` | 작품 제공 OTT |
| ◇ TPO 추천 | 작품 N : M TPO | `content_tpo` | 작품 TPO |

마름모(N:M 관계) 8개가 연결 테이블 8개가 되고, 연결 테이블마다 양쪽 엔터티의 기본키를 **외래키 2개**로 가져옵니다.
(Django가 로그인·권한용으로 자동으로 만드는 `auth_*`, `django_*`, `member_groups` 같은 테이블은 14개에 세지 않았습니다.)

## 2. 테이블별 칸

| 테이블 | 칸 (PK 기본키 · FK 외래키 · UK 중복 불가 · ? 비어 있어도 됨) |
|---|---|
| member | PK id, UK email, UK nickname, password, age_group?, job?, marketing_opt_in, terms_agreed_at?, survey_completed_at?, date_joined, is_active, is_staff |
| content | PK id, tmdb_id?, title, content_type, overview, poster_url, release_year?, tagline |
| genre | PK id, UK name, UK tmdb_id? |
| ott_platform | PK id, UK code, UK name |
| tpo | PK id, UK name |
| ranking | PK id, FK content_id, period, ranked_on, rank |
| rating | PK id, FK member_id, FK content_id, score, comment, age_group_at_rating?, rated_at, updated_at |
| content_like | PK id, FK member_id, FK content_id, liked_at |
| watch_history | PK id, FK member_id, FK content_id, source, watched_at |
| recommendation | PK id, FK member_id, FK content_id, FK tpo_id?, rank, feedback, recommended_at |
| genre_preference | PK id, FK member_id, FK genre_id, kind |
| content_genre | PK id, FK content_id, FK genre_id |
| content_platform | PK id, FK content_id, FK platform_id, deeplink_url |
| content_tpo | PK id, FK content_id, FK tpo_id |

## 3. 이런 점을 주의해서 이렇게 만들었습니다

### ① 모든 테이블의 기본키는 "번호(id)"
개념 ERD에서는 회원의 기본키가 "아이디"였지만, 물리 설계에서는 **자동으로 늘어나는 번호(id)** 를 기본키로 두었습니다.
- 이메일이나 닉네임은 바뀔 수 있는데, 기본키가 바뀌면 그 값을 외래키로 쓰는 모든 테이블을 같이 고쳐야 합니다.
- 번호는 절대 바뀌지 않고, 숫자라서 비교·검색도 빠릅니다.
- 대신 로그인에 쓰는 **이메일**과 화면에 보이는 **닉네임**은 `UK(중복 불가)`로 막았습니다.

### ② 한 번만 있어야 하는 관계 → "두 외래키 조합 중복 금지"
평점, 좋아요, 장르 취향, 작품 장르, 작품 제공 OTT, 작품 TPO는 **같은 조합이 두 번 들어가면 안 됩니다.**
- 예: 한 회원이 같은 작품에 평점을 두 번 → 평균 평점이 틀어짐. 다시 평가하면 **기존 평점을 수정**합니다.
- 예: 같은 장르를 선호와 비선호에 동시에 → `(member_id, genre_id)` 중복 금지로 막음.
- 개념 ERD에서 말한 "복합 기본키"와 같은 효과입니다. Django는 기본키를 칸 1개로 쓰는 게 표준이라 **번호 PK + (외래키 2개) 중복 금지(UNIQUE)** 로 만들었습니다.

### ③ 여러 번 생길 수 있는 관계 → 중복을 막지 않음
**시청 이력**과 **AI 추천**은 일부러 중복을 허용했습니다.
- 같은 작품을 다시 볼 수 있고(정주행 두 번), 같은 작품이 다른 날 다시 추천될 수 있습니다.
- 그래서 (회원, 작품)을 기본키로 쓰면 두 번째 기록이 막히므로, **시청이력번호·추천번호**를 따로 두었습니다.
- 대신 "내 최근 시청 기록", "오늘의 추천"을 빨리 찾도록 `(회원, 시간)` 색인(Index)을 걸었습니다.

### ④ 평가 당시 연령대는 따로 저장
세대별 랭킹은 "20대가 준 평점"을 모아야 합니다. 그런데 회원의 연령대는 해가 지나면 바뀝니다.
- 회원 테이블의 연령대만 보면, 작년에 20대였던 사람의 평점이 지금은 30대 평점으로 바뀌어 버립니다.
- 그래서 평점을 남기는 순간의 연령대를 `rating.age_group_at_rating` 에 **복사해서** 저장합니다. (코드에서 자동으로 채움)

### ⑤ 계산할 수 있는 값은 저장하지 않음
평균 평점, 평가 수, 세대별 평균, 장르 비율, "비슷한 취향 3,241명이 선택" 같은 숫자는 **테이블에 칸을 만들지 않았습니다.**
- `rating`, `recommendation` 에 원본이 있으니 필요할 때 계산합니다(SQL `AVG`, `COUNT`).
- 따로 저장하면 원본이 바뀔 때 같이 고치지 않는 순간 값이 틀어집니다(정규화).

### ⑥ 값의 범위를 DB에서 막음
- **별점**: `DECIMAL(2,1)` + 0.5, 1.0, …, 5.0 만 들어가게 `CHECK` 제약을 걸었습니다. 4.3 같은 값은 DB가 거부합니다.
- **연령대·직업·작품유형·피드백 상태** 등은 정해진 값 목록(선택지)만 쓰게 했습니다.
- 설문에서 "응답 안 함"을 고르면 연령대·직업은 **비워 둡니다(NULL)**.

### ⑦ 개념 ERD에서 생략했던 칸을 화면(Figma) 기준으로 보완
| 추가한 칸 | 이유 (화면) |
|---|---|
| member.nickname | 회원가입 화면의 닉네임(중복 확인) |
| member.marketing_opt_in, terms_agreed_at | 회원가입 화면의 약관·마케팅 동의 |
| member.survey_completed_at | 로그인 후 설문을 안 한 회원은 설문 화면으로 보내기 (11/10 추가) |
| content.tmdb_id | 작품 정보·포스터를 TMDB에서 가져오기 위한 번호 |
| content.tagline | 맞춤 추천 화면의 한 줄 큐레이션 |
| ranking.period, ranked_on | 통합 랭킹의 주간/월간 탭, 날짜별 순위 등락 계산 |
| recommendation.tpo_id, feedback | 어떤 상황에서 추천했는지, 재방문 추천 피드백 화면 |
| watch_history.source | 설문에서 입력한 작품인지, 직접 기록한 작품인지 |
| ott_platform.code | 화면의 OTT 뱃지(NETFLIX, TVING …)와 연결 |

### ⑧ 그 밖에
- **비밀번호**는 그대로 저장하지 않고 Django가 **암호화(해시)** 해서 저장합니다.
- **한글·이모지**가 깨지지 않게 DB 문자셋을 `utf8mb4` 로 맞췄습니다.
- 회원이나 작품이 삭제되면 그 회원·작품의 평점·좋아요 등도 **같이 삭제**됩니다. 추천 기록의 상황(TPO)이 삭제될 때만 추천은 남기고 상황 칸을 비웁니다.
- TMDB는 영화와 시리즈 번호를 따로 매기므로, 작품은 `(tmdb_id, content_type)` 조합으로 중복을 막았습니다.

## 4. 기본으로 들어가는 데이터
`python manage.py migrate` 를 하면 아래 값이 자동으로 들어갑니다 (`backend/core/migrations/0002_seed_basics.py`).
- 장르 12개: 드라마, 로맨스, 코미디, 액션, 스릴러, 미스터리, SF, 판타지, 공포, 다큐멘터리, 애니메이션, 예능
- OTT 6개: 넷플릭스, 티빙, 쿠팡플레이, 웨이브, 디즈니+, 왓챠
- 상황 5개: 혼자 보는 밤, 퇴근 후, 주말에 함께, 가족과 함께, 여행이 필요할 때

## 5. 팀이 정해야 할 것
- **로그인 방식**: 지금은 이메일 로그인으로 만들었습니다. 로그인 팝업의 "아이디"를 이메일로 통일할지 정해 주세요.
- **설문 항목**: 지금 프론트엔드 설문 코드에는 수면 시간·생활 패턴·스트레스 질문이 더 있지만, ERD와 Figma에는 없어서 저장하지 않습니다. 화면에서 뺄지, ERD에 추가할지 정해 주세요.
