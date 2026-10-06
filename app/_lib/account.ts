/**
 * 회원가입 · 온보딩 데이터 레이어
 * Django 인증/프로필 API가 준비되기 전까지는 브라우저(localStorage)에 임시 저장한다.
 */

export interface Agreements {
  age14: boolean;
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface SignUpPayload {
  email: string;
  password: string;
  agreements: Agreements;
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

const ACCOUNT_KEY = "viewfit.account";
const ONBOARDING_KEY = "viewfit.onboarding";

export interface Account {
  email: string;
  marketing_opt_in: boolean;
  created_at: string;
}

export type SavedOnboarding = OnboardingAnswers & { completed_at: string };

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

// TODO(Step 3): 세션/토큰 기반 로그인 상태 확인으로 교체
export const getAccount = () => load<Account>(ACCOUNT_KEY);
export const getOnboarding = () => load<SavedOnboarding>(ONBOARDING_KEY);

export function signOut() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* 무시 */
  }
}

// TODO(Step 3): POST /api/v1/auth/signup/ 연동
export async function signUp({ email, agreements }: SignUpPayload): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const account: Account = { email, marketing_opt_in: agreements.marketing, created_at: new Date().toISOString() };
  save(ACCOUNT_KEY, account);
}

// TODO(Step 3): PUT /api/v1/me/preferences/ 연동 (User.age_group / occupation 매핑 포함)
export async function saveOnboarding(answers: OnboardingAnswers): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  save(ONBOARDING_KEY, { ...answers, completed_at: new Date().toISOString() });
}
