import { useMemo } from 'react';
import { useCitationData } from '../context/CitationDataContext';
import { generateInsights } from '../utils/riskEngine';

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
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

export default function AlertsFeed() {
  const { aggregations } = useCitationData();

  const insights = useMemo(() => generateInsights(aggregations), [aggregations]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Proactive Alerts</h1>
        <p className="text-sm text-slate-400 mb-6">
          AI-generated insights to help you avoid parking citations
        </p>

        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>

        {insights.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No insights generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
