"use client";

import type { ContentBrief } from "../_lib/viewfit";

export function SearchResults({
  open,
  loading,
  results,
  onSelect,
}: {
  open: boolean;
  loading: boolean;
  results: ContentBrief[];
  onSelect: (item: ContentBrief) => void;
}) {
  if (!open) return null;

  return (
    <div
      role="listbox"
      aria-label="검색 결과"
      className="absolute right-0 top-full z-[60] mt-2 w-[234px] overflow-hidden rounded-md border border-white/[0.12] bg-[#0d111b] shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
    >
      {loading ? (
        <p className="px-3.5 py-3 text-xs text-white/70">찾는 중…</p>
      ) : results.length === 0 ? (
        <p className="px-3.5 py-3 text-xs text-white/70">찾는 작품이 아직 없어요</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto py-1">
          {results.slice(0, 20).map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => onSelect(item)}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition hover:bg-white/[0.07]"
            >
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.poster_url}
                  alt=""
                  className="h-[54px] w-9 shrink-0 rounded-[3px] object-cover"
                />
              ) : (
                <span className="h-[54px] w-9 shrink-0 rounded-[3px] bg-white/[0.08]" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">{item.title}</span>
                <span className="mt-1 block text-[10px] text-white/55">
                  {[item.release_year, item.content_type === "series" ? "시리즈" : "영화"].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
