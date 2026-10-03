export type SupabaseRestriction = 'payment_required' | 'temporarily_unavailable';

const TEMPORARY_FAILURE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 521, 522, 524, 529]);
const RETRY_DELAY_MS = 30_000;

let restriction: SupabaseRestriction | null = null;
let retryAfter = 0;
let recoveryProbeInFlight = false;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const subscribeToSupabaseRestriction = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getSupabaseRestriction = () => restriction;

export const isSupabaseRestricted = () => restriction !== null;

export const canSendSupabaseRequest = () => {
  if (!restriction) return true;
  if (restriction === 'payment_required') return false;
  if (Date.now() < retryAfter || recoveryProbeInFlight) return false;

  recoveryProbeInFlight = true;
  return true;
};

const setRestriction = (next: SupabaseRestriction) => {
  const changed = restriction !== next;
  restriction = next;
  retryAfter = next === 'temporarily_unavailable' ? Date.now() + RETRY_DELAY_MS : Infinity;
  recoveryProbeInFlight = false;
  if (changed) notifyListeners();
};

export const recordSupabaseResponse = (status: number) => {
  if (restriction === 'payment_required') return;

  if (status === 402) {
    setRestriction('payment_required');
    return;
  }

  if (TEMPORARY_FAILURE_STATUSES.has(status)) {
    if (restriction !== 'temporarily_unavailable' || recoveryProbeInFlight) {
      setRestriction('temporarily_unavailable');
    }
    return;
  }

  if (recoveryProbeInFlight) {
    restriction = null;
    retryAfter = 0;
    recoveryProbeInFlight = false;
    notifyListeners();
  }
};

export const recordSupabaseNetworkFailure = () => {
  if (restriction === 'payment_required') return;
  if (restriction === 'temporarily_unavailable' && !recoveryProbeInFlight) return;
  setRestriction('temporarily_unavailable');
};