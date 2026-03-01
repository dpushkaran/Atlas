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

function haversineMiles(a, b) {
  const earthRadiusMiles = 3958.8;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = (sinDLat ** 2) + (Math.cos(lat1) * Math.cos(lat2) * (sinDLng ** 2));
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function midpoint(low, high) {
  if (Number.isFinite(low) && Number.isFinite(high)) {
    return (low + high) / 2;
  }
  if (Number.isFinite(low)) return low;
  if (Number.isFinite(high)) return high;
  return null;
}

function selectBestUberProduct(prices) {
  if (!Array.isArray(prices) || prices.length === 0) return null;

  const numeric = prices.filter((p) => (
    Number.isFinite(p?.low_estimate) || Number.isFinite(p?.high_estimate)
  ));
  if (numeric.length === 0) return null;

  const preferred = numeric.find((p) => p.display_name?.toLowerCase() === 'uberx');
  return preferred || numeric[0];
}

async function geocodeAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');
  url.searchParams.set('q', address);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to geocode origin address');
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No geocode result for origin address');
  }

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}

async function getUberLegEstimate({ start, end, serverToken }) {
  const url = new URL('https://api.uber.com/v1.2/estimates/price');
  url.searchParams.set('start_latitude', String(start.lat));
  url.searchParams.set('start_longitude', String(start.lng));
  url.searchParams.set('end_latitude', String(end.lat));
  url.searchParams.set('end_longitude', String(end.lng));

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${serverToken}`,
      'Accept-Language': 'en_US',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Uber estimate request failed (${response.status})`);
  }

  const data = await response.json();
  const product = selectBestUberProduct(data.prices);
  if (!product) {
    throw new Error('No numeric Uber estimate available for this route');
  }

  const estimate = midpoint(product.low_estimate, product.high_estimate);
  if (!Number.isFinite(estimate)) {
    throw new Error('Invalid Uber estimate response');
  }

  return {
    fare: roundToCents(estimate),
    currency: product.currency_code || 'USD',
    product: product.display_name || 'Unknown',
  };
}

async function getPickupLocationPredictedQuote({ origin, datetime }) {
  const safeOrigin = (origin || '').trim();
  const timeAdjust = getHourModifier(datetime) + getDayModifier(datetime);
  const campusCenter = { lat: 40.824, lng: -96.701 };

  let locationFactor;
  try {
    const pickupCoords = await geocodeAddress(safeOrigin);
    const milesFromCenter = haversineMiles(pickupCoords, campusCenter);
    // Treat farther pickup points as generally higher cost zones.
    locationFactor = 6 + Math.min(14, milesFromCenter * 1.8);
  } catch {
    // Fallback when geocoding fails: deterministic location bucket from address text.
    const seed = hashString(safeOrigin || 'unknown-pickup');
    locationFactor = 7 + ((seed % 900) / 100);
  }

  const outboundFare = roundToCents(locationFactor + timeAdjust);
  const returnFare = roundToCents((locationFactor * 1.06) + timeAdjust);

  return {
    outboundFare,
    returnFare,
    currency: 'USD',
    source: 'pickup_prediction',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * TODO (real API migration):
 * - Move provider API calls to backend proxy for credential safety.
 * - Add auth + token refresh handling for provider APIs.
 * - Add retry + fallback behavior when live quote fetch fails.
 */
export async function getRoundTripQuote({
  origin,
  destination,
  destinationCoords = null,
  datetime = new Date(),
}) {
  const serverToken = import.meta.env.VITE_UBER_SERVER_TOKEN?.trim();
  const safeOrigin = (origin || '').trim();
  const safeDestination = (destination || '').trim();

  if (!serverToken || !safeOrigin || !safeDestination) {
    return getPickupLocationPredictedQuote({ origin: safeOrigin, datetime });
  }

  try {
    const originCoords = await geocodeAddress(safeOrigin);
    const resolvedDestinationCoords = (
      destinationCoords
      && Number.isFinite(destinationCoords.lat)
      && Number.isFinite(destinationCoords.lng)
    )
      ? destinationCoords
      : await geocodeAddress(safeDestination);

    const outbound = await getUberLegEstimate({
      start: originCoords,
      end: resolvedDestinationCoords,
      serverToken,
    });

    const inbound = await getUberLegEstimate({
      start: resolvedDestinationCoords,
      end: originCoords,
      serverToken,
    });

    return {
      outboundFare: outbound.fare,
      returnFare: inbound.fare,
      currency: outbound.currency || inbound.currency || 'USD',
      source: 'uber_api',
      product: outbound.product || inbound.product || 'Unknown',
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ...(await getPickupLocationPredictedQuote({ origin: safeOrigin, datetime })),
      source: 'pickup_prediction_fallback',
    };
  }
}

