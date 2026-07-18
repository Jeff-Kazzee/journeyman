const BELLA_BASE_URL = "http://127.0.0.1:8080";
const REQUEST_TIMEOUT_MS = 500;

export type MemoryHit = {
  content: string;
  score?: number;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHits(value: unknown): MemoryHit[] {
  const candidates = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.memories)
      ? value.memories
      : isRecord(value) && Array.isArray(value.results)
        ? value.results
        : [];

  return candidates.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.content !== "string") return [];
    return [{ content: candidate.content, ...(typeof candidate.score === "number" ? { score: candidate.score } : {}) }];
  });
}

class BellamenteMemory {
  private hasLoggedUnavailable = false;

  async recall(query: string): Promise<MemoryHit[]> {
    try {
      return parseHits(await this.post("/search", { q: query }));
    } catch (error) {
      this.logUnavailable(error);
      return [];
    }
  }

  async remember(facts: string[]): Promise<void> {
    if (facts.length === 0) return;
    try {
      await this.post("/memories", { memories: facts.map((content) => ({ content })) });
    } catch (error) {
      this.logUnavailable(error);
    }
  }

  async check(): Promise<boolean> {
    try {
      await this.post("/search", { q: "Journeyman connectivity check" });
      return true;
    } catch {
      return false;
    }
  }

  private async post(path: string, body: JsonRecord): Promise<unknown> {
    const response = await fetch(`${BELLA_BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Bellamente returned HTTP ${response.status}.`);
    return response.json();
  }

  private logUnavailable(error: unknown) {
    if (this.hasLoggedUnavailable) return;
    this.hasLoggedUnavailable = true;
    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`bellamente: unavailable (optional, continuing without it): ${reason}`);
  }
}

export const mentorMemory: BellamenteMemory = new BellamenteMemory();