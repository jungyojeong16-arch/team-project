"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StartScreen } from "../_components/start-screen";
import { useAccount } from "../_lib/use-account";

/* ============================================================================
 * 1-2 로그인 — 웹 시작 화면(Figma 179:1801)과 같은 화면. 이미 로그인했으면 홈으로.
 * ========================================================================== */

export default function LoginPage() {
  const router = useRouter();
  const { account, ready } = useAccount();

  useEffect(() => {
    if (ready && account) router.replace("/");
  }, [ready, account, router]);

  if (!ready || account) return <div className="min-h-screen bg-[#0a0a0a]" />;
  return <StartScreen />;
}
