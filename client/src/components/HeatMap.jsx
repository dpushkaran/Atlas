import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useCitationData } from '../context/CitationDataContext';

const CAMPUS_CENTER = [40.824, -96.701];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function HeatLayer({ points }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!heatRef.current) {
      heatRef.current = L.heatLayer([], {
        radius: 20,
        blur: 15,
        maxZoom: 18,
        max: 1.0,
        gradient: { 0.2: '#3b82f6', 0.5: '#eab308', 0.8: '#ef4444', 1.0: '#991b1b' },
      }).addTo(map);
    }
    heatRef.current.setLatLngs(points);
  }, [points, map]);

  return null;
}

function LocationMarkers({ locationStats }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.layerGroup().addTo(map);
    }

    for (const s of locationStats) {
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: Math.min(4 + s.count / 50, 14),
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        weight: 1,
      });

      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:180px">
          <strong style="font-size:14px">${s.location}</strong>
          <div style="margin-top:6px;font-size:12px;color:#666">
            <div>Citations: <strong>${s.count}</strong></div>
            <div>Top violation: <strong>${s.topViolation}</strong></div>
            <div>Total fines: <strong>$${s.totalFines.toFixed(2)}</strong></div>
          </div>
        </div>
      `);

      marker.addTo(layerRef.current);
    }
  }, [locationStats, map]);

  return null;
}

export default function HeatMap() {
  const { citations, locationLookup, aggregations } = useCitationData();

  const [selectedDays, setSelectedDays] = useState(new Set(DAYS));
  const [hourRange, setHourRange] = useState([0, 23]);
  const [selectedViolations, setSelectedViolations] = useState(new Set());

  const violationTypes = useMemo(() => {
    const types = new Set();
    for (const c of citations) types.add(c.description);
    return [...types].sort();
  }, [citations]);

  // Initialize all violations as selected
  useEffect(() => {
    if (selectedViolations.size === 0 && violationTypes.length > 0) {
      setSelectedViolations(new Set(violationTypes));
    }
  }, [violationTypes, selectedViolations.size]);

  const filteredPoints = useMemo(() => {
    const pts = [];
    for (const c of citations) {
      if (c.lat == null || c.lng == null) continue;
      if (!selectedDays.has(c.dayOfWeek)) continue;
      if (c.hour < hourRange[0] || c.hour > hourRange[1]) continue;
      if (selectedViolations.size > 0 && !selectedViolations.has(c.description)) continue;
      pts.push([c.lat, c.lng, 0.5]);
    }
    return pts;
  }, [citations, selectedDays, hourRange, selectedViolations]);

  const locationStats = useMemo(() => {
    const stats = new Map();
    for (const c of citations) {
      if (c.lat == null) continue;
      if (!selectedDays.has(c.dayOfWeek)) continue;
      if (c.hour < hourRange[0] || c.hour > hourRange[1]) continue;
      if (selectedViolations.size > 0 && !selectedViolations.has(c.description)) continue;

      if (!stats.has(c.location)) {
        const coords = locationLookup.get(c.location);
        stats.set(c.location, {
          location: c.location,
          lat: coords?.lat ?? c.lat,
          lng: coords?.lng ?? c.lng,
          count: 0,
          totalFines: 0,
          violations: new Map(),
        });
      }
      const s = stats.get(c.location);
      s.count++;
      s.totalFines += c.amountDue;
      s.violations.set(c.description, (s.violations.get(c.description) || 0) + 1);
    }

    return [...stats.values()].map((s) => {
      let topViolation = 'N/A';
      let topCount = 0;
      for (const [desc, cnt] of s.violations) {
        if (cnt > topCount) { topCount = cnt; topViolation = desc; }
      }
      return { ...s, topViolation };
    });
  }, [citations, locationLookup, selectedDays, hourRange, selectedViolations]);

  const toggleDay = useCallback((day) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  const toggleViolation = useCallback((v) => {
    setSelectedViolations((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={16}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <HeatLayer points={filteredPoints} />
        <LocationMarkers locationStats={locationStats} />
      </MapContainer>

      {/* Filter Panel */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-800/95 backdrop-blur rounded-xl border border-slate-700 p-4 max-w-xs max-h-[calc(100vh-8rem)] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Filters</h3>

        {/* Day of Week */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1.5">Day of Week</label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedDays.has(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Hour Range */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-1.5">
            Hours: {hourRange[0]}:00 – {hourRange[1]}:00
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={23}
              value={hourRange[0]}
              onChange={(e) => setHourRange([Math.min(+e.target.value, hourRange[1]), hourRange[1]])}
              className="flex-1 accent-blue-500"
            />
            <input
              type="range"
              min={0}
              max={23}
              value={hourRange[1]}
              onChange={(e) => setHourRange([hourRange[0], Math.max(+e.target.value, hourRange[0])])}
              className="flex-1 accent-blue-500"
            />
          </div>
        </div>

        {/* Violation Type */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Violation Type</label>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {violationTypes.map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedViolations.has(v)}
                  onChange={() => toggleViolation(v)}
                  className="accent-blue-500 rounded"
                />
                {v}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Showing {filteredPoints.length.toLocaleString()} citations
          </p>
        </div>
      </div>
    </div>
  );
}
