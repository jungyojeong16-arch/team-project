# ViewFit 백엔드 (Python · Django · MariaDB)

## 폴더 구조
```
backend/
├─ manage.py            Django 명령어 실행 파일
├─ requirements.txt     설치할 Python 패키지 목록
├─ .env.example         설정 예시 (복사해서 .env 로 만들기)
├─ config/              프로젝트 설정 (settings.py, urls.py)
└─ core/                ViewFit 기능
   ├─ models.py         테이블 14개 정의 (물리 ERD)
   ├─ tmdb.py           2-1 TMDB 연결 · 장르/OTT/상황 연결 규칙
   ├─ management/commands/  import_tmdb(작품 수집), seed_demo(시연용 가상 평점)
   ├─ common.py         0번 공통 도구: offset·limit 목록, 필터, 작품 카드용 목록
   ├─ serializers.py    입력 검사 · 응답 모양 (작품 카드 ContentCardSerializer 포함)
   ├─ admin.py          관리자 페이지 설정
   ├─ views.py, urls.py API
   └─ migrations/       테이블 생성 기록 + 기본 데이터(장르·OTT·상황)
```
테이블 설명: `docs/erd/ViewFit_ERD_physical.md`

---

## 처음 한 번만 하는 준비 (Windows 기준)

### 1. 프로그램 설치
- **Python 3.12** (python.org) — 설치 첫 화면에서 **"Add python.exe to PATH" 체크**
- **MariaDB 11.x** (mariadb.org/download) — 설치 중에 **root 비밀번호**를 정하고 꼭 기억하기
  (함께 설치되는 **HeidiSQL** 로 DB 안의 표를 눈으로 볼 수 있음)

### 2. MariaDB 에 ViewFit 데이터베이스 만들기
시작 메뉴 → **"MySQL Client (MariaDB ...)"** 실행 → root 비밀번호 입력 후 아래를 그대로 붙여넣기
```sql
CREATE DATABASE viewfit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'viewfit'@'localhost' IDENTIFIED BY 'viewfit1234';
CREATE USER 'viewfit'@'127.0.0.1' IDENTIFIED BY 'viewfit1234';
GRANT ALL PRIVILEGES ON viewfit.* TO 'viewfit'@'localhost';
GRANT ALL PRIVILEGES ON viewfit.* TO 'viewfit'@'127.0.0.1';
FLUSH PRIVILEGES;
```
> 비밀번호(viewfit1234)를 바꿨다면 아래 `.env` 의 `DB_PASSWORD` 도 똑같이 바꾸세요.

