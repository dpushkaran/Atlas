# ATLAS Setup Guide

This guide only covers how to set up and run the project after pulling from GitHub.

## Prerequisites

- Node.js 18 or newer
- npm

## 1) Clone the repository

```bash
git clone <repo-url>
cd Atlas
```

## 2) Install dependencies

```bash
cd client
npm install
```

## 3) Ensure data files are in the app public folder

The frontend expects these files:

- `client/public/data/citations.csv`
- `client/public/data/locations.csv`

If they are missing, run from the `client/` folder:

```bash
cp ../Data/Citations.csv public/data/citations.csv
cp "../Data/Citation Location.csv" public/data/locations.csv
```

## 4) Run the app

```bash
npm run dev
```

Open the URL shown in terminal (usually `http://localhost:5173`).

## 5) Build for production (optional)

```bash
npm run build
npm run preview
```

## Optional environment variable

`VITE_UBER_SERVER_TOKEN` can be set in `client/.env` for live Uber estimates.
If not set, the app uses fallback pickup-location prediction.

Example `client/.env`:

```env
VITE_UBER_SERVER_TOKEN=your_token_here
```

## Troubleshooting

- If data does not load:
  - confirm you are running from `client/`
  - confirm both CSV files exist in `client/public/data/`
- If install fails:
  - check `node -v` is 18+
  - delete `client/node_modules` and rerun `npm install`
# ATLAS — Predictive Parking Citation Tool for Campus Life

**ATLAS (A Tool for Location-Aware Safety)** analyzes historical campus parking citation data to predict when and where students are most likely to receive tickets, and surfaces proactive insights to help students avoid citations and save money.

> Built for the hackathon track: *"Build a tool that predicts patterns in student behavior or campus activity and surfaces timely, proactive insights to improve student life."*

---

## Problem

Parking citations are one of the most common — and most avoidable — financial pain points for college students. Enforcement patterns are predictable, but the data is buried in public records that no one reads. ATLAS turns that raw data into an interactive, real-time decision tool so students can make smarter parking choices before they get out of the car.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React (Vite) | Single-page application framework |
| Styling | Tailwind CSS | Utility-first CSS, dark-mode-first design |
| Mapping | Leaflet.js + React-Leaflet + leaflet.heat | Interactive campus heatmap with density visualization |
| Charts | Recharts | Data visualizations for the insights dashboard |
| Backend | Node.js + Express | Optional REST API layer |
| Data Ingestion | PapaParse | CSV parsing with dynamic typing |
| Database | SQLite / In-memory JSON | Lightweight storage suitable for hackathon scale |

---

## Core Features

### 1. Interactive Citation Heatmap

A full-screen Leaflet map centered on campus showing citation density as a heatmap layer. Filter by day of week, hour range, and violation type — the heatmap updates in real time. Click any hotspot cluster for a popup with location name, total citations, most common violation, and total fines collected.

### 2. Risk Score Calculator — "Should I Park Here?"

Select a parking location, day, and time to get a 0–100 risk score based on historical citation frequency. The score is displayed as a color-coded gauge (green / yellow / red) alongside contextual stats: how many citations were issued at that location during that time slot, the most common violation, and the average fine. The calculator also suggests 2–3 nearby lower-risk alternatives.

### 3. Trends & Insights Dashboard

Eight chart panels powered by Recharts:

| Panel | Visualization | What It Shows |
|-------|--------------|---------------|
| A | Bar chart | Citations by day of week |
| B | Line / area chart | Citations by hour of day (0–23) |
| C | Horizontal bar chart | Top 10 ticketed locations with dollar amounts |
| D | Pie / donut chart | Violation type breakdown |
| E | Line chart | Monthly citation trend over the school year |
| F | Stacked bar chart | Warnings vs. actual citations by location |
| G | Bar chart | Void rate by violation code |
| H | Stat card | Total fines, average fine, potential savings estimate |

### 4. Proactive Alerts Feed

A scrollable feed of dynamically generated insight cards that simulate push notifications:

- High-risk alerts for specific location + day + hour combinations
- Tips suggesting lower-risk alternative lots
- Peak enforcement hour warnings per location

---

## Data Schema

The app ingests **two CSV files** that are joined at load time via the `LOCATION` field.

