'use client';

import React from 'react';
import styles from './DashboardGrid.module.css';
import { 
  Droplets, 
  Thermometer, 
  Zap, 
  Beaker, 
  Activity, 
  Leaf, 
  FlaskConical,
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useThingSpeak } from '@/hooks/useThingSpeak';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

export default function DashboardGrid() {
  const { data, loading, error } = useThingSpeak();

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Syncing with AgriSense Nodes...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={48} color="#EF4444" />
        <h3>Connection Error</h3>
        <p>{error || 'No data available from ThingSpeak'}</p>
      </div>
    );
  }

  const { latest, averageAll } = data;

  const phData = [
    { name: 'pH', value: latest.pH || 0, fill: 'var(--primary-green)' }
  ];

  const cards = [
    {
      title: 'Temperature',
      value: `${latest.temperature ?? '0.00'}°C`,
      sub: `Avg: ${averageAll?.temperature ?? '0.00'}°C`,
      icon: Thermometer,
      color: '#FF6B6B',
      trend: latest.temperature! > (averageAll?.temperature ?? 0) ? 'up' : 'down'
    },
    {
      title: 'Humidity',
      value: `${latest.humidity ?? '0.00'}%`,
      sub: `Avg: ${averageAll?.humidity ?? '0.00'}°C`,
      icon: Droplets,
      color: '#4D96FF',
      trend: 'stable'
    },
    {
      title: 'Conductivity',
      value: `${latest.conductivity ?? '0.00'} uS/cm`,
      sub: `Avg: ${averageAll?.conductivity ?? '0.00'} uS/cm`,
      icon: Zap,
      color: '#FFD93D',
      trend: 'up'
    },
    {
      title: 'Soil pH',
      value: latest.pH ?? '0.00',
      sub: `Optimal: 6.0 - 7.5`,
      icon: Beaker,
      color: '#6BCB77',
      trend: 'stable'
    },
    {
      title: 'Nitrogen (N)',
      value: `${latest.nitrogen ?? '0.0'} mg/kg`,
      sub: `Avg: ${averageAll?.nitrogen ?? '0.0'}`,
      icon: Activity,
      color: '#4D96FF',
      trend: 'up'
    },
    {
      title: 'Phosphorus (P)',
      value: `${latest.phosphorus ?? '0.0'} mg/kg`,
      sub: `Avg: ${averageAll?.phosphorus ?? '0.0'}`,
      icon: Leaf,
      color: '#FFD93D',
      trend: 'down'
    },
    {
      title: 'Potassium (K)',
      value: `${latest.potassium ?? '0.0'} mg/kg`,
      sub: `Avg: ${averageAll?.potassium ?? '0.0'}`,
      icon: FlaskConical,
      color: '#6BCB77',
      trend: 'up'
    }
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card, idx) => (
        <div key={idx} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{ backgroundColor: `${card.color}15`, color: card.color }}>
              <card.icon size={20} />
            </div>
            <ArrowUpRight size={16} className={styles.topRightIcon} />
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardLabel}>{card.title}</p>
            <h2 className={styles.cardValue}>{card.value}</h2>
            <p className={styles.cardSub}>{card.sub}</p>
          </div>
          <div className={styles.cardProgress}>
             <div className={styles.progressBar} style={{ width: '70%', backgroundColor: card.color }}></div>
          </div>
        </div>
      ))}

      {/* pH Gauge Logic (Special Card) */}
      <div className={`${styles.card} ${styles.span2}`}>
        <div className={styles.cardHeader}>
           <div className={styles.iconBox} style={{ backgroundColor: '#6BCB7715', color: '#6BCB77' }}>
              <TrendingUp size={20} />
            </div>
            <p className={styles.cardLabel}>Real-time Soil Balance</p>
        </div>
        <div className={styles.gaugeContainer}>
           <div className={styles.gaugeValue}>
              <h3>{latest.pH}</h3>
              <p>Current pH</p>
           </div>
           <div className={styles.gaugeChart}>
              <ResponsiveContainer width="100%" height={140}>
                <RadialBarChart cx="50%" cy="100%" innerRadius="80%" outerRadius="120%" barSize={10} data={phData} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 14]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={5} />
                </RadialBarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}
