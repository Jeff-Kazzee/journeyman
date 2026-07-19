// Next 15 passes function-valued config defaults to its export worker. Child
// processes serialize them, but this host requires worker_threads, whose
// structured clone rejects functions. Sanitize only that one RPC boundary.
const workerPath = require.resolve("next/dist/lib/worker");
const original = require(workerPath);

function withoutFunctions(value, seen = new WeakMap()) {
  if (typeof value === "function") return undefined;
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date || value instanceof RegExp || value instanceof URL || Buffer.isBuffer(value)) return value;
  if (seen.has(value)) return seen.get(value);
  const clone = Array.isArray(value) ? [] : {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    const safe = withoutFunctions(item, seen);
    if (safe !== undefined) clone[key] = safe;
  }
  return clone;
}

class StaticExportWorker extends original.Worker {
  constructor(workerFile, options) {
    super(workerFile, options);
    if (typeof this.exportPages !== "function") return;
    const exportPages = this.exportPages;
    this.exportPages = (input) => exportPages(withoutFunctions(input));
  }
}

require.cache[workerPath].exports = {
  Worker: StaticExportWorker,
  getNextBuildDebuggerPortOffset: original.getNextBuildDebuggerPortOffset,
};
