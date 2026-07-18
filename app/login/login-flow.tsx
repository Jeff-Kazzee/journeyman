"use client";

import { useCallback, useEffect, useState } from "react";

type LinkResponse = { code?: string; error?: string };

export function LoginFlow() {
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const createCode = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/link-code", { method: "POST" });
      const data = (await response.json()) as LinkResponse;
      if (!response.ok || !data.code) throw new Error(data.error ?? "Could not create a login code.");
      setCode(data.code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a login code.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void createCode(); }, [createCode]);

  useEffect(() => {
    if (!code) return;
    const poll = window.setInterval(async () => {
      const response = await fetch("/api/auth/link-status", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { linked?: boolean };
      if (data.linked) window.location.assign("/login/complete");
    }, 2500);
    return () => window.clearInterval(poll);
  }, [code]);

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">{error}<button className="ml-2 font-bold underline" onClick={() => void createCode()}>Try again</button></div>;
  }

  return (
    <div className="rounded-3xl border border-forest/15 bg-white/70 p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold text-ink/60">Your one-time link code</p>
      <p aria-live="polite" className="mt-3 font-mono text-4xl font-bold tracking-[0.18em] text-ink">{isLoading ? "········" : code}</p>
      <ol className="mt-8 space-y-4 text-sm leading-6 text-ink/70">
        <li className="flex gap-3"><span className="font-bold text-moss">1.</span><span>Open the Journeyman Telegram bot.</span></li>
        <li className="flex gap-3"><span className="font-bold text-moss">2.</span><span>Send <code className="rounded bg-cream px-1.5 py-0.5 text-ink">/link {code ?? "CODE"}</code>.</span></li>
        <li className="flex gap-3"><span className="font-bold text-moss">3.</span><span>Keep this tab open. It will sign you in as soon as Telegram confirms the link.</span></li>
      </ol>
      <div className="mt-7 flex items-center justify-between border-t border-forest/10 pt-5 text-xs text-ink/50">
        <span>Expires in 15 minutes.</span>
        <button className="font-semibold text-forest underline" onClick={() => void createCode()}>New code</button>
      </div>
    </div>
  );
}