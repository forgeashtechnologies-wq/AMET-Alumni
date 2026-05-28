const KEY = 'onboarding_draft_v1';

export function saveOnboardingDraft(draft) {
  try {
    const current = loadOnboardingDraft();
    const merged = { ...current, ...draft };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch (e) {
    // ignore storage errors
  }
}

export function loadOnboardingDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function clearOnboardingDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // ignore
  }
}