### 3. 가상환경 만들고 패키지 설치
VS Code 에서 프로젝트 폴더를 열고 **터미널(Ctrl + `)** 에서:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
- `activate` 할 때 "스크립트를 실행할 수 없습니다" 오류가 나면 아래를 한 번 실행한 뒤 다시 시도하세요.
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- 터미널 맨 앞에 `(.venv)` 가 보이면 가상환경이 켜진 것입니다.

### 4. 테이블 만들기 + 관리자 계정
```powershell
python manage.py migrate
python manage.py createsuperuser
```
- `migrate`: 테이블 14개를 만들고 장르 12개 · OTT 6개 · 상황 5개를 넣습니다.
- `createsuperuser`: 관리자 페이지에 들어갈 이메일·닉네임·비밀번호를 정합니다.

---

## 매번 서버 켜기
```powershell
cd backend
.venv\Scripts\activate
python manage.py runserver
```
브라우저에서 확인:
| 주소 | 내용 |
|---|---|
| http://127.0.0.1:8000/api/v1/health/ | 서버·DB 연결 상태, 테이블별 행 개수 |
| http://127.0.0.1:8000/api/v1/options/ | 설문 선택지 (연령대·직업·장르·OTT·상황) |
| http://127.0.0.1:8000/admin/ | 관리자 페이지 (데이터 직접 보기·추가) |

`health` 에서 `"database": "mysql"` 이 보이면 MariaDB 에 연결된 것입니다. (MariaDB 도 Django 에서는 mysql 로 표시됩니다)

## API 목록
주소 앞에 `http://127.0.0.1:8000/api/v1` 이 붙습니다. 🔒 는 로그인 필요 (요청 헤더 `Authorization: Token <토큰>`).

| 방식 | 주소 | 하는 일 |
|---|---|---|
| GET | `/health/` | 서버·DB 연결 상태 |
| GET | `/options/` | 설문 선택지 (연령대·직업·장르·OTT·상황) |
| GET | `/contents/?type=movie&platform=NETFLIX&genre=드라마&tpo=혼자 보는 밤&offset=0&limit=20` | 작품 카드 목록 (0번 공통, 평가 수 많은 순) |
| GET | `/auth/check-nickname/?nickname=준교` | 닉네임 사용 가능 여부 |
| POST | `/auth/signup/` | 회원가입 → 토큰 |
| POST | `/auth/login/` | 로그인 → 토큰 |
| POST | `/auth/logout/` 🔒 | 로그아웃 (토큰 삭제) |
| GET | `/me/` 🔒 | 내 정보 + 설문 결과 |
| PUT | `/me/survey/` 🔒 | 취향 설문 저장 (연령대·직업·선호/비선호 장르) |

## 작품 데이터 채우기 (2-1)
각자 PC 의 DB 에 한 번씩 실행합니다 (데이터는 GitHub 에 올라가지 않음).

1. **TMDB 키 받기** (한 명만 받아서 단톡방에 공유해도 됨 — GitHub·노션에는 올리지 않기)
   themoviedb.org 가입 → 오른쪽 위 프로필 → **설정 → API** → API 키 신청(개인·학습용) →
   **"API 읽기 액세스 토큰"**(eyJ… 로 시작하는 긴 문자열)을 복사
2. `backend/.env` 맨 아래 `TMDB_API_TOKEN=` 뒤에 붙여넣기 (`.env` 가 없으면 `.env.example` 을 복사해서 만들기)
3. 실행
```powershell
python manage.py import_tmdb                          # 영화 100 + 시리즈 100 (기본, 몇 분 걸림)
python manage.py import_tmdb --movies 500 --series 500 # 더 많이
python manage.py seed_demo                            # 시연용 가상 회원 60명·평점 (작품 40개 이상 필요)
python manage.py seed_demo --clear                    # 가상 회원과 그 기록만 지우기
```
- `import_tmdb` 는 다시 실행해도 작품이 두 배가 되지 않고 수정만 됩니다. 6개 OTT 어디에도 없는 작품은 건너뜁니다.
- 끝나면 http://127.0.0.1:8000/api/v1/contents/ 에서 작품 카드 목록을 볼 수 있습니다.
- 가상 회원(`@demo.viewfit.local`)은 로그인할 수 없고, 발표·보고서에서 "가상 데이터"라고 밝힙니다 (D12).

## 새 API 를 만들 때 (0번 공통 규칙 — 1~8번 담당 공통)
`docs/prd/0_common_base.md` 0-2 규칙을 코드로 만들어 둔 것입니다. 직접 만들지 말고 가져다 쓰세요.

| 쓰는 것 | 하는 일 |
|---|---|
| `common.paginate(qs, request, 시리얼라이저)` | 목록 응답을 `{count, offset, limit, next_offset, results}` 로. limit 기본 20, 최대 100. `next_offset` 이 null 이면 마지막 묶음 |
| `common.filter_contents(qs, request.query_params)` | 필터 바 값으로 거르기: `type`(all/movie/series), `platform`(NETFLIX…), `genre`(드라마…), `tpo`(혼자 보는 밤…) |
| `common.contents_for_cards(qs)` | 작품 카드에 필요한 장르·OTT·평점을 한 번에 불러오기 (평균은 조회 때 계산) |
| `serializers.ContentCardSerializer` | 작품 카드 응답 모양 — 프론트 `app/_lib/viewfit.ts` 의 `Movie` 타입과 같은 칸 |

- 잘못된 값은 `400` + `{"칸이름": ["한국어 안내"]}` (예: `{"limit": ["1~100 사이 숫자로 입력해 주세요."]}`)
- 로그인 필요한 API 는 `@permission_classes([IsAuthenticated])` → 토큰이 없으면 `401`
- 예: `qs = filter_contents(Content.objects.all(), request.query_params)` → `return paginate(contents_for_cards(qs), request, ContentCardSerializer)`

## 자동 테스트
```powershell
python manage.py test core
```
회원가입 → 로그인 → 설문 저장 → 로그아웃 흐름과, 잘못된 입력(중복 이메일·약한 비밀번호·별점 4.3 등)을 막는지, 0번 공통 목록 규칙(offset·limit·필터·오류 모양·작품 카드 모양), 2-1 작품 수집(가짜 TMDB 응답)·시연 데이터, D6·D7 칸까지 25가지를 확인합니다. 마지막에 `OK` 가 나오면 성공입니다.
> MariaDB 로 테스트하려면 viewfit 계정에 테스트용 DB 권한이 필요합니다. MariaDB 클라이언트에서 한 번만:
> `GRANT ALL PRIVILEGES ON test_viewfit.* TO 'viewfit'@'127.0.0.1'; GRANT ALL PRIVILEGES ON test_viewfit.* TO 'viewfit'@'localhost';`

## 프론트엔드(화면)와 연결하기
1. 프론트엔드 프로젝트 폴더(`package.json` 이 있는 곳)에 **`.env.local`** 파일을 만들고 아래 한 줄을 넣습니다.
   ```
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```
2. 백엔드(`python manage.py runserver`)와 프론트(`npm run dev`)를 **둘 다** 켭니다.
3. http://localhost:3000/signup 에서 가입 → 설문 → 홈 순서로 진행하고, 관리자 페이지(/admin)의 **회원**, **장르 취향** 표에 저장됐는지 확인합니다.

`.env.local` 이 없으면 예전처럼 브라우저에만 임시 저장됩니다 (백엔드 없이 화면만 볼 때).

---

## 자주 나는 오류
| 오류 메시지 | 해결 |
|---|---|
| `Access denied for user 'viewfit'` | `.env` 의 DB_USER / DB_PASSWORD 가 2단계에서 만든 값과 같은지 확인 |
| `Unknown database 'viewfit'` | 2단계의 `CREATE DATABASE` 를 실행했는지 확인 |
| `Can't connect to MySQL server` | MariaDB 가 꺼져 있음 → Windows "서비스" 에서 MariaDB 시작 |
| `mysqlclient` 설치 실패 (Mac) | `brew install mariadb pkg-config` 후 다시 `pip install -r requirements.txt` |
| `No module named 'django'` | 가상환경이 꺼져 있음 → `.venv\Scripts\activate` |

MariaDB 설치 전에 잠깐 실행만 해 보고 싶으면 `.env` 의 `DB_NAME=` 줄을 비우세요. 임시 파일(SQLite)로 실행됩니다.

## 테이블을 바꿨을 때
`models.py` 를 고친 뒤:
```powershell
python manage.py makemigrations
python manage.py migrate
```
생긴 `migrations/000X_...py` 파일도 GitHub 에 같이 올려야 다른 팀원 DB 에도 반영됩니다.
