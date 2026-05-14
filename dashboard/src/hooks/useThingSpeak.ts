import { useState, useEffect } from 'react';

export type ThingSpeakData = {
  timestamp: string | null;
  entryId: number | null;
  humidity: number | null;
  temperature: number | null;
  conductivity: number | null;
  pH: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  distance: number | null;
};

export type ThingSpeakResponse = {
  latest: ThingSpeakData;
  average10Mins: (ThingSpeakData & { samplesCount: number }) | null;
  averageAll: ThingSpeakData & { samplesCount: number };
};

export function useThingSpeak() {
  const [data, setData] = useState<ThingSpeakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/thingspeak/live?_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Error occurred');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll every 15 seconds (ThingSpeak free tier updates ~every 15s)
    const intervalId = setInterval(fetchData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  return { data, loading, error };
}

export function useThingSpeakHistory(results: number = 100) {
  const [history, setHistory] = useState<ThingSpeakData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/thingspeak/live/history?results=${results}&_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        if (result.success) {
          setHistory(result.data);
          setError(null);
        } else {
          setError(result.message || 'Error occurred');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [results]);

  return { history, loading, error };
}
