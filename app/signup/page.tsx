"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
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
import { signUp, type Agreements } from "../_lib/account";

/* ============================================================================
 * Figma: "ViewFit 회원가입"
 * ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidPassword = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreements, setAgreements] = useState<Agreements>({ age14: false, terms: false, privacy: false, marketing: false });
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openDetail, setOpenDetail] = useState<keyof Agreements | null>(null);

  const errors = {
    email: !EMAIL_RE.test(email) ? (email ? "올바른 이메일 주소를 입력해 주세요." : "이메일을 입력해 주세요.") : null,
    password: !isValidPassword(password) ? "영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요." : null,
    confirm: !confirm ? "비밀번호를 한 번 더 입력해 주세요." : confirm !== password ? "비밀번호가 일치하지 않아요." : null,
    agreements: AGREEMENT_ITEMS.some((a) => a.required && !agreements[a.key]) ? "필수 항목에 모두 동의해 주세요." : null,
  };
  const show = (field: keyof typeof errors) =>
    field === "agreements" ? (submitted ? errors.agreements : null) : touched[field] || submitted ? errors[field] : null;

  const checkedCount = AGREEMENT_ITEMS.filter((a) => agreements[a.key]).length;
  const allState: CheckState =
    checkedCount === AGREEMENT_ITEMS.length ? "checked" : checkedCount === 0 ? "unchecked" : "indeterminate";

  const toggleAll = () => {
    const next = allState !== "checked";
    setAgreements({ age14: next, terms: next, privacy: next, marketing: next });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setSubmitting(true);
    try {
      await signUp({ email, password, agreements });
      router.push("/onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPage
      header={
        <AuthHeader
          right={
            <div className="flex items-center gap-4">
              <span className="hidden text-white/60 sm:inline">이미 회원이신가요?</span>
              <Link
                href="/login"
                className="rounded-lg border border-white/20 px-5 py-2 font-bold transition hover:border-white/40 hover:bg-white/5"
              >
                로그인
              </Link>
            </div>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 py-14 md:px-16 lg:grid-cols-[minmax(0,560px)_550px] lg:items-center lg:justify-between lg:px-28 lg:py-24">
        {/* Welcome story */}
        <div className="flex flex-col gap-8">
          <div>
            <MoodChip icon={<Sparkles className="h-4 w-4 fill-fuchsia-300" />}>오늘의 기분에 딱 맞는 이야기</MoodChip>
          </div>
          <StoryHeadline first="오늘 밤," accent="당신의 취향으로." />
          <StoryDescription lines={["무엇을 볼지 고민하는 시간은 줄이고,", "좋아하는 이야기에 더 오래 머물러 보세요."]} />
          <ul className="flex flex-col gap-5">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                  <Icon className="h-5 w-5 text-fuchsia-300" />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-white/55">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <OttStrip more note="ViewFit은 작품을 추천해요. 시청은 각 OTT에서 즐겨주세요." />
        </div>

        {/* Registration form */}
        <FormCard>
          <form onSubmit={onSubmit} noValidate className="flex flex-col">
            <p className="text-sm font-bold text-fuchsia-300">나만의 취향, 새로운 시작</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-[34px]">ViewFit에 오신 걸 환영해요</h2>
            <p className="mt-2 text-white/60">이메일로 가입하고 나에게 맞는 작품을 만나보세요.</p>

            <div className="mt-8 flex flex-col gap-6">
              <Field id="signup-email" label="이메일" error={show("email")}>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="이메일 주소를 입력해 주세요"
                  aria-invalid={Boolean(show("email"))}
                  className={inputClass(Boolean(show("email")))}
                />
              </Field>

              <Field
                id="signup-password"
                label="비밀번호"
                error={show("password")}
                hint="영문, 숫자, 특수문자를 포함한 8자 이상"
              >
                <PasswordInput
                  id="signup-password"
                  value={password}
                  onChange={setPassword}
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

            {/* Agreements */}
            <div className="mt-8">
              <button
                type="button"
                role="checkbox"
                aria-checked={allState === "indeterminate" ? "mixed" : allState === "checked"}
                onClick={toggleAll}
                className="flex w-full items-center gap-3 border-b border-white/10 pb-4 text-left"
              >
                <CheckMark state={allState} />
                <span className="text-lg font-bold">전체 동의</span>
                <span className="text-sm text-white/45">선택 항목 포함</span>
              </button>
              <ul className="mt-4 flex flex-col gap-2">
                {AGREEMENT_ITEMS.map(({ key, required, label, detail }) => (
                  <li key={key}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreements[key]}
                        onClick={() => setAgreements((a) => ({ ...a, [key]: !a[key] }))}
                        className="flex items-center gap-3 py-1.5 text-left"
                      >
                        <CheckMark state={agreements[key] ? "checked" : "unchecked"} />
                        <span>
                          <span className={required ? "text-fuchsia-300" : "text-white/55"}>
                            [{required ? "필수" : "선택"}]
                          </span>{" "}
                          {label}
                        </span>
                      </button>
                      {detail && (
                        <button
                          type="button"
                          aria-label={`${label} 내용 보기`}
                          aria-expanded={openDetail === key}
                          onClick={() => setOpenDetail((d) => (d === key ? null : key))}
                          className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                        >
                          <ChevronRight className={`h-5 w-5 transition ${openDetail === key ? "rotate-90" : ""}`} />
                        </button>
                      )}
                    </div>
                    {openDetail === key && (
                      <p className="ml-8 mt-1 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/55">
                        약관 전문은 준비 중이에요.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className={`mt-3 text-sm ${show("agreements") ? "text-rose-400" : "text-white/45"}`}>
                {show("agreements") ?? "선택 항목에 동의하지 않아도 서비스를 이용할 수 있어요."}
              </p>
            </div>

            <button type="submit" disabled={submitting} className={`${PRIMARY_BUTTON} mt-8 h-[54px] text-lg`}>
              {submitting ? "가입하는 중…" : "회원가입"}
              {!submitting && <ArrowRight className="h-5 w-5" />}
            </button>
            <p className="mt-6 text-center text-white/60">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-bold text-fuchsia-300 underline underline-offset-4 hover:text-fuchsia-200">
                로그인
              </Link>
            </p>
          </form>
        </FormCard>
      </div>
    </AuthPage>
  );
}

/* ============================================================================
 * Form parts
 * ========================================================================== */

const inputClass = (invalid: boolean) =>
  `h-[52px] w-full rounded-lg border bg-[#0a0c11] px-4 text-[15px] text-white placeholder:text-white/35 transition focus:outline-none focus:ring-2 ${
    invalid ? "border-rose-400/70 focus:ring-rose-400/40" : "border-white/10 focus:border-fuchsia-300/60 focus:ring-fuchsia-300/30"
  }`;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p className={`text-sm ${error ? "text-rose-400" : "text-white/50"}`} role={error ? "alert" : undefined}>
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
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition hover:text-white"
      >
        {visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
      </button>
    </div>
  );
}
