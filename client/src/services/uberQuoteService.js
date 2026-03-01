function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function roundToCents(value) {
  return Math.round(value * 100) / 100;
}

function getHourModifier(datetime) {
  if (!(datetime instanceof Date) || Number.isNaN(datetime.getTime())) {
    return 0;
  }

  const hour = datetime.getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    return 2.5;
  }
  if (hour >= 22 || hour <= 5) {
    return 1.25;
  }
  return 0;
}

function getDayModifier(datetime) {
  if (!(datetime instanceof Date) || Number.isNaN(datetime.getTime())) {
    return 0;
  }

  const day = datetime.getDay();
  return day === 0 || day === 6 ? 1 : 0;
}

/**
 * TODO (real API migration):
 * - Move provider API calls to backend proxy for credential safety.
 * - Add auth + token refresh handling for provider APIs.
 * - Add retry + fallback behavior when live quote fetch fails.
 */
export async function getRoundTripQuote({ origin, destination, datetime = new Date() }) {
  const safeOrigin = (origin || '').trim();
  const safeDestination = (destination || '').trim();
  const seedInput = `${safeOrigin}|${safeDestination}`;
  const seed = hashString(seedInput);

  const baseFare = 7 + ((seed % 700) / 100);
  const timeAdjust = getHourModifier(datetime) + getDayModifier(datetime);

  const outboundFare = roundToCents(baseFare + timeAdjust);
  const returnFare = roundToCents((baseFare * 1.08) + timeAdjust);

  return {
    outboundFare,
    returnFare,
    currency: 'USD',
    source: 'mock',
    generatedAt: new Date().toISOString(),
  };
}

