import { useMemo } from 'react';

export default function RiskGauge({ score }) {
  const { color, bgColor, borderColor, label } = useMemo(() => {
    if (score <= 33)
      return { color: '#22c55e', bgColor: 'bg-green-900/30', borderColor: 'border-green-700', label: 'Low Risk' };
    if (score <= 66)
      return { color: '#eab308', bgColor: 'bg-yellow-900/30', borderColor: 'border-yellow-700', label: 'Moderate Risk' };
    return { color: '#ef4444', bgColor: 'bg-red-900/30', borderColor: 'border-red-700', label: 'High Risk' };
  }, [score]);

  const clampedScore = Math.min(100, Math.max(0, score));
  const arcPath = 'M 30 110 A 80 80 0 0 1 190 110';

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-5 flex flex-col items-center`}>
      <svg viewBox="0 0 220 140" className="w-48 h-auto">
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="#334155"
          strokeOpacity="0.55"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {clampedScore > 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${clampedScore} 100`}
          />
        )}
        <text x="110" y="90" textAnchor="middle" fill={color} fontSize="32" fontWeight="700">
          {Math.round(clampedScore)}
        </text>
        <text x="110" y="112" textAnchor="middle" fill="#94a3b8" fontSize="11">
          / 100
        </text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}
