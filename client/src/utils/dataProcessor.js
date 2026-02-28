import Papa from 'papaparse';

function parseCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

export async function loadData(citationsUrl, locationsUrl) {
  const [citationRows, locationRows] = await Promise.all([
    parseCsv(citationsUrl),
    parseCsv(locationsUrl),
  ]);
  return { citationRows, locationRows };
}

export function buildLocationLookup(locationRows) {
  const lookup = new Map();

  for (const row of locationRows) {
    const name = row[''] ?? row[Object.keys(row)[0]];
    if (!name) continue;

    const coordStr = row['Coordinates'];
    let lat = null;
    let lng = null;

    if (coordStr && typeof coordStr === 'string') {
      const parts = coordStr.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parts[0];
        lng = parts[1];
      }
    }

    if (lat === null && row['LATITUDE'] != null && row['LONGITUDE'] != null) {
      lat = parseFloat(row['LATITUDE']);
      lng = parseFloat(row['LONGITUDE']);
    }

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) continue;

    // Auto-correct positive longitudes in the Nebraska campus range
    if (lng > 0 && lat > 40 && lat < 41) {
      lng = -lng;
    }

    lookup.set(name.trim(), { lat, lng });
  }

  return lookup;
}

export function transformRow(row, locationLookup) {
  const location = row['LOCATION'] ?? '';
  const coords = locationLookup.get(location) ?? null;

  const dateParts = (row['Issue Date'] ?? '').split('/');
  let issueDate = null;
  let month = null;
  let year = null;
  if (dateParts.length === 3) {
    const m = parseInt(dateParts[0], 10);
    const d = parseInt(dateParts[1], 10);
    const y = parseInt(dateParts[2], 10);
    issueDate = new Date(y, m - 1, d);
    month = m;
    year = y;
  }

  return {
    ticketId: row['TICKET_#'] ?? '',
    issueDate,
    month,
    year,
    monthKey: month && year ? `${year}-${String(month).padStart(2, '0')}` : null,
    code: row['CODE'] ?? 0,
    description: row['Description'] ?? '',
    baseAmount: row['BASE_AMOUNT'] ?? 0,
    amountDue: row['AMOUNT_DUE'] ?? 0,
    location,
    isWarning: (row['Warning'] ?? 0) >= 1,
    isVoid: (row['Void'] ?? 0) >= 1,
    dayOfWeek: row['DAY_OF_WEEK'] ?? '',
    hour: row['HOUR'] ?? 0,
    minute: row['MINUTE'] ?? 0,
    seconds: row['SECONDS'] ?? 0,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };
}

export function buildAggregations(records) {
  const byLocationDayHour = new Map();
  const byDayOfWeek = new Map();
  const byHour = new Map();
  const byLocation = new Map();
  const byViolation = new Map();
  const byMonth = new Map();
  const warningsByLocation = new Map();
  const voidCountByCode = new Map();
  const totalCountByCode = new Map();
  const uniqueLocations = new Set();

  let totalFines = 0;
  let totalCitations = 0;
  let maxBucketCount = 0;

  for (const r of records) {
    totalCitations++;
    uniqueLocations.add(r.location);

    // Only count fines for non-warning, non-void records
    if (!r.isWarning && !r.isVoid && r.amountDue > 0) {
      totalFines += r.amountDue;
    }

    // byLocationDayHour
    const ldhKey = `${r.location}|${r.dayOfWeek}|${r.hour}`;
    if (!byLocationDayHour.has(ldhKey)) {
      byLocationDayHour.set(ldhKey, {
        location: r.location,
        dayOfWeek: r.dayOfWeek,
        hour: r.hour,
        count: 0,
        totalFines: 0,
        violations: new Map(),
        warnings: 0,
        voids: 0,
      });
    }
    const bucket = byLocationDayHour.get(ldhKey);
    bucket.count++;
    bucket.totalFines += r.amountDue;
    bucket.violations.set(r.description, (bucket.violations.get(r.description) || 0) + 1);
    if (r.isWarning) bucket.warnings++;
    if (r.isVoid) bucket.voids++;
    if (bucket.count > maxBucketCount) maxBucketCount = bucket.count;

    // byDayOfWeek
    byDayOfWeek.set(r.dayOfWeek, (byDayOfWeek.get(r.dayOfWeek) || 0) + 1);

    // byHour
    byHour.set(r.hour, (byHour.get(r.hour) || 0) + 1);

    // byLocation
    if (!byLocation.has(r.location)) {
      byLocation.set(r.location, { count: 0, totalFines: 0 });
    }
    const loc = byLocation.get(r.location);
    loc.count++;
    loc.totalFines += r.amountDue;

    // byViolation
    const violKey = `${r.code}|${r.description}`;
    if (!byViolation.has(violKey)) {
      byViolation.set(violKey, { code: r.code, description: r.description, count: 0 });
    }
    byViolation.get(violKey).count++;

    // byMonth
    if (r.monthKey) {
      byMonth.set(r.monthKey, (byMonth.get(r.monthKey) || 0) + 1);
    }

    // warningsByLocation
    if (!warningsByLocation.has(r.location)) {
      warningsByLocation.set(r.location, { warnings: 0, citations: 0 });
    }
    const wl = warningsByLocation.get(r.location);
    if (r.isWarning) {
      wl.warnings++;
    } else {
      wl.citations++;
    }

    // voidRateByCode
    const codeKey = `${r.code}|${r.description}`;
    totalCountByCode.set(codeKey, (totalCountByCode.get(codeKey) || 0) + 1);
    if (r.isVoid) {
      voidCountByCode.set(codeKey, (voidCountByCode.get(codeKey) || 0) + 1);
    }
  }

  // Build voidRateByCode from the two maps
  const voidRateByCode = new Map();
  for (const [key, total] of totalCountByCode) {
    const voids = voidCountByCode.get(key) || 0;
    const [code, description] = key.split('|');
    voidRateByCode.set(key, {
      code: parseInt(code, 10),
      description,
      total,
      voids,
      rate: total > 0 ? voids / total : 0,
    });
  }

  const avgFine = totalCitations > 0 ? totalFines / totalCitations : 0;

  return {
    byLocationDayHour,
    byDayOfWeek,
    byHour,
    byLocation,
    byViolation,
    byMonth,
    warningsByLocation,
    voidRateByCode,
    totalFines,
    avgFine,
    totalCitations,
    maxBucketCount,
    uniqueLocations: [...uniqueLocations].sort(),
  };
}
