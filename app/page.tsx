import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const steps = [
  ["1", "Name the destination", "Tell your mentor where you are headed. It maps the gaps and turns a big career change into a humane plan."],
  ["2", "Do the rep", "Receive one useful task at a time in Telegram. When you get stuck, show your work and earn the next hint."],
  ["3", "Carry the proof", "Reviews, defenses, and artifacts become a public transcript: evidence a stranger can actually inspect."],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">An apprenticeship agent for adults changing careers</p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.98] tracking-tight text-ink sm:text-7xl">
            The AI that won&apos;t do your homework.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/70 sm:text-xl">
            Journeyman handles the planning, the gentle nudges, and the sharp review—so the part that changes your career is still yours: the practice.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full bg-ink px-6 py-3 font-semibold text-cream transition hover:bg-forest">Begin with Telegram</Link>
            <Link href="/demo" className="rounded-full border border-forest/25 bg-white/50 px-6 py-3 font-semibold text-ink transition hover:border-forest">Read a real transcript</Link>
          </div>
        </div>
        <div className="relative mt-16 rounded-[2rem] bg-ink p-7 text-cream shadow-soft sm:p-10">
          <p className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">“Using AI to do your learning is like sending a robot to the gym for you.”</p>
          <p className="mt-5 max-w-xl leading-7 text-cream/70">Journeyman makes productive struggle visible, supported, and worth something—not a lonely obstacle to work around.</p>
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#8dbb7a] opacity-20 blur-3xl" />
        </div>
      </section>
      <section className="border-y border-forest/10 bg-white/50 py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">The loop</p>
          <h2 className="mt-3 font-display text-4xl text-ink">A masterwork, one honest rep at a time.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map(([number, title, body]) => (
              <article key={number} className="rounded-3xl border border-forest/10 bg-cream p-7">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#cce6bd] text-sm font-bold text-forest">{number}</span>
                <h3 className="mt-6 text-xl font-bold tracking-tight text-ink">{title}</h3>
                <p className="mt-3 leading-7 text-ink/65">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>Journeyman · proof over claims</span>
        <span>Built for bad weeks, big changes, and real work.</span>
      </footer>
    </main>
  );
}