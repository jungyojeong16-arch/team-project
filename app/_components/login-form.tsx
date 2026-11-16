"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, MessageCircle } from "lucide-react";
import { ApiError, logIn, type Account } from "../_lib/account";
import { CheckMark } from "./onboarding-ui";

/* ============================================================================
 * 1-2 로그인 폼 — 웹 시작 화면(Figma 179:1801)과 로그인 창(Figma 161:1637)이 같이 씁니다.
 *   variant="start"  흰 [로그인] 버튼 + 이메일 기억하기 + 테두리 소셜 버튼
 *   variant="modal"  분홍 [로그인 →] 버튼 + 색 있는 소셜 버튼
 * 로그인 아이디는 팀 결정 D1 에 따라 '이메일' 입니다 (로그인 창 Figma 의 '아이디' 대신).
 * ========================================================================== */

const REMEMBER_KEY = "viewfit.rememberEmail";
const SOON = "준비 중이에요. 지금은 이메일로 로그인해 주세요.";

const inputClass =
  "h-[52px] w-full rounded-md border border-white/[0.12] bg-white/[0.02] px-4 text-sm text-white placeholder:text-[#6b7487] transition focus:border-fuchsia-300/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/30";

export function LoginForm({ variant, onSuccess }: { variant: "start" | "modal"; onSuccess: (account: Account) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 이메일 기억하기: 이메일만 저장 (비밀번호는 절대 저장하지 않음)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* 무시 */
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const account = await logIn({ email: email.trim(), password });
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* 무시 */
      }
      onSuccess(account);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const isStart = variant === "start";

  return (
    <div className="flex flex-col gap-7">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${variant}-login-email`} className="text-sm font-medium text-[#eceef4]">
            이메일
          </label>
          <input
            id={`${variant}-login-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소를 입력해 주세요"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${variant}-login-password`} className="text-sm font-medium text-[#eceef4]">
            비밀번호
          </label>
          <div className="relative">
            <input
              id={`${variant}-login-password`}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#9ca3b5] transition hover:text-white"
            >
              {visible ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        <div className={`flex items-center ${isStart ? "justify-between" : "justify-end"}`}>
          {isStart && (
            <button type="button" role="checkbox" aria-checked={remember} onClick={() => setRemember((r) => !r)} className="flex items-center gap-2 text-xs text-[#9ca3b5]">
              <CheckMark state={remember ? "checked" : "unchecked"} />
              이메일 기억하기
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotice(SOON)}
            className={isStart ? "text-xs font-medium text-[#eceef4] underline underline-offset-2" : "text-[13px] text-[#9ca3b5] hover:text-white"}
          >
            비밀번호 찾기
          </button>
        </div>

        {(error || notice) && (
          <p role="alert" className={`rounded-md px-4 py-3 text-sm ${error ? "border border-rose-400/40 bg-rose-400/10 text-rose-300" : "border border-white/[0.12] bg-white/[0.04] text-[#eceef4]"}`}>
            {error ?? notice}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`flex h-[54px] w-full items-center justify-center gap-2.5 rounded-md text-base font-bold transition hover:brightness-105 disabled:opacity-60 ${
            isStart ? "bg-[#eceef4] text-[#141722]" : "bg-[#f0abfc] text-[#241229]"
          }`}
        >
          {submitting ? "로그인하는 중…" : "로그인"}
          {!isStart && !submitting && <ArrowRight className="h-[18px] w-[18px]" />}
        </button>
      </form>

      {/* 소셜 로그인 — 2순위(P2): 지금은 안내만 */}
      <div className="flex flex-col gap-4">
        <Divider label={isStart ? "소셜 계정으로 시작하기" : "소셜 계정으로 간편 로그인"} />
        <div className="flex gap-2.5 md:gap-3">
          {isStart ? (
            <>
              <SocialButton onClick={() => setNotice(SOON)} className="border border-white/[0.12] bg-white/[0.02] text-[#eceef4]">
                <MessageCircle className="h-[18px] w-[18px] fill-[#fee500] text-[#fee500]" /> 카카오로 시작
              </SocialButton>
              <SocialButton onClick={() => setNotice(SOON)} className="border border-white/[0.12] bg-white/[0.02] text-[#eceef4]">
                <span className="font-black text-[#03c75a]">N</span> 네이버로 시작
              </SocialButton>
              <SocialButton onClick={() => setNotice(SOON)} className="border border-white/[0.12] bg-white/[0.02] text-[#eceef4]">
                <span className="font-bold text-[#4285f4]">G</span> 구글로 시작
              </SocialButton>
            </>
          ) : (
            <>
              <SocialButton onClick={() => setNotice(SOON)} className="h-12 bg-[#fee500] text-[13px] text-[#191919]">
                <MessageCircle className="h-5 w-5 fill-[#191919] text-[#191919]" /> 카카오
              </SocialButton>
              <SocialButton onClick={() => setNotice(SOON)} className="h-12 bg-[#03c75a] text-[13px] text-white">
                <span className="text-xl font-black">N</span> 네이버
              </SocialButton>
              <SocialButton onClick={() => setNotice(SOON)} className="h-12 bg-white text-[13px] text-[#191919]">
                <span className="text-xl font-bold text-[#4285f4]">G</span> Google
              </SocialButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="h-px flex-1 bg-white/[0.12]" />
      <span className="shrink-0 text-xs text-[#758096]">{label}</span>
      <span className="h-px flex-1 bg-white/[0.12]" />
    </div>
  );
}

function SocialButton({ onClick, className, children }: { onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-md text-sm font-bold transition hover:brightness-110 ${className}`}>
      {children}
    </button>
  );
}

/** 로그인 창 아래 "아직 ViewFit 회원이 아니신가요? 회원가입" */
export function SignupPrompt({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <p className="flex items-center justify-center gap-2.5 border-t border-white/[0.12] pt-6 text-sm text-[#9ca3b5]">
      아직 ViewFit 회원이 아니신가요?
      <Link href="/signup" onClick={onNavigate} className="font-bold text-[#f0abfc] underline underline-offset-2">
        회원가입
      </Link>
    </p>
  );
}
