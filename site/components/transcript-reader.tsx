"use client";

import { useMemo, useState } from "react";
import type { ReaderMessage } from "../lib/site-data";

export function TranscriptReader({ messages }: { messages: ReaderMessage[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? messages.filter((message) => `${message.label} ${message.body}`.toLowerCase().includes(value)) : messages;
  }, [messages, query]);
  return (
    <div className="reader-layout">
      <aside className="reader-tools" aria-label="Transcript controls">
        <div className="mode-tabs"><span className="active" aria-current="true">Reader mode</span><span aria-disabled="true">Replay · coming</span></div>
        <label htmlFor="transcript-search">Search all messages</label>
        <input id="transcript-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “input/output contract”" />
        <p>{filtered.length} of {messages.length} saved messages shown.</p>
        <nav aria-label="Transcript moments"><a href="#boundary-refusal">Refusal boundary</a>{messages.filter((message) => message.marker === "hint").map((message) => <a key={message.id} href={`#${message.id}`}>Level {message.level} hint</a>)}</nav>
      </aside>
      <div className="reader-stream" aria-live="polite">
        <aside className="reader-message snapshot-boundary marker-refusal" id="boundary-refusal"><div className="margin-marker">Refusal unavailable</div><header><span>Snapshot boundary</span><time>No saved event</time></header><p>Refusals are never stored, so there is no refusal message here, and this reader doesn’t invent one. The saved conversation begins below.</p></aside>
        {filtered.map((message) => <article className={`reader-message ${message.role} ${message.marker === "hint" ? "marker-hint" : ""}`} id={message.id} key={message.id}>
          {message.marker === "hint" ? <div className="margin-marker">Hint {message.level}</div> : null}
          <header><span>{message.label}</span><time dateTime={message.createdAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Denver" }).format(new Date(message.createdAt))}</time></header>
          <p>{message.body}</p>
          <a className="message-anchor" href={`#${message.id}`} aria-label={`Link to ${message.label}`}>#</a>
        </article>)}
        {!filtered.length ? <p className="empty-search">No saved message matches “{query}”.</p> : null}
      </div>
    </div>
  );
}
