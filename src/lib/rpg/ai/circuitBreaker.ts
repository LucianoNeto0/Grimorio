type CircuitState = {
  failures: number;
  windowStartedAt: number;
  openUntil: number;
  halfOpenInFlight: boolean;
};

export class CircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 60_000,
    private readonly windowMs = 60_000,
  ) {}

  canRequest(key: string, now = Date.now()): boolean {
    const state = this.states.get(key);
    if (!state) return true;
    if (state.openUntil > now) return false;
    if (state.openUntil > 0) {
      if (state.halfOpenInFlight) return false;
      state.halfOpenInFlight = true;
      return true;
    }
    if (now - state.windowStartedAt > this.windowMs) {
      state.failures = 0;
      state.windowStartedAt = now;
    }
    return true;
  }

  recordSuccess(key: string) {
    this.states.delete(key);
  }

  recordFailure(key: string, now = Date.now()): { opened: boolean; count: number } {
    const state = this.states.get(key) ?? {
      failures: 0,
      windowStartedAt: now,
      openUntil: 0,
      halfOpenInFlight: false,
    };
    if (now - state.windowStartedAt > this.windowMs) {
      state.failures = 0;
      state.windowStartedAt = now;
    }
    state.failures++;
    state.halfOpenInFlight = false;
    const wasOpen = state.openUntil > now;
    if (state.failures >= this.threshold || state.openUntil > 0)
      state.openUntil = now + this.cooldownMs;
    this.states.set(key, state);
    return { opened: !wasOpen && state.openUntil > 0, count: state.failures };
  }

  recordConfigurationFailure(key: string) {
    this.states.delete(key);
  }

  getState(key: string, now = Date.now()): "closed" | "open" | "half-open" {
    const state = this.states.get(key);
    if (!state || state.openUntil === 0) return "closed";
    return state.openUntil > now ? "open" : "half-open";
  }
}
