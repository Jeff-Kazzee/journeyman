import Link from "next/link";
import { LoginFlow } from "./login-flow";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-7 sm:px-8">
      <Link href="/" className="font-semibold text-ink">← Journeyman</Link>
      <section className="mx-auto grid max-w-5xl gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-moss">A passwordless handoff</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-ink">Meet your mentor where you already are.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">Telegram is Journeyman&apos;s proactive nervous system: it delivers a task in the morning, keeps context through a hard week, and asks for your actual attempt before offering help.</p>
        </div>
        <LoginFlow />
      </section>
    </main>
  );
}