### Citations CSV — `Data/Citations.csv`

~40,438 rows of individual parking citations. Each row contains:

| Field | Type | Example | Parsing Notes |
|-------|------|---------|---------------|
| `TICKET_#` | string | `"AE0201711117"` | Alphanumeric unique citation ID |
| `Issue Date` | string | `"8/22/2023"` | M/D/YYYY format — parse with `new Date(value)` or dayjs |
| `CODE` | number | `1` | Numeric violation code (stored as zero-padded string `01` in CSV) |
| `Description` | string | `"Overtime"` | Human-readable violation type |
| `BASE_AMOUNT` | float | `10.00` | Base fine in dollars |
| `AMOUNT_DUE` | float | `0.00` | Total owed — can be 0.00 for warnings or voided tickets |
| `LOCATION` | string | `"Outdoor Adventures Center"` | Building or lot name — **join key** to the location mapping CSV |
| `Warning` | float (0.00/1.00) | `0.00` | 0 = actual citation, 1 = warning only. Cast: `value >= 1` |
| `Void` | float (0.00/1.00) | `0.00` | 0 = valid citation, 1 = voided. Cast: `value >= 1` |
| `DAY_OF_WEEK` | string | `"Tuesday"` | Full day name, capitalized |
| `HOUR` | number | `15` | 24-hour format (0–23) |
| `MINUTE` | number | `44` | 0–59 |
| `SECONDS` | number | `56` | 0–59 |

Date range in the dataset: **August 22, 2023 – May 9, 2024** (one academic year).

### Location Mapping CSV — `Data/Citation Location.csv`

~148 rows mapping each parking location name to its geographic coordinates.

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| *(unnamed first column)* | string | `"Outdoor Adventures Center"` | Location name — **join key** matching `LOCATION` in citations |
| `LATITUDE` | float | `40.82382557` | Present in some rows, absent in others |
| `LONGITUDE` | float | `-96.70103789` | Present in some rows, absent in others |
| `Coordinates` | string | `"40.82382557, -96.70103789"` | `"lat, lng"` as a single string — available for most rows |

**Important notes on the location data:**
- Some rows have `LATITUDE`/`LONGITUDE` columns populated; others only have the `Coordinates` string. Prefer `Coordinates` and fall back to the individual columns.
- ~15 locations have **no coordinates at all** (e.g., "15th Street", "Filley Dock", "Plant Science"). These citations can appear in charts and stats but are excluded from the map.
- **Data quality:** `1329 R Street` has a positive longitude (`96.70187603`) that should be `-96.70187603`. Auto-correct longitudes in the Nebraska campus range (expected ~`-96.xx`).
- The campus is in **Lincoln, Nebraska** — coordinates cluster around `40.824, -96.701`.

---

## Project Structure

```
Atlas/
├── Data/                            # Raw data files
│   ├── Citations.csv                # 40,438 parking citation records
│   └── Citation Location.csv        # 148 location-to-coordinate mappings
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeatMap.jsx          # Leaflet heatmap with filters
│   │   │   ├── RiskCalculator.jsx   # "Should I Park Here?" panel
│   │   │   ├── Dashboard.jsx        # Trends & insights charts
│   │   │   ├── AlertsFeed.jsx       # Proactive insight cards
│   │   │   ├── Reporting.jsx        # User ticket reporting page
│   │   │   ├── RiskGauge.jsx        # Color-coded risk score display
│   │   │   └── Navbar.jsx           # Navigation between views
│   │   ├── utils/
│   │   │   ├── dataProcessor.js     # CSV parsing, location join, data transformation
│   │   │   └── riskEngine.js        # Risk score and insight generation
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── public/
│       └── data/                    # CSVs copied here for static serving
│           ├── citations.csv
│           └── locations.csv
└── README.md
```

---

## Getting Started (After You Pull From GitHub)

### Prerequisites

- Node.js >= 18
- npm

### 1) Clone and enter the project

```bash
git clone <repo-url>
cd Atlas
```

### 2) Install dependencies

```bash
cd client
npm install
```

### 3) Ensure CSV data files exist in `client/public/data`

The app reads these exact files at runtime:

- `client/public/data/citations.csv`
- `client/public/data/locations.csv`

If they are missing, copy from the `Data/` folder:

