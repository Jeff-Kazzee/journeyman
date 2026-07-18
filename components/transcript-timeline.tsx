import type { Prisma, TranscriptEntry } from "@prisma/client";

type TranscriptRow = Pick<TranscriptEntry, "id" | "kind" | "title" | "body" | "evidence" | "createdAt">;

type EvidenceLink = { label: string; url: string };

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function evidenceLinks(evidence: Prisma.JsonValue): EvidenceLink[] {
  const candidates = Array.isArray(evidence) ? evidence : isRecord(evidence) && Array.isArray(evidence.links) ? evidence.links : [];
  return candidates.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const url = validUrl(item.url);
    if (!url) return [];
    return [{ label: typeof item.label === "string" ? item.label : `Evidence ${index + 1}`, url }];
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function TranscriptTimeline({ entries }: { entries: TranscriptRow[] }) {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-forest/15">
      {entries.map((entry) => {
        const links = evidenceLinks(entry.evidence);
        return (
          <li key={entry.id} className="relative pl-12">
            <span aria-hidden="true" className="absolute left-0 top-6 h-8 w-8 rounded-full border-[6px] border-cream bg-[#8dbb7a]" />
            <article className="rounded-3xl border border-forest/10 bg-white/75 p-6 shadow-soft">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">{entry.kind}</p>
                <time className="text-xs text-ink/45" dateTime={entry.createdAt.toISOString()}>{formatDate(entry.createdAt)}</time>
              </div>
              <h3 className="mt-3 font-display text-2xl text-ink">{entry.title}</h3>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-ink/70">{entry.body}</p>
              {links.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-forest/10 pt-4">
                  {links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="rounded-full bg-[#e8f2e1] px-3 py-1.5 text-sm font-semibold text-forest underline transition hover:bg-[#cce6bd]">{link.label} ↗</a>)}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}