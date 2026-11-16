"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BarChart, Bookmark, ChevronRight, Eye, EyeOff, Sparkles } from "lucide-react";
import {
  AuthHeader,
  AuthPage,
  CheckMark,
  FormCard,
  MoodChip,
  OttStrip,
  PRIMARY_BUTTON,
  StoryDescription,
  StoryHeadline,
  type CheckState,
} from "../_components/onboarding-ui";
import { ApiError, checkNickname, getAccount, signUp, type Agreements } from "../_lib/account";

/* ============================================================================
 * 1-1 회원가입 (Figma "ViewFit 회원가입" 157:1355)
 * 이메일 · 닉네임(중복 확인 버튼) · 비밀번호 · 비밀번호 확인 · 약관 동의 → 가입 완료 안내(/signup/complete)
 * ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_RE = /^[가-힣A-Za-z0-9_]{2,12}$/;
const isValidPassword = (pw: string) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

const BENEFITS = [
  { icon: Sparkles, title: "지금 이 순간을 위한 TPO 추천", body: "시간, 장소, 기분에 맞춰 발견하는 나만의 작품" },
  { icon: BarChart, title: "여러 OTT의 인기작을 한눈에", body: "플랫폼을 오가지 않고 비교하는 통합 랭킹" },
  { icon: Bookmark, title: "보고 싶은 작품은 나의 보관함에", body: "마음에 드는 이야기를 모아두고 언제든 다시 찾기" },
];

const AGREEMENT_ITEMS: { key: keyof Agreements; required: boolean; label: string; detail: boolean }[] = [
  { key: "age14", required: true, label: "만 14세 이상입니다", detail: false },
  { key: "terms", required: true, label: "서비스 이용약관 동의", detail: true },
  { key: "privacy", required: true, label: "개인정보 수집 및 이용 동의", detail: true },
  { key: "marketing", required: false, label: "이벤트 및 추천 소식 수신 동의", detail: true },
];

type NicknameCheck =
  | { status: "idle" }
  | { status: "checking"; value: string }
  | { status: "done"; value: string; available: boolean; reason: string | null }
  | { status: "failed"; value: string };

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [check, setCheck] = useState<NicknameCheck>({ status: "idle" });
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreements, setAgreements] = useState<Agreements>({ age14: false, terms: false, privacy: false, marketing: false });
  const [touched, setTouched] = useState({ email: false, nickname: false, password: false, confirm: false });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openDetail, setOpenDetail] = useState<keyof Agreements | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 이미 로그인한 사용자는 홈으로
  useEffect(() => {
    if (getAccount()) router.replace("/");
  }, [router]);

  // 중복 확인 결과는 '지금 입력한 닉네임'에 대한 것일 때만 유효
  const checkedNow = check.status !== "idle" && check.value === nickname;
  const nicknameConfirmed = checkedNow && check.status === "done" && check.available;

  const errors = {
    email: !EMAIL_RE.test(email) ? (email ? "올바른 이메일 주소를 입력해 주세요." : "이메일을 입력해 주세요.") : (serverErrors.email ?? null),
    nickname: !NICKNAME_RE.test(nickname)
      ? nickname
        ? "한글·영문·숫자·밑줄(_)로 2~12자까지 쓸 수 있어요."
        : "닉네임을 입력해 주세요."
      : checkedNow && check.status === "done" && !check.available
        ? (check.reason ?? "이미 사용 중인 닉네임이에요.")
        : (serverErrors.nickname ?? (nicknameConfirmed ? null : "닉네임 중복 확인을 해 주세요.")),
    password: !isValidPassword(password) ? "영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요." : (serverErrors.password ?? null),
    confirm: !confirm ? "비밀번호를 한 번 더 입력해 주세요." : confirm !== password ? "비밀번호가 일치하지 않아요." : null,
    agreements: AGREEMENT_ITEMS.some((a) => a.required && !agreements[a.key]) ? "필수 항목에 모두 동의해 주세요." : null,
  };
  const show = (field: keyof typeof errors) =>
    field === "agreements" ? (submitted ? errors.agreements : null) : touched[field] || submitted ? errors[field] : null;

  // 닉네임은 '중복 확인' 결과가 나왔으면 바로 보여 주고, 아니면 가입 버튼을 눌렀을 때만 보여 줌
  const nicknameError =
    checkedNow && check.status === "done" && !check.available
      ? errors.nickname
      : submitted || (touched.nickname && !NICKNAME_RE.test(nickname))
        ? errors.nickname
        : null;

  const checkedCount = AGREEMENT_ITEMS.filter((a) => agreements[a.key]).length;
  const allState: CheckState = checkedCount === AGREEMENT_ITEMS.length ? "checked" : checkedCount === 0 ? "unchecked" : "indeterminate";

  const toggleAll = () => {
    const next = allState !== "checked";
    setAgreements({ age14: next, terms: next, privacy: next, marketing: next });
  };

  const clearServerError = (key: string) =>
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const onCheckNickname = async () => {
    setTouched((t) => ({ ...t, nickname: true }));
    if (!NICKNAME_RE.test(nickname)) return;
    const value = nickname;
    setCheck({ status: "checking", value });
    try {
      const result = await checkNickname(value);
      setCheck({ status: "done", value, available: result.available, reason: result.reason });
    } catch {
      setCheck({ status: "failed", value });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;
    setSubmitting(true);
    try {
      await signUp({ email, nickname, password, agreements });
      router.push("/signup/complete");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerErrors(err.fields);
        if (!err.fields.email && !err.fields.nickname && !err.fields.password) setFormError(err.message);
      } else {
        setFormError("가입 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nicknameStatus = (() => {
    if (nicknameError) return <p role="alert" className="text-xs leading-[1.5] text-rose-400">{nicknameError}</p>;
    if (checkedNow && check.status === "checking") return <p className="text-xs leading-[1.5] text-[#9ca3b5]">확인하는 중…</p>;
    if (checkedNow && check.status === "failed")
      return <p className="text-xs leading-[1.5] text-rose-400">확인하지 못했어요. 잠시 후 다시 눌러 주세요.</p>;
    if (nicknameConfirmed) return <p className="text-xs leading-[1.5] text-[#f0abfc]">사용할 수 있는 닉네임이에요.</p>;
    return (
      <div className="flex flex-col gap-1 text-xs leading-[1.5]">
        <p className="text-[#9ca3b5]">닉네임은 2~12자 이내로 설정할 수 있어요.</p>
        <p className="text-[#6b7487]">입력 후 중복 확인을 눌러 사용 가능한지 확인해 주세요.</p>
      </div>
    );
  })();

  return (
    <AuthPage
      header={
        <AuthHeader
          right={
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-[#9ca3b5] sm:inline">이미 회원이신가요?</span>
              <Link href="/login" className="rounded-md border border-white/[0.12] px-5 py-[9px] text-sm font-bold transition hover:border-white/40 hover:bg-white/5">
                로그인
              </Link>
            </div>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 py-14 md:px-16 lg:grid-cols-[minmax(0,1fr)_552px] lg:items-center lg:gap-[104px] lg:px-28 lg:py-16">
        {/* 왼쪽: 소개 */}
        <div className="flex flex-col gap-8">
          <div>
            <MoodChip icon={<Sparkles className="h-3.5 w-3.5 fill-[#f0abfc]" />}>오늘의 기분에 딱 맞는 이야기</MoodChip>
          </div>
          <div className="flex flex-col gap-5">
            <StoryHeadline first="오늘 밤," lead="당신의 " accent="취향으로." />
            <StoryDescription lines={["무엇을 볼지 고민하는 시간은 줄이고,", "좋아하는 이야기에 더 오래 머물러 보세요."]} />
          </div>
          <ul className="flex flex-col gap-5 py-2">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.03]">
                  <Icon className="h-5 w-5 text-[#f0abfc]" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold text-[#eceef4]">{title}</span>
                  <span className="text-[13px] leading-[1.5] text-[#9ca3b5]">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <OttStrip more note="ViewFit은 작품을 추천해요. 시청은 각 OTT에서 즐겨주세요." />
        </div>

        {/* 오른쪽: 가입 폼 */}
        <FormCard>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold text-[#f0abfc]">나만의 취향, 새로운 시작</p>
              <h2 className="text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">ViewFit에 오신 걸 환영해요</h2>
              <p className="text-sm leading-[1.6] text-[#9ca3b5]">이메일로 가입하고 나에게 맞는 작품을 만나보세요.</p>
            </div>

            <div className="flex flex-col gap-[18px]">
              <Field id="signup-email" label="이메일" error={show("email")}>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearServerError("email");
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="이메일 주소를 입력해 주세요"
                  aria-invalid={Boolean(show("email"))}
                  className={inputClass(Boolean(show("email")))}
                />
              </Field>

              <div className="flex flex-col gap-2">
                <label htmlFor="signup-nickname" className="text-sm font-medium text-[#eceef4]">
                  닉네임
                </label>
                <div className="flex gap-3">
                  <input
                    id="signup-nickname"
                    type="text"
                    autoComplete="nickname"
                    maxLength={12}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      clearServerError("nickname");
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onCheckNickname();
                      }
                    }}
                    placeholder="닉네임을 입력해 주세요"
                    aria-invalid={Boolean(nicknameError)}
                    aria-describedby="signup-nickname-status"
                    className={`${inputClass(Boolean(nicknameError))} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={onCheckNickname}
                    disabled={checkedNow && check.status === "checking"}
                    className="h-[52px] w-[120px] shrink-0 rounded-md border border-white/[0.12] bg-white/[0.03] text-sm font-bold text-[#f0abfc] transition hover:border-[#f0abfc]/60 disabled:opacity-60"
                  >
                    중복 확인
                  </button>
                </div>
                <div id="signup-nickname-status">{nicknameStatus}</div>
              </div>

              <Field id="signup-password" label="비밀번호" error={show("password")} hint="영문, 숫자, 특수문자를 포함한 8자 이상">
                <PasswordInput
                  id="signup-password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    clearServerError("password");
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="비밀번호를 입력해 주세요"
                  invalid={Boolean(show("password"))}
                  autoComplete="new-password"
                />
              </Field>

              <Field id="signup-confirm" label="비밀번호 확인" error={show("confirm")}>
                <PasswordInput
                  id="signup-confirm"
                  value={confirm}
                  onChange={setConfirm}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  placeholder="비밀번호를 한 번 더 입력해 주세요"
                  invalid={Boolean(show("confirm"))}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            {/* 약관 동의 */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={allState === "indeterminate" ? "mixed" : allState === "checked"}
                onClick={toggleAll}
                className="flex h-6 w-full items-center gap-2.5 text-left"
              >
                <CheckMark state={allState} />
                <span className="text-sm font-bold text-white">전체 동의</span>
                <span className="text-xs text-[#9ca3b5]">선택 항목 포함</span>
              </button>
              <div className="h-px bg-white/[0.12]" />
              <ul className="flex flex-col gap-1">
                {AGREEMENT_ITEMS.map(({ key, required, label, detail }) => (
                  <li key={key}>
                    <div className="flex h-7 items-center justify-between gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreements[key]}
                        onClick={() => setAgreements((a) => ({ ...a, [key]: !a[key] }))}
                        className="flex items-center gap-2.5 text-left text-[13px] text-[#eceef4]"
                      >
                        <CheckMark state={agreements[key] ? "checked" : "unchecked"} />
                        <span>
                          <span className={required ? "text-[#f0abfc]" : "text-[#9ca3b5]"}>[{required ? "필수" : "선택"}]</span> {label}
                        </span>
                      </button>
                      {detail && (
                        <button
                          type="button"
                          aria-label={`${label} 내용 보기`}
                          aria-expanded={openDetail === key}
                          onClick={() => setOpenDetail((d) => (d === key ? null : key))}
                          className="rounded p-0.5 text-[#9ca3b5] transition hover:bg-white/10 hover:text-white"
                        >
                          <ChevronRight className={`h-4 w-4 transition ${openDetail === key ? "rotate-90" : ""}`} />
                        </button>
                      )}
                    </div>
                    {openDetail === key && (
                      <p className="ml-7 mt-1 rounded-md bg-white/[0.04] px-3 py-2 text-xs text-[#9ca3b5]">약관 전문은 준비 중이에요.</p>
                    )}
                  </li>
                ))}
              </ul>
              <p className={`text-[11px] leading-[1.5] ${show("agreements") ? "text-rose-400" : "text-[#9ca3b5]"}`}>
                {show("agreements") ?? "선택 항목에 동의하지 않아도 서비스를 이용할 수 있어요."}
              </p>
            </div>

            {formError && (
              <p role="alert" className="rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                {formError}
              </p>
            )}

            <div className="flex flex-col items-center gap-[18px]">
              <button type="submit" disabled={submitting} className={`${PRIMARY_BUTTON} h-[54px] w-full text-base`}>
                {submitting ? "가입하는 중…" : "회원가입"}
                {!submitting && <ArrowRight className="h-[18px] w-[18px]" />}
              </button>
              <p className="text-sm text-[#9ca3b5]">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="ml-1 font-bold text-[#f0abfc] underline underline-offset-4 hover:brightness-110">
                  로그인
                </Link>
              </p>
            </div>
          </form>
        </FormCard>
      </div>
    </AuthPage>
  );
}

/* ============================================================================
 * 입력칸 부품 (Figma Input: 높이 52 · 테두리 white 12% · 글자 14)
 * ========================================================================== */

const inputClass = (invalid: boolean) =>
  `h-[52px] w-full rounded-md border bg-white/[0.02] px-4 text-sm text-white placeholder:text-[#6b7487] transition focus:outline-none focus:ring-2 ${
    invalid ? "border-rose-400/70 focus:ring-rose-400/40" : "border-white/[0.12] focus:border-fuchsia-300/60 focus:ring-fuchsia-300/30"
  }`;

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[#eceef4]">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p className={`text-xs leading-[1.5] ${error ? "text-rose-400" : "text-[#9ca3b5]"}`} role={error ? "alert" : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  invalid,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  invalid: boolean;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={`${inputClass(invalid)} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#9ca3b5] transition hover:text-white"
      >
        {visible ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}
