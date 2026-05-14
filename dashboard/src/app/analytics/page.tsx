'use client';

import React from 'react';
import styles from './analytics.module.css';
import { useThingSpeak, useThingSpeakHistory } from '@/hooks/useThingSpeak';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  Info,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { data: latestData } = useThingSpeak();
  const { history, loading, error } = useThingSpeakHistory(100);

  if (loading) return <div className={styles.center}>Loading Historical Data...</div>;
  if (error) return <div className={styles.center}>Error: {error}</div>;

  const chartData = [...history].reverse().map(item => ({
    ...item,
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  }));

  const metrics = [
    { key: 'temperature', label: 'Temperature (°C)', color: '#FF6B6B' },
    { key: 'humidity', label: 'Humidity (%)', color: '#4D96FF' },
    { key: 'conductivity', label: 'Conductivity (uS/cm)', color: '#FFD93D' },
    { key: 'pH', label: 'Soil pH', color: '#6BCB77' },
  ];

  const npkMetrics = [
    { key: 'nitrogen', label: 'Nitrogen (N)', color: '#4D96FF' },
    { key: 'phosphorus', label: 'Phosphorus (P)', color: '#FFD93D' },
    { key: 'potassium', label: 'Potassium (K)', color: '#6BCB77' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Monitor</span>
        </Link>
        <h1 className={styles.title}>All-Time Series Analysis</h1>
        <p className={styles.subtitle}>Detailed historical telemetry across all sensors.</p>
      </header>

      <div className={styles.statsSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><TrendingUp size={20} /></div>
          <div className={styles.summaryInfo}>
            <p>Latest pH</p>
            <h3>{latestData?.latest?.pH ?? 'N/A'}</h3>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><Clock size={20} /></div>
          <div className={styles.summaryInfo}>
            <p>Latest Temp</p>
            <h3>{latestData?.latest?.temperature ?? 'N/A'}°C</h3>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}><Calendar size={20} /></div>
          <div className={styles.summaryInfo}>
            <p>Last Sync</p>
            <h3>{latestData?.latest?.timestamp ? new Date(latestData.latest.timestamp).toLocaleDateString() : 'N/A'}</h3>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Environmental Trends */}
        {metrics.map((m) => (
          <div key={m.key} className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3>{m.label} Trend</h3>
              <Info size={16} color="var(--text-light)" />
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`color${m.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={m.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey={m.key} stroke={m.color} fillOpacity={1} fill={`url(#color${m.key})`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}

        {/* NPK Combined Chart */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
            <div className={styles.cardHeader}>
              <h3>Soil Nutrient Analysis (N-P-K)</h3>
              <div className={styles.legendCustom}>
                {npkMetrics.map(nm => (
                  <div key={nm.key} className={styles.legendItem}>
                    <div className={styles.dot} style={{backgroundColor: nm.color}}></div>
                    <span>{nm.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip />
                  {npkMetrics.map(nm => (
                    <Line 
                      key={nm.key} 
                      type="monotone" 
                      dataKey={nm.key} 
                      stroke={nm.color} 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}
