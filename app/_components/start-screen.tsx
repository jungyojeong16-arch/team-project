"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Moon, Sparkles } from "lucide-react";
import { AuthHeader, AuthPage, MoodChip, PlatformTag, StoryDescription, StoryHeadline } from "./onboarding-ui";
import { Divider, LoginForm } from "./login-form";

/* ============================================================================
 * 1-2 웹 시작 화면 (Figma "ViewFit 웹 시작 화면" 179:1801)
 * 로그인하지 않은 사용자가 / 또는 /login 에 오면 보이는 화면입니다.
 * 왼쪽: 서비스 소개 · 오른쪽: 로그인 + 회원가입 안내
 * ========================================================================== */

/**
 * 가운데 큰 사진(Figma "Night journey")은 Figma 에서 내보내 public/images/start-night-journey.png 로 넣으면 보입니다.
 * 파일이 없으면 어두운 푸른 그라데이션으로 대신합니다.
 */
const PREVIEW_IMAGE = "/images/start-night-journey.png";

export function StartScreen() {
  const router = useRouter();
  const [imageOk, setImageOk] = useState(true);

  return (
    <AuthPage header={<AuthHeader right={<p className="hidden text-[13px] text-[#9ca3b5] sm:block">나의 상황에 딱 맞는 OTT 큐레이션</p>} />}>
      <div className="mx-auto grid min-h-[800px] max-w-[1440px] gap-14 px-4 py-14 md:px-16 lg:grid-cols-[minmax(0,1fr)_496px] lg:items-center lg:gap-24 lg:px-28">
        {/* 왼쪽: 소개 */}
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <MoodChip icon={<Sparkles className="h-3.5 w-3.5 fill-[#f0abfc]" />}>오늘의 기분에 딱 맞는 이야기</MoodChip>
          </div>
          <div className="flex flex-col gap-[18px]">
            <StoryHeadline first="오늘 밤," lead="당신의 " accent="취향으로." />
            <StoryDescription lines={["무엇을 볼지 고민하는 시간은 줄이고,", "지금 내 기분에 어울리는 이야기를 만나보세요."]} />
          </div>

          <div className="relative h-[230px] overflow-hidden rounded-2xl border border-white/[0.12]">
            {imageOk ? (
              <img src={PREVIEW_IMAGE} alt="" onError={() => setImageOk(false)} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#1e3a8a_0%,#0b1324_55%,#050c16_100%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(5,12,22,0)] via-[rgba(5,12,22,0.2)] via-35% to-[rgba(5,12,22,0.95)]" />
            <span className="absolute left-[19px] top-[17px] flex items-center gap-1.5 rounded-full bg-[rgba(7,12,21,0.7)] px-2.5 py-[5px] text-[11px] text-[#eceef4]">
              <Moon className="h-3 w-3 text-[#f0abfc]" />
              고요한 밤 · 혼자만의 시간
            </span>
            <div className="absolute bottom-[23px] left-[23px] right-[23px] flex flex-col gap-[7px]">
              <p className="text-[11px] font-bold tracking-[0.44px] text-[#f0abfc]">지금, 이런 이야기는 어때요?</p>
              <p className="text-[23px] font-bold tracking-[-0.46px] text-white">잠깐의 일상 탈출이 필요할 때</p>
              <p className="text-xs text-[#c3cbd9]">시간, 장소, 기분에 맞춰 발견하는 나만의 작품</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#9ca3b5]">다양한 OTT를 한곳에서</span>
              <PlatformTag code="NETFLIX" />
              <PlatformTag code="TVING" />
              <PlatformTag code="DISNEY_PLUS" />
              <PlatformTag code="WATCHA" />
            </div>
            <p className="text-[11px] text-[#758096]">ViewFit은 작품을 추천해요. 시청은 각 OTT에서 즐겨주세요.</p>
          </div>
        </div>

        {/* 오른쪽: 로그인 · 회원가입 */}
        <section className="flex flex-col gap-7 rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[rgba(20,33,58,0.94)] via-[rgba(13,17,27,0.96)] via-[47%] to-[#0d111b] to-85% p-6 shadow-[0_24px_64px_rgba(0,0,0,0.38)] md:p-10">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-bold text-[#f0abfc]">취향을 발견하는 가장 쉬운 시작</p>
            <h2 className="text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">기존 회원이신가요?</h2>
            <p className="text-sm leading-[1.6] text-[#9ca3b5]">로그인하고 나만의 추천을 이어서 만나보세요.</p>
          </div>

          <LoginForm variant="start" onSuccess={(account) => router.push(account.survey_completed ? "/" : "/onboarding")} />

          <Divider label="ViewFit이 처음이라면" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[19px] font-bold tracking-[-0.38px] text-white">당신만의 이야기가 기다리고 있어요</p>
              <p className="text-[13px] leading-[1.6] text-[#9ca3b5]">취향에 맞는 추천부터 보고 싶은 작품 보관까지.</p>
            </div>
            <Link
              href="/signup"
              className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-md bg-[#f0abfc] text-sm text-[#241229] transition hover:brightness-105"
            >
              <span>
                <span className="font-medium">계정이 없다면? </span>
                <span className="font-bold">회원가입하기</span>
              </span>
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </section>
      </div>
    </AuthPage>
  );
}
