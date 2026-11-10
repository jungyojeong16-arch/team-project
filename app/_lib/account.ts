/**
 * 회원가입 · 로그인 · 취향 설문 데이터 레이어
 *
 * - .env.local 에 NEXT_PUBLIC_API_BASE_URL 이 있으면 Django API 를 호출합니다.
 *   (예: NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000)
 * - 없으면 예전처럼 브라우저(localStorage)에만 임시 저장합니다. (백엔드 없이 화면만 볼 때)
 *
 * 로그인하면 서버가 토큰을 주고, 이후 요청 헤더에 "Authorization: Token <토큰>" 을 붙입니다.
 */
import { API_BASE_URL } from "./viewfit";

/* ============================================================================
 * 타입
 * ========================================================================== */

export interface Agreements {
  age14: boolean;
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface SignUpPayload {
  email: string;
  nickname: string;
  password: string;
  agreements: Agreements;
}

export interface LogInPayload {
  email: string;
  password: string;
}

export interface WatchedItem {
  id: string;
  title: string;
  meta: string; // "2025 · 드라마 · 로맨스" 또는 "직접 입력한 작품"
  platform: string | null; // PlatformCode
}

export interface OnboardingAnswers {
  lifestyle: {
    age_group: string | null;
    occupation: string | null;
    sleep: string | null;
    pattern: string | null;
    stress: string | null;
  };
  genres: {
    liked: string[];
    liked_all: boolean;
    disliked: string[];
    disliked_none: boolean;
  };
  history: {
    watched: WatchedItem[];
    none: boolean;
    daily_watch_time: string | null;
  };
}

export type SavedOnboarding = OnboardingAnswers & { completed_at: string };

export interface Account {
  email: string;
  nickname: string;
  marketing_opt_in: boolean;
  created_at: string;
  survey_completed: boolean;
  /** 서버에 저장된 설문 결과 (화면 표시용 한글 값) */
  survey?: { age_group: string | null; occupation: string | null; liked: string[]; disliked: string[] };
}

/** 서버가 돌려준 오류. fields 에는 칸별 오류 문구가 들어 있음 (예: { email: "이미 가입된 이메일이에요." }) */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/* ============================================================================
 * 화면 값 ↔ 서버 값
 * ========================================================================== */

const AGE_TO_CODE: Record<string, string> = {
  "14–19세": "10s",
  "20대": "20s",
  "30대": "30s",
  "40대": "40s",
  "50대": "50s",
  "60대 이상": "60s+",
};
const JOB_TO_CODE: Record<string, string> = {
  학생: "student",
  직장인: "office",
  "자영업·프리랜서": "freelance",
  "가사·돌봄": "home",
  "구직·휴직 중": "seeking",
  기타: "etc",
};
const reverse = (map: Record<string, string>) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const CODE_TO_AGE = reverse(AGE_TO_CODE);
const CODE_TO_JOB = reverse(JOB_TO_CODE);

interface MemberResponse {
  email: string;
  nickname: string;
  marketing_opt_in: boolean;
  date_joined: string;
  survey_completed: boolean;
  age_group: string | null;
  job: string | null;
  liked_genres: string[];
  disliked_genres: string[];
}

const toAccount = (m: MemberResponse): Account => ({
  email: m.email,
  nickname: m.nickname,
  marketing_opt_in: m.marketing_opt_in,
  created_at: m.date_joined,
  survey_completed: m.survey_completed,
  survey: {
    age_group: m.age_group ? (CODE_TO_AGE[m.age_group] ?? m.age_group) : null,
    occupation: m.job ? (CODE_TO_JOB[m.job] ?? m.job) : null,
    liked: m.liked_genres,
    disliked: m.disliked_genres,
  },
});

/* ============================================================================
 * 브라우저 저장소
 * ========================================================================== */

const ACCOUNT_KEY = "viewfit.account";
const ONBOARDING_KEY = "viewfit.onboarding";
const TOKEN_KEY = "viewfit.token";

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장소를 쓸 수 없는 환경(시크릿 모드 등)은 무시 */
  }
};

const load = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const remove = (...keys: string[]) => {
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 무시 */
  }
};

const startSession = (token: string, account: Account) => {
  save(TOKEN_KEY, token);
  save(ACCOUNT_KEY, account);
};

/* ============================================================================
 * API 호출
 * ========================================================================== */

