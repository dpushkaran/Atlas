const STORAGE_KEY = 'atlas:userParkingOutcomes';

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getParkingOutcomes() {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveParkingOutcome(outcome) {
  if (typeof window === 'undefined') return [];

  const current = getParkingOutcomes();
  const next = [outcome, ...current].slice(0, 5000);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getParkingOutcomeStats() {
  const outcomes = getParkingOutcomes();
  const total = outcomes.length;
  const ticketed = outcomes.filter((o) => o.gotTicketed).length;
  const ticketRate = total > 0 ? ticketed / total : 0;

  return { total, ticketed, ticketRate };
}

