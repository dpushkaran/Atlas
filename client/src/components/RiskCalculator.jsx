import { useState, useMemo } from 'react';
import { useCitationData } from '../context/CitationDataContext';
import { calculateRisk, getBucketStats, getAlternatives } from '../utils/riskEngine';
import RiskGauge from './RiskGauge';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function RiskCalculator() {
  const { aggregations } = useCitationData();

  const [location, setLocation] = useState('');
  const [day, setDay] = useState('Monday');
  const [hour, setHour] = useState(9);

  const hasSelection = location !== '';

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

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100 mb-1">Should I Park Here?</h2>
        <p className="text-xs text-slate-400">Select a location, day, and time to see your risk.</p>
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
