import { useState, useMemo, useEffect } from 'react';
import { useCitationData } from '../context/CitationDataContext';
import { calculateRisk, getBucketStats, getAlternatives } from '../utils/riskEngine';
import {
  estimateTicketProbability,
  calculateParkingEV,
  calculateUberEV,
  calculateBreakEvenProbability,
  buildRecommendation,
  getTicketProbabilityConfidence,
} from '../utils/parkingDecisionEngine';
import { getRoundTripQuote } from '../services/uberQuoteService';
import RiskGauge from './RiskGauge';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DURATIONS = [0.5, 1, 2, 3, 4, 6];
const TICKET_COST = 50;

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getDateForSelectedDay(dayName, hour) {
  const now = new Date();
  const targetJsDay = (DAYS.indexOf(dayName) + 1) % 7;
  const currentDay = now.getDay();
  const delta = (targetJsDay - currentDay + 7) % 7;

  const selected = new Date(now);
  selected.setDate(now.getDate() + delta);
  selected.setHours(hour, 0, 0, 0);
  return selected;
}

export default function RiskCalculator() {
  const { aggregations, locationLookup } = useCitationData();

  const [location, setLocation] = useState('');
  const [day, setDay] = useState('Monday');
  const [hour, setHour] = useState(9);
  const [originAddress, setOriginAddress] = useState('');
  const [parkingCost, setParkingCost] = useState('0');
  const [durationHours, setDurationHours] = useState(1);
  const [uberQuote, setUberQuote] = useState(null);
  const [uberLoading, setUberLoading] = useState(false);
  const [uberError, setUberError] = useState(null);

  const hasSelection = location !== '';
  const safeParkingCost = Math.max(0, Number(parkingCost) || 0);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      if (!hasSelection || !originAddress.trim()) {
        setUberQuote(null);
        setUberError(null);
        return;
      }

      setUberLoading(true);
      setUberError(null);

      try {
        const datetime = getDateForSelectedDay(day, hour);
        const quote = await getRoundTripQuote({
          origin: originAddress,
          destination: location,
          destinationCoords: locationLookup.get(location) || null,
          datetime,
        });

        if (!cancelled) {
          setUberQuote(quote);
        }
      } catch {
        if (!cancelled) {
          setUberQuote(null);
          setUberError('Unable to load Uber estimate right now.');
        }
      } finally {
        if (!cancelled) {
          setUberLoading(false);
        }
      }
    }

    loadQuote();

    return () => {
      cancelled = true;
    };
  }, [hasSelection, originAddress, location, day, hour, locationLookup]);

  useEffect(() => {
    if (!hasSelection) return;
    try {
      localStorage.setItem('atlas:lastRiskSelection', JSON.stringify({
        location,
        day,
        hour,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // Ignore storage errors in private mode / restrictive environments.
    }
  }, [hasSelection, location, day, hour]);

  const riskScore = useMemo(() => {
    if (!hasSelection) return 0;
    return calculateRisk(location, day, hour, aggregations);
  }, [location, day, hour, aggregations, hasSelection]);

  const stats = useMemo(() => {
    if (!hasSelection) return null;
    return getBucketStats(location, day, hour, aggregations);
  }, [location, day, hour, aggregations, hasSelection]);

  const alternatives = useMemo(() => {
    if (!hasSelection) return [];
    return getAlternatives(day, hour, aggregations, location, 3);
  }, [location, day, hour, aggregations, hasSelection]);

  const decisionData = useMemo(() => {
    if (!hasSelection || !uberQuote) return null;

    const ticketProbability = estimateTicketProbability({
      location,
      day,
      hour,
      durationHours,
      aggregations,
    });

    const parkingEV = calculateParkingEV({
      parkingCost: safeParkingCost,
      ticketProbability,
      ticketCost: TICKET_COST,
    });

    const uberEV = calculateUberEV({
      outboundFare: uberQuote.outboundFare,
      returnFare: uberQuote.returnFare,
      bufferPct: 0,
    });

    const breakEvenProbability = calculateBreakEvenProbability({
      parkingCost: safeParkingCost,
      uberCost: uberEV,
      ticketCost: TICKET_COST,
    });

    const recommendation = buildRecommendation({ parkingEV, uberEV });
    const confidence = getTicketProbabilityConfidence(stats?.count ?? 0);

    return {
      ticketProbability,
      breakEvenProbability,
      confidence,
      ...recommendation,
      quoteSource: uberQuote.source,
      outboundFare: uberQuote.outboundFare,
      returnFare: uberQuote.returnFare,
    };
  }, [hasSelection, uberQuote, location, day, hour, durationHours, aggregations, safeParkingCost, stats?.count]);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100 mb-1">Should I Park Here?</h2>
        <p className="text-xs text-slate-400">Compare parking expected cost with Uber round-trip cost.</p>
      </div>

      {/* Location selector */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a location...</option>
          {aggregations.uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Day selector */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Day of Week</label>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Hour selector */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Time of Day</label>
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{formatHour(h)} – {formatHour(h + 1 > 23 ? 0 : h + 1)}</option>
          ))}
        </select>
      </div>

      {/* Decision inputs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
        <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Cost Inputs
        </h3>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Origin Address</label>
          <input
            value={originAddress}
            onChange={(e) => setOriginAddress(e.target.value)}
            placeholder="e.g. 1400 R St, Lincoln"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Parking Cost ($)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={parkingCost}
            onChange={(e) => setParkingCost(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Parking Duration</label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration} hour{duration !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {hasSelection && (
        <>
          <RiskGauge score={riskScore} />

          {stats && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Citations in this slot</span>
                <span className="text-slate-200 font-medium">{stats.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Most common violation</span>
                <span className="text-slate-200 font-medium">{stats.topViolation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Average fine</span>
                <span className="text-slate-200 font-medium">${stats.avgFine.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
            <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Parking vs Uber (Expected Value)
            </h3>
            {!originAddress.trim() && (
              <p className="text-xs text-slate-400">
                Enter an origin address to compute the Uber round-trip estimate.
              </p>
            )}
            {uberLoading && (
              <p className="text-xs text-slate-400">Loading Uber estimate...</p>
            )}
            {uberError && (
              <p className="text-xs text-red-400">{uberError}</p>
            )}
            {decisionData && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Parking EV</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(decisionData.parkingEV)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Uber EV (round trip)</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(decisionData.uberEV)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Estimated ticket probability</span>
                  <span className="text-slate-200 font-medium">{(decisionData.ticketProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Break-even ticket probability</span>
                  <span className="text-slate-200 font-medium">
                    {decisionData.breakEvenProbability === null
                      ? 'N/A'
                      : `${(decisionData.breakEvenProbability * 100).toFixed(1)}%`}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-sm text-slate-200 font-semibold">
                    Recommendation: {decisionData.recommendation === 'PARK' ? 'Park' : 'Take Uber'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {decisionData.recommendation === 'PARK'
                      ? `Parking is cheaper by ${formatCurrency(decisionData.savings)}.`
                      : `Uber is cheaper by ${formatCurrency(decisionData.savings)}.`}
                  </p>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Assumes max ticket cost of $50 and ticket-only outcomes.</p>
                  <p>Uber estimate (outbound {formatCurrency(decisionData.outboundFare)}, return {formatCurrency(decisionData.returnFare)}).</p>
                  <p>Ticket probability confidence: {decisionData.confidence}.</p>
                </div>
              </>
            )}
          </div>

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div>
              <h3 className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">
                Safer Alternatives
              </h3>
              <div className="space-y-2">
                {alternatives.map((alt) => (
                  <button
                    key={alt.location}
                    onClick={() => setLocation(alt.location)}
                    className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-3 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{alt.location}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          alt.score <= 33
                            ? 'bg-green-900/50 text-green-400'
                            : alt.score <= 66
                              ? 'bg-yellow-900/50 text-yellow-400'
                              : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {alt.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {alt.count} citation{alt.count !== 1 ? 's' : ''} at this time
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
