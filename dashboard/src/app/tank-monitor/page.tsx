'use client';

import React from 'react';
import styles from './tank.module.css';
import { useThingSpeak, useThingSpeakHistory } from '@/hooks/useThingSpeak';
import { 
  Waves, 
  ArrowLeft,
  Droplets
} from 'lucide-react';
import Link from 'next/link';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const TANK_MAX_HEIGHT_CM = 300;
const TANK_RADIUS_CM = 50; // cylinder radius

export default function TankMonitorPage() {
  const { data: latestData, loading: liveLoading } = useThingSpeak();
  const { history, loading: historyLoading } = useThingSpeakHistory(100);

  // Format historical data for Recharts
  const chartData = [...history].reverse().map(item => {
    let level = TANK_MAX_HEIGHT_CM - (item.distance ?? TANK_MAX_HEIGHT_CM);
    if (level < 0) level = 0;
    if (level > TANK_MAX_HEIGHT_CM) level = TANK_MAX_HEIGHT_CM;
    
    return {
      time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      date: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '',
      level: Number(level.toFixed(1))
    };
  });

  // Calculate live water level & volume
  const distance = latestData?.latest.distance ?? TANK_MAX_HEIGHT_CM;
  let waterLevel = TANK_MAX_HEIGHT_CM - distance;
  if (waterLevel < 0) waterLevel = 0;
  if (waterLevel > TANK_MAX_HEIGHT_CM) waterLevel = TANK_MAX_HEIGHT_CM;
  
  const fillPercentage = (waterLevel / TANK_MAX_HEIGHT_CM) * 100;
  
  // Volume in cm^3 = pi * r^2 * h
  // 1 Liter = 1000 cm^3
  const volumeLiters = (Math.PI * Math.pow(TANK_RADIUS_CM, 2) * waterLevel) / 1000;
  const maxVolumeLiters = (Math.PI * Math.pow(TANK_RADIUS_CM, 2) * TANK_MAX_HEIGHT_CM) / 1000;

  return (
    <div className={styles.container}>
       <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Monitor</span>
        </Link>
        <div className={styles.titleArea}>
           <div className={styles.iconCircle}><Droplets size={30} /></div>
           <div>
              <h1 className={styles.title}>Water Tank Monitor</h1>
              <p className={styles.subtitle}>Real-time ultrasonic reservoir analysis.</p>
           </div>
        </div>
      </header>

      {liveLoading || historyLoading ? (
        <div className={styles.loadingBox}>
           <Waves size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
           <p style={{marginTop: '20px', color: '#64748b'}}>Syncing fluid sensors...</p>
        </div>
      ) : !latestData ? (
        <div className={styles.loadingBox}>
           <p style={{color: 'red'}}>Failed to load data.</p>
        </div>
      ) : (
        <div className={styles.contentGrid}>
          {/* Left Side: Live Tank Vis */}
          <div className={styles.tankSection}>
             <div className={styles.tankLabel}>
                <h3>Live Tank Status</h3>
                <p>Capacity: {Math.round(maxVolumeLiters).toLocaleString()} Liters</p>
             </div>

             <div className={styles.tankWrapper}>
                <div 
                  className={styles.waterFill} 
                  style={{ height: `${fillPercentage}%` }}
                >
                   <div className={styles.waterSurface}></div>
                   <div className={styles.waterBubbles}></div>
                </div>
             </div>

             <div className={styles.tankStats} style={{flexDirection: 'column', gap: '16px'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className={styles.statCol}>
                     <span>Water Volume</span>
                     <strong style={{color: '#2563EB'}}>{Math.round(volumeLiters).toLocaleString()} L</strong>
                  </div>
                  <div style={{width: '2px', background: 'var(--border-color)'}}></div>
                  <div className={styles.statCol} style={{textAlign: 'right'}}>
                     <span>Water Level</span>
                     <strong>{waterLevel.toFixed(1)} cm</strong>
                  </div>
                </div>
             </div>
          </div>

          {/* Right Side: Analytics */}
          <div className={styles.analyticsSection}>
             <div className={styles.analyticsHeader}>
                <div>
                   <h3>Filling & Depletion History</h3>
                   <p>Ultrasonic level tracked over the last 100 syncs.</p>
                </div>
             </div>

             <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                    <YAxis domain={[0, TANK_MAX_HEIGHT_CM]} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} 
                       formatter={(value: any) => [`${value} cm`, 'Water Level']}
                    />
                    <Area type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWater)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

