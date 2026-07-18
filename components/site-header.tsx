import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm text-cream transition-transform group-hover:-rotate-6">J</span>
        Journeyman
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium text-ink/70">
        <Link href="/demo" className="transition hover:text-ink">See a transcript</Link>
        <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-cream transition hover:bg-forest">Connect Telegram</Link>
      </nav>
    </header>
  );
}