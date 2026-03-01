const BASE_TICKET_PROB_FLOOR = 0.01;
const DURATION_MULTIPLIER = 0.35;
const MAX_TICKET_PROB_CAP = 0.95;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function estimateTicketProbability({
  location,
  day,
  hour,
  durationHours,
  aggregations,
}) {
  if (!location || !day || !Number.isFinite(hour) || !aggregations) {
    return 0;
  }

  const key = `${location}|${day}|${hour}`;
  const bucket = aggregations.byLocationDayHour.get(key);
  const locData = aggregations.byLocation.get(location);
  const maxBucketCount = toFiniteNumber(aggregations.maxBucketCount, 0);

  if (!bucket || !locData || maxBucketCount <= 0) {
    return BASE_TICKET_PROB_FLOOR;
  }

  const slotRisk = clamp(bucket.count / maxBucketCount, 0, 1);
  const locationShare = locData.count > 0
    ? clamp(bucket.count / locData.count, 0, 1)
    : 0;

  const normalizedDuration = Math.max(0, toFiniteNumber(durationHours, 1));
  const durationFactor = 1 + (normalizedDuration - 1) * DURATION_MULTIPLIER;

  const baseRisk = 0.7 * slotRisk + 0.3 * locationShare;
  const probability = clamp(
    BASE_TICKET_PROB_FLOOR + (baseRisk * durationFactor),
    BASE_TICKET_PROB_FLOOR,
    MAX_TICKET_PROB_CAP,
  );

  return probability;
}

export function calculateParkingEV({
  parkingCost,
  ticketProbability,
  ticketCost = 50,
}) {
  const safeParkingCost = Math.max(0, toFiniteNumber(parkingCost, 0));
  const safeTicketProbability = clamp(toFiniteNumber(ticketProbability, 0), 0, 1);
  const safeTicketCost = Math.max(0, toFiniteNumber(ticketCost, 50));

  return safeParkingCost + (safeTicketProbability * safeTicketCost);
}

export function calculateUberEV({
  outboundFare,
  returnFare,
  bufferPct = 0,
}) {
  const safeOutbound = Math.max(0, toFiniteNumber(outboundFare, 0));
  const safeReturn = Math.max(0, toFiniteNumber(returnFare, 0));
  const safeBuffer = Math.max(0, toFiniteNumber(bufferPct, 0));
  const subtotal = safeOutbound + safeReturn;
  return subtotal * (1 + safeBuffer);
}

export function calculateBreakEvenProbability({
  parkingCost,
  uberCost,
  ticketCost = 50,
}) {
  const safeParkingCost = Math.max(0, toFiniteNumber(parkingCost, 0));
  const safeUberCost = Math.max(0, toFiniteNumber(uberCost, 0));
  const safeTicketCost = Math.max(0, toFiniteNumber(ticketCost, 50));

  if (safeTicketCost === 0) return null;
  const raw = (safeUberCost - safeParkingCost) / safeTicketCost;
  return clamp(raw, 0, 1);
}

export function buildRecommendation({
  parkingEV,
  uberEV,
  threshold = 0,
}) {
  const safeParkingEV = Math.max(0, toFiniteNumber(parkingEV, 0));
  const safeUberEV = Math.max(0, toFiniteNumber(uberEV, 0));
  const safeThreshold = Math.max(0, toFiniteNumber(threshold, 0));

  const difference = safeUberEV - safeParkingEV;
  const recommendation = difference > safeThreshold ? 'PARK' : 'UBER';

  return {
    recommendation,
    parkingEV: safeParkingEV,
    uberEV: safeUberEV,
    difference,
    savings: Math.abs(difference),
  };
}

export function getTicketProbabilityConfidence(sampleCount) {
  const count = Math.max(0, toFiniteNumber(sampleCount, 0));
  if (count >= 20) return 'High';
  if (count >= 8) return 'Medium';
  return 'Low';
}

