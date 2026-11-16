"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { AmbientBackdrop, Logo, PRIMARY_BUTTON } from "../../_components/onboarding-ui";
import { getAccount } from "../../_lib/account";

/* ============================================================================
 * 1-1 회원가입 완료 안내 (Figma "ViewFit 회원가입 완료 안내" 61:591)
 * 가입 직후 보여 주고, [맞춤 추천 설문 시작하기] → /onboarding
 * ========================================================================== */

const QUESTIONS = ["연령대", "직업", "선호 장르", "비선호 장르", "기억에 남는 작품"];

export default function SignUpCompletePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // 로그인 안 한 사용자는 회원가입으로
  useEffect(() => {
    if (!getAccount()) router.replace("/signup");
    else setReady(true);
  }, [router]);

  if (!ready) return <div className="min-h-screen bg-[#0a0a0a]" />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-12 text-white antialiased">
      <AmbientBackdrop />
      <section className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#14213a] via-[#0d111b] via-[52%] to-[#0d111b] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)] md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[45%] h-[340px] w-[360px] -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
          style={{ background: "radial-gradient(closest-side, #0c4a6e, transparent)" }}
        />

        <div className="relative flex flex-col items-center gap-8">
          <Logo />

          <div className="flex w-full flex-col items-center gap-6">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f0abfc]">
                <Check className="h-5 w-5 text-[#f0abfc]" strokeWidth={2.5} />
              </span>
            </div>
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-[26px] font-bold leading-[1.4] tracking-[-0.6px] md:text-[30px]">회원가입이 완료되었어요!</h1>
              <p className="text-[15px] leading-[1.8] text-[#9ca3b5]">
                ViewFit에 오신 걸 환영해요.
                <br />
                짧은 설문으로 나의 정보와 취향을 알려주시면,
                <br />
                나에게 딱 맞는 OTT 작품을 추천해 드릴게요.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-5 rounded-md border border-white/[0.12] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#eceef4]">나만의 추천을 위한 다섯 가지 질문</p>
              <p className="text-xs text-[#f0abfc]">약 2분</p>
            </div>
            <ol className="flex flex-col gap-3">
              {QUESTIONS.map((q, i) => (
                <li key={q} className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#eceef4]">{q}</span>
                  <span className="text-xs font-bold text-[#f0abfc]">
                    {i + 1}/{QUESTIONS.length}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <Link href="/onboarding" className={`${PRIMARY_BUTTON} h-[54px] w-full text-base`}>
              맞춤 추천 설문 시작하기
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <p className="text-center text-xs leading-[1.6] text-[#9ca3b5]">편하게 답해주세요. 취향은 나중에도 수정할 수 있어요.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
