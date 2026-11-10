"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import {
  AuthHeader,
  AuthPage,
  FormCard,
  MoodChip,
  OttStrip,
  PRIMARY_BUTTON,
  StoryDescription,
  StoryHeadline,
} from "../_components/onboarding-ui";
import { ApiError, logIn } from "../_lib/account";

/* ============================================================================
 * 로그인 (Figma: "ViewFit 웹 시작 화면" — 이메일 로그인)
 * 설문을 아직 안 한 회원은 설문 화면으로, 한 회원은 홈으로 보냅니다.
 * ========================================================================== */

const inputClass =
  "h-[52px] w-full rounded-lg border border-white/10 bg-[#0a0c11] px-4 text-[15px] text-white placeholder:text-white/35 transition focus:border-fuchsia-300/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/30";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const account = await logIn({ email, password });
      router.push(account.survey_completed ? "/" : "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
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
              <span className="hidden text-white/60 sm:inline">처음이신가요?</span>
              <Link
                href="/signup"
                className="rounded-lg border border-white/20 px-5 py-2 font-bold transition hover:border-white/40 hover:bg-white/5"
              >
                회원가입
              </Link>
            </div>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 py-14 md:px-16 lg:grid-cols-[minmax(0,560px)_480px] lg:items-center lg:justify-between lg:px-28 lg:py-24">
        <div className="flex flex-col gap-8">
          <div>
            <MoodChip icon={<Sparkles className="h-4 w-4 fill-fuchsia-300" />}>다시 만나서 반가워요</MoodChip>
          </div>
          <StoryHeadline first="지금 이 순간," accent="딱 맞는 이야기." />
          <StoryDescription lines={["로그인하면 지난번 추천에 대한 생각을 듣고,", "오늘의 상황에 맞는 작품을 다시 골라 드릴게요."]} />
          <OttStrip more />
        </div>

        <FormCard>
          <form onSubmit={onSubmit} noValidate className="flex flex-col">
            <p className="text-sm font-bold text-fuchsia-300">다시 오셨네요</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-[34px]">로그인</h2>
            <p className="mt-2 text-white/60">가입한 이메일과 비밀번호를 입력해 주세요.</p>

            <div className="mt-8 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="login-email" className="font-bold">
                  이메일
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력해 주세요"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="login-password" className="font-bold">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력해 주세요"
                    className={`${inputClass} pr-12`}
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
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-6 rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className={`${PRIMARY_BUTTON} mt-8 h-[54px] text-lg`}>
              {submitting ? "로그인하는 중…" : "로그인"}
              {!submitting && <ArrowRight className="h-5 w-5" />}
            </button>
            <p className="mt-6 text-center text-white/60">
              아직 계정이 없으신가요?{" "}
              <Link href="/signup" className="font-bold text-fuchsia-300 underline underline-offset-4 hover:text-fuchsia-200">
                회원가입
              </Link>
            </p>
          </form>
        </FormCard>
      </div>
    </AuthPage>
  );
}
