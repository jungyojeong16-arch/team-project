"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Clapperboard, Heart, LogOut, RotateCcw, ThumbsDown, Timer, UserRound } from "lucide-react";
import { AuthHeader, AuthPage, FormCard, PRIMARY_BUTTON, PlatformTag, SECONDARY_BUTTON } from "../_components/onboarding-ui";
import { PLATFORM_STYLES, type PlatformCode } from "../_lib/viewfit";
import { getAccount, getOnboarding, signOut, type Account, type SavedOnboarding } from "../_lib/account";

/* ============================================================================
 * 내 프로필 (임시 레이아웃 — Figma "내 프로필" 시안 반영 예정)
 * ========================================================================== */

const LIFESTYLE_LABELS: { key: keyof SavedOnboarding["lifestyle"]; label: string }[] = [
  { key: "age_group", label: "연령대" },
  { key: "occupation", label: "직업" },
  { key: "sleep", label: "평균 수면 시간" },
  { key: "pattern", label: "생활 패턴" },
  { key: "stress", label: "스트레스 수준" },
];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const isPlatformCode = (value: string | null): value is PlatformCode => !!value && value in PLATFORM_STYLES;

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <FormCard>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="text-fuchsia-300">{icon}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </FormCard>
  );
}

function Tags({ items, empty, tone = "default" }: { items: string[]; empty: string; tone?: "default" | "muted" }) {
  if (items.length === 0) return <p className="text-sm text-white/45">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            tone === "default"
              ? "border-fuchsia-300/60 bg-fuchsia-300/10 font-bold text-fuchsia-200"
              : "border-white/10 bg-white/[0.03] text-white/70"
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PreferenceSummary({ survey }: { survey: SavedOnboarding }) {
  const { lifestyle, genres, history } = survey;
  const liked = genres.liked_all ? ["모든 장르"] : genres.liked;
  const disliked = genres.disliked_none ? ["딱히 없어요"] : genres.disliked;

  return (
    <>
      <Card icon={<UserRound className="h-5 w-5" />} title="생활 정보">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {LIFESTYLE_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <dt className="text-sm text-white/55">{label}</dt>
              <dd className="text-sm font-bold">{lifestyle[key] ?? "선택 안 함"}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card icon={<Heart className="h-5 w-5" />} title="장르 취향">
        <p className="mb-3 text-sm text-white/55">좋아하는 장르</p>
        <Tags items={liked} empty="선택한 장르가 없어요." />
        <p className="mb-3 mt-6 flex items-center gap-1.5 text-sm text-white/55">
          <ThumbsDown className="h-3.5 w-3.5" />
          피하고 싶은 장르
        </p>
        <Tags items={disliked} empty="선택한 장르가 없어요." tone="muted" />
      </Card>

      <Card icon={<Clapperboard className="h-5 w-5" />} title="시청 이력">
        {history.none || history.watched.length === 0 ? (
          <p className="text-sm text-white/45">아직 등록한 작품이 없어요.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {history.watched.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.title}</p>
                  <p className="truncate text-sm text-white/45">{item.meta}</p>
                </div>
                {isPlatformCode(item.platform) && <PlatformTag code={item.platform} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-5 text-sm text-white/55">
          <Timer className="h-4 w-4 text-fuchsia-300" />
          하루 평균 시청 시간
          <span className="ml-auto font-bold text-white">{history.daily_watch_time ?? "선택 안 함"}</span>
        </p>
      </Card>
    </>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [survey, setSurvey] = useState<SavedOnboarding | null>(null);

  useEffect(() => {
    const saved = getAccount();
    if (!saved) {
      router.replace("/signup");
      return;
    }
    setAccount(saved);
    setSurvey(getOnboarding());
  }, [router]);

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <AuthPage
      header={
        <AuthHeader
          right={
            <Link href="/" className={`${SECONDARY_BUTTON} px-5 py-2`}>
              홈으로
            </Link>
          }
        />
      }
    >
      {account && (
        <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-4 py-12 md:py-16">
          <FormCard>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-3xl font-black uppercase ring-1 ring-white/20">
                {account.email.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fuchsia-300">내 프로필</p>
                <h1 className="mt-1 break-all text-xl font-black md:text-2xl">{account.email}</h1>
                <p className="mt-1 text-sm text-white/50">{formatDate(account.created_at)} 가입</p>
              </div>
              <div className="flex gap-3">
                <Link href="/onboarding" className={`${SECONDARY_BUTTON} px-4 py-2.5 text-sm`}>
                  <RotateCcw className="h-4 w-4" />
                  취향 다시 설정
                </Link>
                <button type="button" onClick={handleSignOut} className={`${SECONDARY_BUTTON} px-4 py-2.5 text-sm`}>
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </div>
            </div>
          </FormCard>

          {survey ? (
            <PreferenceSummary survey={survey} />
          ) : (
            <FormCard>
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <p className="text-lg font-bold">아직 취향 설문을 하지 않았어요</p>
                <p className="text-sm text-white/55">3단계 설문을 마치면 나에게 맞는 작품을 추천해 드려요.</p>
                <Link href="/onboarding" className={`${PRIMARY_BUTTON} mt-2 px-6 py-3`}>
                  취향 설문 시작하기
                </Link>
              </div>
            </FormCard>
          )}
        </div>
      )}
    </AuthPage>
  );
}
