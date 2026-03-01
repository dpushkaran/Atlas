import { useMemo } from 'react';
import { useCitationData } from '../context/CitationDataContext';
import { generateInsights } from '../utils/riskEngine';

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function getCurrentDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getCurrentHour() {
  return new Date().getHours();
}

function getSavedFocusLocation() {
  try {
    const raw = localStorage.getItem('atlas:lastRiskSelection');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.location || null;
  } catch {
    return null;
  }
}

const TYPE_CONFIG = {
  HIGH_RISK: {
    icon: '\u{1F6A8}',
    accent: 'border-red-600 bg-red-900/20',
    badge: 'bg-red-900/50 text-red-400',
    label: 'High Risk',
  },
  TIP: {
    icon: '\u{1F4A1}',
    accent: 'border-blue-600 bg-blue-900/20',
    badge: 'bg-blue-900/50 text-blue-400',
    label: 'Tip',
  },
  PEAK_HOURS: {
    icon: '\u26A0\uFE0F',
    accent: 'border-yellow-600 bg-yellow-900/20',
    badge: 'bg-yellow-900/50 text-yellow-400',
    label: 'Peak Hours',
  },
};
const TYPE_ORDER = ['HIGH_RISK', 'PEAK_HOURS', 'TIP'];

function InsightCard({ insight }) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.HIGH_RISK;

  return (
    <div className={`rounded-xl border-l-4 ${config.accent} border border-slate-700 p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
            {insight.score != null && (
              <span className="text-xs text-slate-500">Risk score: {Math.round(insight.score)}</span>
            )}
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{insight.message}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {insight.location && (
              <span className="text-xs text-slate-400">
                <span className="text-slate-500">Location:</span> {insight.location}
              </span>
            )}
            {insight.day && (
              <span className="text-xs text-slate-400">
                <span className="text-slate-500">Day:</span> {insight.day}
              </span>
            )}
            {insight.hour != null && (
              <span className="text-xs text-slate-400">
                <span className="text-slate-500">Time:</span> {formatHour(insight.hour)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupInsightsByType(insights) {
  return TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_CONFIG[type]?.label || type,
    items: insights.filter((insight) => insight.type === type),
  })).filter((group) => group.items.length > 0);
}

export default function AlertsFeed() {
  const { aggregations } = useCitationData();
  const focusDay = getCurrentDayName();
  const focusHour = getCurrentHour();
  const focusLocation = getSavedFocusLocation();

  const insights = useMemo(
    () => generateInsights(aggregations, { focusLocation, focusDay, focusHour }),
    [aggregations, focusLocation, focusDay, focusHour],
  );
  const relevantInsights = useMemo(
    () => insights.filter((insight) => insight.relevanceScore > 0).slice(0, 5),
    [insights],
  );
  const remainingInsights = useMemo(
    () => insights.filter((insight) => insight.relevanceScore <= 0),
    [insights],
  );
  const groupedRelevant = useMemo(
    () => groupInsightsByType(relevantInsights),
    [relevantInsights],
  );
  const groupedRemaining = useMemo(
    () => groupInsightsByType(remainingInsights),
    [remainingInsights],
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Proactive Alerts</h1>
        <p className="text-sm text-slate-400 mb-6">
          Prioritized for {focusDay} at {formatHour(focusHour)}
          {focusLocation ? ` near ${focusLocation}` : ''}
        </p>

        {relevantInsights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">
              Most Relevant Now
            </h2>
            {groupedRelevant.map((group) => (
              <div key={`relevant-group-${group.type}`} className="mb-5 last:mb-0">
                <h3 className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.items.map((insight, i) => (
                    <InsightCard key={`relevant-${group.type}-${i}`} insight={insight} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {remainingInsights.length > 0 && (
          <div>
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
              Campus-wide Patterns
            </h2>
            {groupedRemaining.map((group) => (
              <div key={`remaining-group-${group.type}`} className="mb-5 last:mb-0">
                <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.items.map((insight, i) => (
                    <InsightCard key={`remaining-${group.type}-${i}`} insight={insight} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {insights.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No insights generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
