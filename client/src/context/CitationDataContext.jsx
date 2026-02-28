import { createContext, useContext, useEffect, useState } from 'react';
import {
  loadData,
  buildLocationLookup,
  transformRow,
  buildAggregations,
} from '../utils/dataProcessor';

const CitationDataContext = createContext(null);

export function CitationDataProvider({ children }) {
  const [state, setState] = useState({
    citations: [],
    locationLookup: new Map(),
    aggregations: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { citationRows, locationRows } = await loadData(
          '/data/citations.csv',
          '/data/locations.csv',
        );

        const locationLookup = buildLocationLookup(locationRows);
        const citations = citationRows.map((row) => transformRow(row, locationLookup));
        const aggregations = buildAggregations(citations);

        if (!cancelled) {
          setState({ citations, locationLookup, aggregations, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: err.message }));
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <CitationDataContext.Provider value={state}>
      {children}
    </CitationDataContext.Provider>
  );
}

export function useCitationData() {
  const context = useContext(CitationDataContext);
  if (!context) {
    throw new Error('useCitationData must be used within CitationDataProvider');
  }
  return context;
}
