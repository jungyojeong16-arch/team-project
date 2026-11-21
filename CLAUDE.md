# ViewFit 팀 프로젝트 — Claude 작업 안내

이 파일은 팀원(정준교·홍준화·정재준) 누구의 Claude든 이 저장소에서 작업을 시작할 때 자동으로 읽습니다.
**세 사람이 각자 Claude를 쓰지만 Claude끼리는 대화 내용을 공유하지 못합니다.** 그래서 서로 무엇을 했는지는
아래 **작업 일지(`docs/WORKLOG.md`)** 와 GitHub 기록으로만 알 수 있습니다. 이 파일의 순서를 꼭 지켜 주세요.

## 1. 작업을 시작하기 전에 (매번)
1. 최신 내용 받기: `git pull origin claude/viewfit-project-planning-qiqv1h`
   (받기 전에 고친 파일이 있으면 먼저 사용자에게 알리고 커밋할지 물어보기)
2. **`docs/WORKLOG.md` 맨 위 10개 항목을 읽고**, 사용자에게 "최근에 팀원이 한 일"을 3줄 이내로 알려 주기
3. 다른 사람이 만든 브랜치 확인: `git fetch origin && git branch -r` — 공용 브랜치 외의 브랜치가 있으면
   그 브랜치의 최근 커밋(`git log --oneline -5 origin/<브랜치>`)을 보고 같은 기능을 겹쳐 만들지 않기
4. 이번 작업의 프로그램 번호(예: 6-2)와 **요청한 사람 이름**을 확인 (모르면 사용자에게 물어보기)
5. 그 프로그램의 PRD(`docs/prd/`)와 상태표(`docs/prd/README.md` 1번 표)를 읽고, **이미 ✅ 인 기능은 새로 만들지 않기**

## 2. 작업을 끝낼 때 (올리기 전에 꼭)
1. 테스트: `cd backend && python manage.py test core` 가 `OK`, 화면을 바꿨으면 타입 검사(`npx tsc --noEmit`) 통과
2. **`docs/WORKLOG.md` 맨 위에 항목 추가** (아래 양식) — 이것이 다른 팀원의 Claude가 읽는 기록입니다
3. 해당 PRD 맨 위 `상태` 줄과 `docs/prd/README.md` 상태표 고치기
4. 보낸 프롬프트는 `docs/prompts/<번호>_<이름>.md` 에 기록 (양식: `docs/prompts/README.md`)
5. 커밋 메시지: `feat(6-2 세대별 랭킹): 한 줄 요약` + 본문에 `요청: 이름` 한 줄
6. 공용 브랜치 `claude/viewfit-project-planning-qiqv1h` 에 push. 새 브랜치를 만들었다면 WORKLOG에 브랜치 이름과 이유를 적기

### WORKLOG 항목 양식
```markdown
### 11/22 · 6-2 세대별 랭킹 · 요청: 정준교
- 한 일: (만든 기능 2~4줄, 파일 이름 포함)
- 커밋: `abc1234`
- 확인: 테스트 N개 통과, 브라우저 확인 내용
- 남은 일·주의: (다음 사람이 알아야 할 것 — 없으면 "없음")
```

## 3. 팀 규칙
| 규칙 | 내용 |
|---|---|
| 담당 | 0번 3명 공동 · 1·5·6번 정준교 · 2·3·7번 홍준화 · 4·8번 정재준 |
| 브랜치 | 공용 브랜치 하나: `claude/viewfit-project-planning-qiqv1h` |
| DB | `backend/core/models.py`·migration 은 **정준교(DB 담당)만** 수정. 다른 사람은 바꿀 칸과 이유를 먼저 정준교에게 요청 |
| 공용 파일 | `app/_components/`, `app/_lib/viewfit.ts`, `backend/core/common.py` 를 고칠 때는 사용자에게 "팀 단톡방에 먼저 알리라"고 말하기 |
| 비밀 정보 | `.env`, 비밀번호, TMDB 키, AWS 키, `.pem` 은 **절대 커밋 금지** (저장소가 공개). 코드에는 `backend/.env` 에서 읽기 |
| 범위 | 기능은 `docs/prd/` 의 PRD 범위만. PRD에 없는 기능이 필요하면 만들기 전에 사용자에게 물어보기 |
| 계산값 | 평균·개수는 저장하지 않고 조회할 때 계산 (ERD 원칙 ⑤). 예외: `ranking.score` |
| 화면 | Figma 파일 `MCj90ViECjscPBHzbGNyqq` 기준, 문구는 Figma 그대로(한국어). 공통 부품(`app/_components/`) 먼저 사용 |
| 일정 | 12/3 기능 동결, **12/8 최종 발표** |

## 4. 이미 만들어진 것 (새로 만들지 말고 가져다 쓰기)
| 필요한 것 | 있는 곳 |
|---|---|
| 목록 나누기·필터·작품 카드 응답 | `backend/core/common.py` (`paginate`, `filter_contents`, `contents_for_cards`), `serializers.ContentCardSerializer` |
| TMDB 호출·작품 수집·가상 평점 | `backend/core/tmdb.py`, `import_tmdb`, `seed_demo` 명령 |
| 작품 검색·상세·바로 보기 API (4-1) | `views.content_search/content_detail/content_watch` |
| 홈 피드 API (0-4) | `backend/core/home.py` |
| 통합 랭킹 계산·API (6-1) | `backend/core/ranking.py`, `build_rankings` 명령, `GET /api/v1/rankings/` |
| 상단 바·하단·화면 틀 | `app/_components/site-shell.tsx` 의 `<SiteShell>` |
| 작품 카드·TOP 3·필터 바·펼치기·팝업·별점·상태 표시 | `app/_components/` (모음: http://localhost:3000/dev/components) |
| 작품 상세 팝업 열기 | `openContentDetail(movie)` (`app/_components/content-detail-modal.tsx`) |
| 로그인 필요할 때 로그인 창 | `openLoginModal()` (`app/_components/login-modal.tsx`) |
| 로그인 상태 | `useAccount()` (`app/_lib/use-account.ts`), API 함수 `app/_lib/account.ts` |

## 5. 실행 방법 (Windows PowerShell 기준)
```powershell
# 백엔드
cd C:\team-project\backend
.venv\Scripts\activate
python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000/admin/
python manage.py test core          # 자동 테스트

# 데이터 (각자 PC 에 한 번)
python manage.py import_tmdb        # backend/.env 의 TMDB_API_TOKEN 필요
python manage.py seed_demo          # 시연용 가상 회원·평점
python manage.py build_rankings     # 통합 랭킹 집계

# 프론트엔드 (새 터미널)
cd C:\team-project
npm run dev                         # http://localhost:3000
```
- DB: MariaDB `viewfit` (utf8mb4). 접속 정보는 각자 `backend/.env` (포트는 PC마다 다를 수 있음, 예: 3308)
- 문서: PRD `docs/prd/`, ERD `docs/erd/ViewFit_ERD_physical.md`, 백엔드 안내 `backend/README.md`
