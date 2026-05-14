'use client';

import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Leaf
} from 'lucide-react';
import styles from './ml-analysis.module.css';

const API_BASE = 'http://localhost:5000/api';

export default function MLAnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch(`${API_BASE}/ml-analysis/insights`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError('Failed to fetch ML insights. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) return <div className={styles.container}>Loading ML Insights...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;

  // Prepare forecast data for chart
  const forecastData = data.forecast.map((val: number, index: number) => ({
    hour: index + 1,
    N: Math.round(val * 100) / 100
  }));

  // Prepare importance data for chart
  const importanceData = Object.entries(data.importance).map(([name, value]) => ({
    name,
    value: Math.round((value as number) * 1000) / 1000
  })).sort((a, b) => b.value - a.value);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Advanced ML Insights</h1>
        <p>Real-time predictive analytics and system health monitoring</p>
      </header>

      <div className={styles.grid}>
        {/* 1. Temporal Trend Analysis */}
        <div className={styles.card}>
          <h2><TrendingUp color="#60a5fa" /> 48h Nitrogen Forecast</h2>
          <p>Predicting N levels based on historical depletion rates.</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={10} tickCount={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="N" stroke="#60a5fa" strokeWidth={3} fillOpacity={1} fill="url(#colorN)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Anomaly Detection */}
        <div className={styles.card}>
          <h2><Activity color="#f87171" /> Anomaly Detection</h2>
          <p>System health monitoring using Isolation Forest to identify sensor malfunctions or environmental extremes.</p>
          
          <div className={`${styles.anomalyBadge} ${data.anomaly.isAnomaly ? styles.danger : styles.normal}`}>
            {data.anomaly.isAnomaly ? (
              <><AlertCircle size={18} /> Anomaly Detected</>
            ) : (
              <><CheckCircle2 size={18} /> System Health: Optimal</>
            )}
          </div>

          <div className={styles.readingGrid}>
            <div className={styles.readingItem}>
              <span className={styles.readingLabel}>Nitrogen</span>
              <span className={styles.readingValue}>{data.anomaly.currentReadings.N}</span>
            </div>
            <div className={styles.readingItem}>
              <span className={styles.readingLabel}>PH Level</span>
              <span className={styles.readingValue}>{data.anomaly.currentReadings.pH}</span>
            </div>
            <div className={styles.readingItem}>
              <span className={styles.readingLabel}>Temp</span>
              <span className={styles.readingValue}>{data.anomaly.currentReadings.temp}°C</span>
            </div>
          </div>
          <div style={{ marginTop: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
            <Clock size={14} /> Last checked: {new Date(data.anomaly.timestamp).toLocaleTimeString()}
            <br />
            <Activity size={14} /> Aggregated from {data.anomaly.sampleCount || 0} samples (10-min window)
          </div>
        </div>

        {/* 3. Fertilizer Prediction (Existing Model) */}
        <div className={styles.card}>
          <h2><Leaf color="#10b981" /> Fertilizer Recommendation</h2>
          <p>Your original ML model's real-time advice for optimal crop nutrition.</p>
          
          <div className={styles.fertilizerResult}>
            <div className={styles.recValue}>{data.fertilizer}</div>
            <div className={styles.recLabel}>Optimal Requirement</div>
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
             This recommendation is generated by the core <strong>AgriSense RF Minimal</strong> model.
          </div>
        </div>

        {/* 4. Correlation Analysis */}
        <div className={styles.card}>
          <h2><BarChart3 color="#a855f7" /> Feature Importance</h2>
          <p>Quantifying the influence of environmental factors on Jaffna soil context and crop suitability.</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.7)" width={100} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {importanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#a855f7' : '#6b21a8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
