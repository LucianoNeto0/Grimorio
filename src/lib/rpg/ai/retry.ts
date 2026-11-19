export function computeBackoffMs(
  retryIndex: number,
  baseMs: number,
  maxMs: number,
  jitterMs: number,
  random = Math.random,
) {
  const exponential = Math.min(maxMs, baseMs * 2 ** retryIndex);
  return Math.min(maxMs, exponential + Math.floor(random() * (jitterMs + 1)));
}

export function sleepWithSignal(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}
