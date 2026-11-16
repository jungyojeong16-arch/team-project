"use client";

import { useEffect, useState } from "react";
import { getAccount, onAuthChange, type Account } from "./account";

/**
 * 지금 로그인한 계정 (로그인·로그아웃하면 바로 바뀜)
 * ready 가 false 인 동안은 아직 브라우저 저장소를 읽기 전입니다.
 */
export function useAccount(): { account: Account | null; ready: boolean } {
  const [state, setState] = useState<{ account: Account | null; ready: boolean }>({ account: null, ready: false });

  useEffect(() => {
    const read = () => setState({ account: getAccount(), ready: true });
    read();
    return onAuthChange(read);
  }, []);

  return state;
}
