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
  // Semicircle arc: 180 degrees, left to right
  const angle = (clampedScore / 100) * 180;
  const radians = (angle * Math.PI) / 180;
  const cx = 100, cy = 100, r = 80;
  const endX = cx - r * Math.cos(radians);
  const endY = cy - r * Math.sin(radians);
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-5 flex flex-col items-center`}>
      <svg viewBox="0 0 200 120" className="w-48 h-auto">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#334155"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {clampedScore > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize="32" fontWeight="700">
          {Math.round(clampedScore)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="11">
          / 100
        </text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}
