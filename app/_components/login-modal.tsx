"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginForm, SignupPrompt } from "./login-form";
import { Modal } from "./modal";

/* ============================================================================
 * 1-2 로그인 창 (Figma "ViewFit 로그인 창 열림" 161:1637)
 * 어느 화면에서든 openLoginModal() 을 부르면 로그인 창이 뜹니다.
 *   예) 좋아요 버튼: if (!account) return openLoginModal();
 * <LoginModalHost /> 는 SiteShell 안에 한 번만 들어 있습니다.
 * ========================================================================== */

const OPEN_EVENT = "viewfit:open-login";

export function openLoginModal() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function LoginModalHost() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // 다른 화면으로 이동하면 닫기
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      width="max-w-[552px]"
      panelClassName="bg-gradient-to-b from-[#14213a] via-[#0d111b] via-[47%] to-[#0d111b] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
      eyebrow={<p className="pt-1 text-xs font-bold text-[#f0abfc]">다시 만나는 나의 취향</p>}
      title="ViewFit에 로그인"
    >
      <p className="-mt-3.5 mb-6 text-sm leading-[1.6] text-[#9ca3b5]">취향에 꼭 맞는 이야기를 이어서 만나보세요.</p>
      <div className="flex flex-col gap-6">
        <LoginForm
          variant="modal"
          onSuccess={(account) => {
            setOpen(false);
            // 설문을 안 한 회원은 설문으로, 한 회원은 지금 화면에 그대로 (화면은 로그인 신호로 새로 그려짐)
            if (!account.survey_completed) router.push("/onboarding");
          }}
        />
        <SignupPrompt onNavigate={() => setOpen(false)} />
      </div>
    </Modal>
  );
}
