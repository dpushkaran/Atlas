export function calculateRisk(location, day, hour, aggregations) {
  const { byLocationDayHour, byLocation } = aggregations;

  const locData = byLocation.get(location);
  if (!locData || locData.count === 0) return 0;

  const maxLocCount = Math.max(...[...byLocation.values()].map((v) => v.count));
  if (maxLocCount === 0) return 0;

  const key = `${location}|${day}|${hour}`;
  const bucket = byLocationDayHour.get(key);
  const bucketCount = bucket ? bucket.count : 0;

  // How dangerous is this location overall vs the busiest location
  const locationRisk = locData.count / maxLocCount;
  // Of all tickets at this location, what fraction fall in this day+hour
  const temporalRisk = bucketCount / locData.count;

  const score = (0.4 * locationRisk + 0.6 * temporalRisk) * 100;
  return Math.min(100, Math.max(0, score));
}

export function getBucketStats(location, day, hour, aggregations) {
  const key = `${location}|${day}|${hour}`;
  const bucket = aggregations.byLocationDayHour.get(key);
  if (!bucket || bucket.count === 0) {
    return { count: 0, topViolation: 'N/A', avgFine: 0 };
  }

  let topViolation = 'N/A';
  let topCount = 0;
  for (const [desc, cnt] of bucket.violations) {
    if (cnt > topCount) {
      topCount = cnt;
      topViolation = desc;
    }
  }

  const avgFine = bucket.count > 0 ? bucket.totalFines / bucket.count : 0;

  return { count: bucket.count, topViolation, avgFine };
}

export function getAlternatives(day, hour, aggregations, excludeLocation, limit = 3) {
  const { uniqueLocations } = aggregations;

  const candidates = [];
  for (const loc of uniqueLocations) {
    if (loc === excludeLocation) continue;
    const score = calculateRisk(loc, day, hour, aggregations);
    const key = `${loc}|${day}|${hour}`;
    const bucket = aggregations.byLocationDayHour.get(key);
    const count = bucket ? bucket.count : 0;
    candidates.push({ location: loc, score: Math.round(score), count });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, limit);
}

export function generateInsights(aggregations) {
  const { byLocationDayHour, totalCitations, maxBucketCount } = aggregations;
  if (totalCitations === 0) return [];

  const buckets = [...byLocationDayHour.entries()]
    .map(([, b]) => b)
    .sort((a, b) => b.count - a.count);

  const bucketCount = byLocationDayHour.size;
  const avgCount = totalCitations / bucketCount;
  const insights = [];

  const top5 = buckets.slice(0, 5);
  for (const bucket of top5) {
    const multiplier = avgCount > 0 ? bucket.count / avgCount : 0;
    const score = Math.round(calculateRisk(bucket.location, bucket.dayOfWeek, bucket.hour, aggregations));

    insights.push({
      type: 'HIGH_RISK',
      severity: bucket.count,
      score,
      location: bucket.location,
      day: bucket.dayOfWeek,
      hour: bucket.hour,
      message: `${bucket.location} sees ${multiplier.toFixed(1)}x more tickets on ${bucket.dayOfWeek}s between ${bucket.hour}:00\u2013${bucket.hour + 1}:00`,
    });

    const alts = getAlternatives(bucket.dayOfWeek, bucket.hour, aggregations, bucket.location, 1);
    if (alts.length > 0) {
      const alt = alts[0];
      const reduction = bucket.count > 0
        ? Math.round(((bucket.count - alt.count) / bucket.count) * 100)
        : 0;

      insights.push({
        type: 'TIP',
        severity: bucket.count * 0.5,
        score: alt.score,
        location: alt.location,
        day: bucket.dayOfWeek,
        hour: bucket.hour,
        message: `${alt.location} has ${reduction}% fewer citations than ${bucket.location} at the same time`,
      });
    }
  }

  // Peak enforcement hours per top locations
  const topLocations = [...aggregations.byLocation.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  for (const [locName] of topLocations) {
    const hourCounts = new Map();
    for (const [, b] of byLocationDayHour) {
      if (b.location === locName) {
        hourCounts.set(b.hour, (hourCounts.get(b.hour) || 0) + b.count);
      }
    }
    const sorted = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const peakHour = sorted[0][0];
      insights.push({
        type: 'PEAK_HOURS',
        severity: sorted[0][1] * 0.3,
        score: null,
        location: locName,
        day: null,
        hour: peakHour,
        message: `Peak enforcement hours at ${locName} are ${peakHour}:00\u2013${peakHour + 1}:00`,
      });
    }
  }

  insights.sort((a, b) => b.severity - a.severity);
  return insights;
}
