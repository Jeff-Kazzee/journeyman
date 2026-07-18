import type { ReactNode } from "react";

export function EmptyState({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-dashed border-forest/25 bg-white/60 p-8 shadow-soft sm:p-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">{eyebrow}</p>
      <h2 className="mt-3 max-w-xl font-display text-3xl text-ink">{title}</h2>
      <div className="mt-4 max-w-xl text-base leading-7 text-ink/65">{children}</div>
    </section>
  );
}