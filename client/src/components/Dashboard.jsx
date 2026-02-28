import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useCitationData } from '../context/CitationDataContext';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
      <div className="h-64">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// Panel A: Citations by Day of Week
function PanelA({ data }) {
  const chartData = useMemo(() => {
    const maxDay = DAY_ORDER.reduce((max, d) => (data.get(d) || 0) > (data.get(max) || 0) ? d : max, DAY_ORDER[0]);
    return DAY_ORDER.map((d) => ({
      day: d.slice(0, 3),
      count: data.get(d) || 0,
      fill: d === maxDay ? '#ef4444' : '#3b82f6',
    }));
  }, [data]);

  return (
    <ChartCard title="Citations by Day of Week" subtitle="Which days see the most tickets?">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Citations" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel B: Citations by Hour
function PanelB({ data }) {
  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      count: data.get(h) || 0,
    }));
  }, [data]);

  return (
    <ChartCard title="Citations by Hour of Day" subtitle="When is enforcement most active?">
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <defs>
            <linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="count" name="Citations" stroke="#3b82f6" fill="url(#hourGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel C: Top 10 Locations
function PanelC({ data }) {
  const chartData = useMemo(() => {
    return [...data.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, v]) => ({
        name: name.length > 22 ? name.slice(0, 20) + '...' : name,
        fullName: name,
        count: v.count,
        fines: v.totalFines,
      }));
  }, [data]);

  return (
    <ChartCard title="Top 10 Ticketed Locations" subtitle="Where do most citations occur?">
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
                  <p className="text-slate-300 font-medium">{d.fullName}</p>
                  <p className="text-blue-400">Citations: <strong>{d.count}</strong></p>
                  <p className="text-green-400">Total fines: <strong>${d.fines.toFixed(2)}</strong></p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" name="Citations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel D: Violation Type Breakdown
function PanelD({ data }) {
  const chartData = useMemo(() => {
    return [...data.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((v) => ({ name: v.description, value: v.count }));
  }, [data]);

  return (
    <ChartCard title="Violation Type Breakdown" subtitle="Distribution of citation types">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
                  <p className="text-slate-300 font-medium">{payload[0].name}</p>
                  <p className="text-blue-400">Count: <strong>{payload[0].value.toLocaleString()}</strong></p>
                </div>
              );
            }}
          />
          <Legend
            formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel E: Monthly Trend
function PanelE({ data }) {
  const chartData = useMemo(() => {
    return [...data.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [y, m] = month.split('-');
        const label = new Date(+y, +m - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
        return { month: label, count };
      });
  }, [data]);

  return (
    <ChartCard title="Monthly Trend" subtitle="Citation volume over the school year">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="count" name="Citations" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel F: Warnings vs Citations
function PanelF({ data }) {
  const chartData = useMemo(() => {
    return [...data.entries()]
      .sort((a, b) => (b[1].warnings + b[1].citations) - (a[1].warnings + a[1].citations))
      .slice(0, 10)
      .map(([name, v]) => ({
        name: name.length > 18 ? name.slice(0, 16) + '...' : name,
        warnings: v.warnings,
        citations: v.citations,
      }));
  }, [data]);

  return (
    <ChartCard title="Warnings vs. Actual Citations" subtitle="Where is enforcement lenient?">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
          <Bar dataKey="citations" name="Citations" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
          <Bar dataKey="warnings" name="Warnings" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel G: Void Rate
function PanelG({ data }) {
  const chartData = useMemo(() => {
    return [...data.values()]
      .filter((v) => v.total >= 10) // only meaningful sample sizes
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10)
      .map((v) => ({
        name: v.description.length > 20 ? v.description.slice(0, 18) + '...' : v.description,
        rate: Math.round(v.rate * 100),
        voids: v.voids,
        total: v.total,
      }));
  }, [data]);

  return (
    <ChartCard title="Void Rate Analysis" subtitle="These violations are most often overturned — consider appealing">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
                  <p className="text-slate-300 font-medium">{d.name}</p>
                  <p className="text-blue-400">Void rate: <strong>{d.rate}%</strong></p>
                  <p className="text-slate-400">{d.voids} voided / {d.total} total</p>
                </div>
              );
            }}
          />
          <Bar dataKey="rate" name="Void Rate %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Panel H: Money Impact
function PanelH({ totalFines, avgFine, totalCitations }) {
  const potentialSavings = totalFines * 0.3;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-0.5">Money Impact</h3>
      <p className="text-xs text-slate-500 mb-5">Financial overview of campus citations</p>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">${totalFines.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-400 mt-1">Total Fines Issued</p>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">${avgFine.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Average Fine</p>
          </div>
          <div className="flex-1 bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-200">{totalCitations.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Total Citations</p>
          </div>
        </div>
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
          <p className="text-xs text-green-400 mb-1">If ATLAS helps avoid 30% of citations</p>
          <p className="text-2xl font-bold text-green-400">${potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-400 mt-1">Potential Savings</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { aggregations } = useCitationData();
  const { byDayOfWeek, byHour, byLocation, byViolation, byMonth, warningsByLocation, voidRateByCode, totalFines, avgFine, totalCitations } = aggregations;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Trends & Insights</h1>
        <p className="text-sm text-slate-400 mb-6">Data from {totalCitations.toLocaleString()} parking citations (Aug 2023 – May 2024)</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PanelA data={byDayOfWeek} />
          <PanelB data={byHour} />
          <PanelC data={byLocation} />
          <PanelD data={byViolation} />
          <PanelE data={byMonth} />
          <PanelF data={warningsByLocation} />
          <PanelG data={voidRateByCode} />
          <PanelH totalFines={totalFines} avgFine={avgFine} totalCitations={totalCitations} />
        </div>
      </div>
    </div>
  );
}