async function request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth) {
    const token = load<string>(TOKEN_KEY);
    if (!token) throw new ApiError("로그인이 필요해요.", 401);
    headers.Authorization = `Token ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없어요. 백엔드 서버가 켜져 있는지 확인해 주세요.", 0);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Django 오류 모양: { email: ["..."] } / { non_field_errors: ["..."] } / { detail: "..." }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      fields[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
    const message = fields.non_field_errors ?? fields.detail ?? Object.values(fields)[0] ?? `요청에 실패했어요. (HTTP ${res.status})`;
    if (res.status === 401) remove(TOKEN_KEY, ACCOUNT_KEY);
    throw new ApiError(message, res.status, fields);
  }
  return data as T;
}

/* ============================================================================
 * 화면에서 쓰는 함수
 * ========================================================================== */

/** 로그인한 회원 (없으면 null). 브라우저에 저장된 값을 바로 돌려줌 */
export const getAccount = () => (API_BASE_URL && !load<string>(TOKEN_KEY) ? null : load<Account>(ACCOUNT_KEY));
export const getOnboarding = () => load<SavedOnboarding>(ONBOARDING_KEY);

/** 서버에서 내 정보를 새로 받아옴 (토큰이 만료됐으면 null) */
export async function fetchMe(): Promise<Account | null> {
  if (!API_BASE_URL) return getAccount();
  if (!load<string>(TOKEN_KEY)) return null;
  try {
    const account = toAccount(await request<MemberResponse>("/me/", { auth: true }));
    save(ACCOUNT_KEY, account);
    return account;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    return getAccount(); // 서버가 잠깐 꺼져 있으면 저장된 값 사용
  }
}

export async function checkNickname(nickname: string): Promise<{ available: boolean; reason: string | null }> {
  if (!API_BASE_URL) {
    const ok = /^[가-힣A-Za-z0-9_]{2,12}$/.test(nickname);
    return { available: ok, reason: ok ? null : "닉네임은 한글·영문·숫자·밑줄(_)로 2~12자까지 쓸 수 있어요." };
  }
  return request(`/auth/check-nickname/?nickname=${encodeURIComponent(nickname)}`);
}

export async function signUp({ email, nickname, password, agreements }: SignUpPayload): Promise<Account> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const account: Account = {
      email,
      nickname,
      marketing_opt_in: agreements.marketing,
      created_at: new Date().toISOString(),
      survey_completed: false,
    };
    save(ACCOUNT_KEY, account);
    return account;
  }
  const res = await request<{ token: string; member: MemberResponse }>("/auth/signup/", {
    method: "POST",
    body: { email, nickname, password, ...agreements },
  });
  const account = toAccount(res.member);
  remove(ONBOARDING_KEY); // 이전 사용자의 설문이 남아 있지 않게
  startSession(res.token, account);
  return account;
}

export async function logIn({ email, password }: LogInPayload): Promise<Account> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const saved = load<Account>(ACCOUNT_KEY);
    if (!saved || saved.email !== email) throw new ApiError("이 브라우저에 가입한 기록이 없어요. (백엔드 미연결 모드)", 400);
    return saved;
  }
  const res = await request<{ token: string; member: MemberResponse }>("/auth/login/", {
    method: "POST",
    body: { email, password },
  });
  const account = toAccount(res.member);
  const previous = load<Account>(ACCOUNT_KEY);
  if (previous?.email !== account.email) remove(ONBOARDING_KEY);
  startSession(res.token, account);
  return account;
}

export async function signOut(): Promise<void> {
  if (API_BASE_URL && load<string>(TOKEN_KEY)) {
    await request("/auth/logout/", { method: "POST", auth: true }).catch(() => undefined);
  }
  remove(TOKEN_KEY, ACCOUNT_KEY, ONBOARDING_KEY);
}

/**
 * 취향 설문 저장
 * - 서버(DB)에는 연령대·직업·선호/비선호 장르를 저장
 * - 시청 이력·수면 시간 등 나머지 답변은 아직 DB 칸이 없어서 브라우저에만 저장
 */
export async function saveOnboarding(answers: OnboardingAnswers): Promise<void> {
  if (API_BASE_URL) {
    const { lifestyle, genres } = answers;
    const me = await request<MemberResponse>("/me/survey/", {
      method: "PUT",
      auth: true,
      body: {
        age_group: lifestyle.age_group ? (AGE_TO_CODE[lifestyle.age_group] ?? null) : null,
        job: lifestyle.occupation ? (JOB_TO_CODE[lifestyle.occupation] ?? null) : null,
        liked_genres: genres.liked_all ? [] : genres.liked,
        liked_all: genres.liked_all,
        disliked_genres: genres.disliked_none ? [] : genres.disliked,
      },
    });
    save(ACCOUNT_KEY, toAccount(me));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  save(ONBOARDING_KEY, { ...answers, completed_at: new Date().toISOString() });
}
