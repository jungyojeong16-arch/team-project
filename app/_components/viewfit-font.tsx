/* ============================================================================
 * Figma 글꼴 — 본문 Noto Sans KR, 순위 숫자 Inter Black Italic
 * layout.tsx 는 각자 PC 에만 있어서, 화면 틀(SiteShell·AuthPage)에서 글꼴을 직접 불러옵니다.
 * ========================================================================== */

export const FONT_FAMILY = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Inter:ital,wght@1,900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap";

/** 화면 틀 맨 위에 한 번 넣으면 글꼴 파일을 불러옵니다 (같은 주소는 브라우저가 한 번만 받음) */
export function ViewFitFont() {
  // precedence: React 19 가 <head> 로 옮겨 줌 (React 18 이면 그 자리에 그대로 있어도 동작)
  const hoist = { precedence: "default" } as Record<string, string>;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONT_URL} {...hoist} />
    </>
  );
}