```bash
cp ../Data/Citations.csv public/data/citations.csv
cp "../Data/Citation Location.csv" public/data/locations.csv
```

### 4) Run the app

```bash
npm run dev
```

Open the URL shown in terminal (usually `http://localhost:5173`).

### 5) Build for production (optional)

```bash
npm run build
npm run preview
```

---

## Quick Run Checklist

If the app does not load data, verify all three:

1. You are running commands in `client/`
2. `client/public/data/citations.csv` exists
3. `client/public/data/locations.csv` exists

---

## Optional Environment Variable

`VITE_UBER_SERVER_TOKEN` is optional. If it is not set, the app uses pickup-location prediction fallback for Uber cost estimation.

---

## Key Implementation Notes

### Two-File Data Model and Coordinate Join

Coordinates are **not** embedded in the citations CSV. They come from the separate location mapping file (`locations.csv`). At load time:

1. Parse both CSVs with PapaParse (`dynamicTyping: true`, `header: true`).
2. Build a `Map<locationName, { lat, lng }>` from the location CSV.
3. For each citation row, look up its `LOCATION` in the map to attach `lat`/`lng`.
4. Citations with no coordinate match (~15 locations) are included in charts and stats but excluded from the heatmap.

```js
// Build location lookup from location CSV
const locationLookup = new Map();
locationRows.forEach(row => {
  const name = row[''] || row[Object.keys(row)[0]]; // unnamed first column
  const coordStr = row['Coordinates'];
  if (coordStr) {
    const [lat, lng] = coordStr.split(',').map(s => parseFloat(s.trim()));
    const correctedLng = lng > 0 ? -lng : lng; // fix positive longitude errors
    locationLookup.set(name, { lat, lng: correctedLng });
  }
});
```

Center the Leaflet map at approximately `[40.824, -96.701]` with zoom level ~16.

### Warning and Void Fields

These are `0.00`/`1.00` **floats** in the CSV, not integers or booleans. With PapaParse's `dynamicTyping: true` they parse as numbers. Convert to booleans:

```js
const isWarning = row.Warning >= 1;
const isVoid = row.Void >= 1;
```

### Fine Amounts

`BASE_AMOUNT` and `AMOUNT_DUE` are **floats** (e.g., `10.00`, `35.00`). When calculating total fines, filter to only non-warning, non-void records where `AMOUNT_DUE > 0`.

### Date Parsing

`Issue Date` uses M/D/YYYY format (e.g., `"8/22/2023"`). This is not ISO format. `new Date(value)` handles it in most environments, or use dayjs for reliability.

### Data Quality

- `1329 R Street` has a **positive longitude** (`96.70187603`) that should be `-96.70187603`. Auto-correct any longitude that is positive in the Nebraska campus range.
- ~15 locations in the mapping file have no coordinates at all. These should be gracefully excluded from map rendering but still counted in all statistical aggregations.

### Performance Strategy

- All filtering is client-side for speed at hackathon scale (~40,000 records).
- Pre-compute aggregations on CSV load and store in React Context to avoid re-processing on every filter change.
- The location join is O(n) with O(1) map lookups per citation row.

---

## Prediction Logic

### Risk Score Calculation

No complex ML model is needed — the app uses statistical heuristics:

1. Group all citations by `(LOCATION, DAY_OF_WEEK, HOUR)`.
2. Count citations in each bucket.
3. Find the maximum citation count across all buckets.
4. `Risk Score = (bucket_count / max_bucket_count) * 100`
5. Clamp the result between 0 and 100.

### Insight Generation

- **High-risk alerts:** Identify the top 5 `(LOCATION, DAY_OF_WEEK, HOUR)` combinations by citation count.
- **Alternative recommendations:** For each high-risk combination, find locations at the same `(DAY_OF_WEEK, HOUR)` with the lowest citation counts.

---

## UI / UX Direction

- Dark mode by default with a clean, modern dashboard aesthetic
- Blue-to-red color gradient for risk visualization (blue = safe, red = danger)
- Main landing page: heatmap with a sidebar for the risk calculator
- Navigation tabs: **Map** | **Dashboard** | **Alerts**
- Mobile responsive — optimized for students checking on their phones before parking
- Card-based layouts for dashboard panels

---

## License

MIT
