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

The app ingests a CSV of parking citations. Each row contains:

| Field | Type | Example | Parsing Notes |
|-------|------|---------|---------------|
| `TICKET_#` | string | `"AE0201711117"` | Alphanumeric unique citation ID |
| `Issue Date` | string | `"8/22/2023"` | M/D/YYYY format — parse with `new Date(value)` or dayjs |
| `CODE` | number | `1` | Numeric violation code |
| `Description` | string | `"Overtime"` | Human-readable violation type |
| `BASE_AMOUNT` | number | `10` | Base fine in dollars |
| `AMOUNT_DUE` | number | `0` | Total owed — can be 0 for warnings or voided tickets |
| `LOCATION` | string | `"Outdoor Adventures Center"` | Building or lot name (not a street address) |
| `Warning` | number (0/1) | `0` | 0 = actual citation, 1 = warning only. Cast: `!!parseInt(value)` |
| `Void` | number (0/1) | `0` | 0 = valid citation, 1 = voided. Cast: `!!parseInt(value)` |
| `DAY_OF_WEEK` | string | `"Tuesday"` | Full day name, capitalized |
| `HOUR` | number | `15` | 24-hour format (0–23) |
| `MINUTE` | number | `44` | 0–59 |
| `SECONDS` | number | `56` | 0–59 |
| `Coordinates` | string | `"40.82382557, -96.70103789"` | `"lat, lng"` as a single string — split on comma, trim, parse as floats. Campus is in Lincoln, Nebraska. |

---

## Project Structure

```
parksmart/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeatMap.jsx          # Leaflet heatmap with filters
│   │   │   ├── RiskCalculator.jsx   # "Should I Park Here?" panel
│   │   │   ├── Dashboard.jsx        # Trends & insights charts
│   │   │   ├── AlertsFeed.jsx       # Proactive insight cards
│   │   │   ├── RiskGauge.jsx        # Color-coded risk score display
│   │   │   └── Navbar.jsx           # Navigation between views
│   │   ├── utils/
│   │   │   ├── dataProcessor.js     # CSV parsing and data transformation
│   │   │   └── riskEngine.js        # Risk score and insight generation
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── public/
│       └── data/
│           └── citations.csv        # Raw citation data
├── server/                          # Express backend (optional)
│   ├── index.js
│   ├── routes/
│   │   ├── citations.js             # Citation data endpoints
│   │   └── predictions.js           # Risk score endpoints
│   └── utils/
│       └── analytics.js             # Server-side data processing
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd parksmart

# Install dependencies
npm install

# Install frontend dependencies
cd client
npm install
```

### Add Citation Data

Place your campus parking citation CSV file at:

```
client/public/data/citations.csv
```

### Run Development Server

```bash
# From the client/ directory
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
cd client
npm run build
```

---

## Key Implementation Notes

### Coordinates Parsing

The `Coordinates` field is a single string like `"40.82382557, -96.70103789"`. Parse it by splitting on the comma:

```js
const [lat, lng] = coord.split(',').map(s => parseFloat(s.trim()));
```

Center the Leaflet map at approximately `[40.824, -96.701]` with zoom level ~16.

### Warning and Void Fields

These are `0`/`1` integers, not booleans or `"Yes"`/`"No"` strings. Convert during CSV parsing:

```js
const isWarning = value === '1' || value === 1;
```

Use PapaParse's `dynamicTyping: true` to auto-convert numbers.

### Date Parsing

`Issue Date` uses M/D/YYYY format (e.g., `"8/22/2023"`). This is not ISO format. `new Date(value)` handles it in most environments, or use dayjs for reliability.

### SECONDS / Coordinates Edge Case

In the raw CSV, the `SECONDS` field may appear merged with `Coordinates` as `"56 40.82382557, -96.70103789"`. PapaParse handles this correctly for tab-delimited files, but verify during ingestion. If the fields are merged, split on the first space:

```js
const [seconds, coordinates] = mergedValue.split(/ (.+)/);
```

### Performance Strategy

- All filtering is client-side for speed at hackathon scale.
- Pre-compute aggregations on CSV load and store in React Context to avoid re-processing on every filter change.

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
