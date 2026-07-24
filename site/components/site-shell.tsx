import type { ReactNode } from "react";
import { deferredExternalPages, externalPages, internalPages, type PageKey } from "../lib/site-data";
import { withBase } from "../lib/routes";

function PageLinks({ current, showDeferred = false }: { current: PageKey; showDeferred?: boolean }) {
  return (
    <>
      {internalPages.map((page) => page.key === current
        ? <span className="nav-current" data-nav-current={page.href} key={page.key} aria-current="page">{page.label}<small>You are here</small></span>
        : <a data-nav-page={page.href} href={page.href} key={page.key}>{page.label}</a>)}
      {externalPages.map((page) => <a href={page.href} key={page.label} rel="noreferrer">{page.label}<span aria-hidden="true">↗</span></a>)}
      {showDeferred ? deferredExternalPages.map((label) => <span className="nav-disabled" data-nav-disabled key={label} aria-disabled="true">{label}<small>Coming</small></span>) : null}
    </>
  );
}

function Brand({ current }: { current: PageKey }) {
  const content = <><img src={withBase("/brand/journeyman-mark.svg")} width="40" height="40" alt="" /><span><strong>Journeyman</strong><small>The AI that won’t do your homework.</small></span></>;
  return current === "home" ? <span className="brand brand-current" aria-current="page">{content}</span> : <a className="brand" href={withBase("/")}>{content}</a>;
}

export function SiteShell({ current, children }: { current: PageKey; children: ReactNode }) {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand current={current} />
          <nav className="global-nav" data-site-nav="header" aria-label="Primary"><PageLinks current={current} /></nav>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="shell footer-grid">
          <div><p className="footer-wordmark">Journeyman</p><p className="muted">An AI mentor that helps you learn a real job by doing real work. Runs on your machine and features Hoolio, the Little AI Company owl. Built on Codex. MIT licensed.</p></div>
          <nav className="footer-nav" data-site-nav="footer" aria-label="Footer"><PageLinks current={current} showDeferred /></nav>
        </div>
        <div className="shell footer-meta"><span>A saved snapshot · nothing running behind it</span><span>Built for evidence, not theater.</span></div>
      </footer>
    </div>
  );
}

export function Owl({ pose, alt, className = "", loading = "lazy" }: { pose: "protecting" | "checking" | "teaching" | "planning" | "shipping"; alt: string; className?: string; loading?: "eager" | "lazy" }) {
  return <img className={`owl ${className}`.trim()} src={withBase(`/brand/owl/${pose}.webp`)} width="480" height="480" alt={alt} loading={loading} decoding="async" />;
}
