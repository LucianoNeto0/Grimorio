export const ONBOARDING_START_EVENT = "rpg:start-onboarding";

export function startOnboardingTour() {
  window.dispatchEvent(new Event(ONBOARDING_START_EVENT));
}
