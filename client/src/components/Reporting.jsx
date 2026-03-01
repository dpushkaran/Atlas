import { useMemo, useState } from 'react';
import { useCitationData } from '../context/CitationDataContext';
import {
  getParkingOutcomes,
  saveParkingOutcome,
  getParkingOutcomeStats,
} from '../utils/parkingOutcomeStore';

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatOutcomeTime(outcome) {
  if (outcome.parkedTime && typeof outcome.parkedTime === 'string') {
    return outcome.parkedTime;
  }
  if (Number.isFinite(outcome.parkedHour)) {
    return formatHour(outcome.parkedHour);
  }
  return 'Unknown time';
}

export default function Reporting() {
  const { aggregations } = useCitationData();
  const [parkedLocation, setParkedLocation] = useState('');
  const [parkedDate, setParkedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [parkedTime, setParkedTime] = useState('');
  const [gotTicketed, setGotTicketed] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(() => getParkingOutcomeStats());

  const recentOutcomes = useMemo(() => getParkingOutcomes().slice(0, 8), [stats.total]);

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!parkedLocation || !parkedDate || !parkedTime.trim()) {
      setMessage('Please provide location, date, and time.');
      return;
    }

    saveParkingOutcome({
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      parkedLocation,
      parkedDate,
      parkedTime: parkedTime.trim(),
      gotTicketed,
    });

    setStats(getParkingOutcomeStats());
    setGotTicketed(false);
    setParkedTime('');
    setMessage('Report submitted. Thank you.');
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Reporting</h1>
          <p className="text-sm text-slate-400">
            Submit parking outcomes to improve future recommendation models.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
          <h2 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Submit Parking Outcome
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Parked Location</label>
              <select
                value={parkedLocation}
                onChange={(e) => setParkedLocation(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select where you parked...</option>
                {aggregations.uniqueLocations.map((loc) => (
                  <option key={`report-${loc}`} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={parkedDate}
                  onChange={(e) => setParkedDate(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Time</label>
                <input
                  type="text"
                  value={parkedTime}
                  onChange={(e) => setParkedTime(e.target.value)}
                  placeholder="e.g. 1:05 pm"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={gotTicketed}
                onChange={(e) => setGotTicketed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              I got ticketed
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Submit Outcome
              </button>
            </div>
          </form>

          <div className="text-xs text-slate-500 border-t border-slate-700 pt-2 space-y-1">
            <p>Collected records: {stats.total}</p>
            <p>Ticketed records: {stats.ticketed} ({(stats.ticketRate * 100).toFixed(1)}%)</p>
            {message && <p className="text-slate-300">{message}</p>}
          </div>
        </div>

        {recentOutcomes.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h2 className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
              Recent Submissions
            </h2>
            <div className="space-y-2">
              {recentOutcomes.map((outcome) => (
                <div key={outcome.id} className="text-sm text-slate-300 flex items-center justify-between">
                  <span>{outcome.parkedLocation} · {outcome.parkedDate} · {formatOutcomeTime(outcome)}</span>
                  <span className={outcome.gotTicketed ? 'text-red-400' : 'text-green-400'}>
                    {outcome.gotTicketed ? 'Ticketed' : 'No ticket'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

