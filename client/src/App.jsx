import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CitationDataProvider, useCitationData } from './context/CitationDataContext';
import Navbar from './components/Navbar';
import HeatMap from './components/HeatMap';
import RiskCalculator from './components/RiskCalculator';
import Dashboard from './components/Dashboard';
import AlertsFeed from './components/AlertsFeed';
import Reporting from './components/Reporting';

function AppContent() {
  const { loading, error } = useCitationData();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading citation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 font-medium mb-2">Failed to load data</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-0">
              <HeatMap />
            </div>
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-700 overflow-y-auto">
              <RiskCalculator />
            </div>
          </div>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/alerts" element={<AlertsFeed />} />
      <Route path="/reporting" element={<Reporting />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CitationDataProvider>
        <Navbar />
        <main className="flex-1 flex flex-col pt-14">
          <AppContent />
        </main>
      </CitationDataProvider>
    </BrowserRouter>
  );
}
