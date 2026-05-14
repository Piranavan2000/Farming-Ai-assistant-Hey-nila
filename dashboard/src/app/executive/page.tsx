'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import { useThingSpeak, useThingSpeakHistory } from '../../hooks/useThingSpeak';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Droplets, 
  Wind, 
  Sun, 
  Leaf, 
  ArrowUpRight, 
  Play, 
  Pause,
  Plus
} from 'lucide-react';

export default function ExecutiveDashboard() {
  const { data: sensorData, loading } = useThingSpeak();
  const { history, loading: historyLoading } = useThingSpeakHistory(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mlResult, setMlResult] = useState<string | null>(null);

  if (loading || historyLoading || !sensorData) {
    return (
      <div className={styles.loaderWrapper}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  const { latest, average10Mins } = sensorData;

  const waterLevelCm = Math.max(0, 300 - (latest.distance || 300)).toFixed(1);
  const isWaterLow = Number(waterLevelCm) < 60;
  
  const triggerSmartAnalysis = async () => {
    setIsPlaying(true);
    try {
      const avgRes = await fetch(`http://localhost:5000/api/thingspeak/live/average`);
      const avgData = await avgRes.json();

      if (!avgData.success) {
        console.error('Could not fetch live average:', avgData.message);
        setIsPlaying(false);
        return;
      }

      const liveAverage = avgData.data;
      const res = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenMinAverage: liveAverage,
          tankHeight: 300,
          radius: 50
        })
      });
      const result = await res.json();
      if (result.success) setMlResult(result.data.fertilizer);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsPlaying(false), 2000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const chartData = history.map((h) => ({
    value: h.nitrogen || 0
  }));

  return (
    <div className={styles.dashboardContainer}>
      {/* LEFT PANEL */}
      <div className={styles.leftColumn}>
        <div className={styles.verticalNav}>
          <div className={`${styles.plantIconBtn} ${styles.active}`}>
            <img src="https://cdn-icons-png.flaticon.com/512/628/628283.png" alt="Plant 1" />
          </div>
          <div className={styles.plantIconBtn}>
            <img src="https://cdn-icons-png.flaticon.com/512/628/628324.png" alt="Plant 2" />
          </div>
          <div className={`${styles.plantIconBtn} ${styles.addBtn}`}>
            <Plus size={24} />
          </div>
        </div>

        <h1 className={styles.plantTitle}>
          Precision<br />Paddy Crop
        </h1>

        <div className={styles.leafDisplay}>
          <div className={styles.leafHalo}></div>
          <img 
            src="/paddy_leaf.png" 
            alt="Leaf" 
            className={styles.leafImage}
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className={styles.scanLine}></div>

          <div className={`${styles.callout} ${styles.left}`} style={{ bottom: '25%', left: '15%' }}>
             <div className={styles.calloutText}>
               <div className={styles.calloutLabel}>Nitrogen Level</div>
               <div className={styles.calloutValue}>{latest.nitrogen} mg/kg</div>
             </div>
             <div className={styles.calloutPoint}></div>
          </div>

          <div className={styles.callout} style={{ top: '35%', right: '15%' }}>
             <div className={styles.calloutPoint}></div>
             <div className={styles.calloutText}>
               <div className={styles.calloutLabel}>pH Balance</div>
               <div className={styles.calloutValue}>{latest.pH} aH</div>
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightColumn}>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Live Telemetry</h2>
            <span className={styles.seeAll}>See all</span>
          </div>
          
          <div className={styles.healthGrid}>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon}><Droplets size={20} /></div>
              <div className={styles.healthData}><p>Water Level</p><h4>{isWaterLow ? 'Low' : `${waterLevelCm} cm`}</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon}><Wind size={20} /></div>
              <div className={styles.healthData}><p>Humidity</p><h4>{latest.humidity} %</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon}><Sun size={20} /></div>
              <div className={styles.healthData}><p>Temperature</p><h4>{latest.temperature} °C</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon}><Leaf size={20} /></div>
              <div className={styles.healthData}><p>Conductivity</p><h4>{latest.conductivity} uS/cm</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon} style={{color: '#9CA3AF'}}><strong>pH</strong></div>
              <div className={styles.healthData}><p>Acidity</p><h4>{latest.pH}</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon} style={{color: '#3B82F6'}}><strong>N</strong></div>
              <div className={styles.healthData}><p>Nitrogen</p><h4>{latest.nitrogen} mg/kg</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon} style={{color: '#10B981'}}><strong>P</strong></div>
              <div className={styles.healthData}><p>Phosphorus</p><h4>{latest.phosphorus} mg/kg</h4></div>
            </div>
            <div className={styles.healthItem}>
              <div className={styles.healthIcon} style={{color: '#8B5CF6'}}><strong>K</strong></div>
              <div className={styles.healthData}><p>Potassium</p><h4>{latest.potassium} mg/kg</h4></div>
            </div>
          </div>
        </div>

        <div className={styles.middleRow}>
          <div className={styles.growthCard}>
            <h3>N-Trend <span style={{fontSize: '0.8rem', opacity: 0.8}}>Live</span></h3>
            <div style={{ width: '100%', height: '80px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="value" stroke="var(--brand-dark)" strokeWidth={3} dot={{r: 3, fill: 'var(--brand-dark)'}} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '15px', fontWeight: 600}}>
              <span>T-4</span><span>T-3</span><span>T-2</span><span>T-1</span><span>Now</span>
            </div>
          </div>

          <div className={styles.audioCard}>
             <div className={styles.audioHeader}>
                <div>
                   <h3>Smart Analysis</h3>
                   <p style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px'}}>
                     {mlResult ? `Rec: ${mlResult}` : 'Listen to key points'}
                   </p>
                </div>
                <button 
                  onClick={triggerSmartAnalysis}
                  style={{width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', color: 'var(--grey-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} style={{marginLeft: '2px'}} />}
                </button>
             </div>
             <div className={styles.audioPlayer}>
                {Array.from({length: 40}).map((_, i) => (
                  <div 
                     key={i} 
                     className={`${styles.bar} ${isPlaying || i < 15 ? styles.active : ''}`}
                     style={{ height: `${Math.random() * 80 + 20}%`, opacity: isPlaying ? 1 : 0.4 }}
                  ></div>
                ))}
             </div>
             <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '12px', color: 'rgba(255,255,255,0.5)'}}>
               <span>1x</span>
               <span>20:16</span>
             </div>
          </div>
        </div>

        <div className={styles.card} style={{flex: 1}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent Updates</h2>
            <span className={styles.seeAll}>See all</span>
          </div>
          
          <div className={styles.updateList}>
            {history.slice(-3).reverse().map((record, index) => {
              if (index === 0) {
                 return (
                   <div className={styles.updateItem} key={record.entryId || index}>
                     <div className={styles.updateIcon}><ArrowUpRight size={18} /></div>
                     <div className={styles.updateContent}>Nitrogen updated: {record.nitrogen} mg/kg</div>
                     <div className={`${styles.updateTag} ${styles.growth}`}>Growth</div>
                     <div className={styles.updateDate}>{formatDate(record.timestamp)}</div>
                   </div>
                 );
              } else if (index === 1) {
                 return (
                   <div className={styles.updateItem} key={record.entryId || index}>
                     <div className={styles.updateIcon}><Droplets size={18} /></div>
                     <div className={styles.updateContent}>Pump check: {((300 - (record.distance || 300)) < 60) ? 'Low Warn' : 'Optimal'}</div>
                     <div className={`${styles.updateTag} ${styles.watering}`}>Watering</div>
                     <div className={styles.updateDate}>{formatDate(record.timestamp)}</div>
                   </div>
                 );
              } else {
                 return (
                   <div className={styles.updateItem} key={record.entryId || index}>
                     <div className={styles.updateIcon}><Sun size={18} /></div>
                     <div className={styles.updateContent}>{(record.temperature || 0) > 30 ? 'Excess Heat Recorded' : 'Temp Baseline Set'}</div>
                     <div className={`${styles.updateTag} ${styles.light}`}>Light</div>
                     <div className={styles.updateDate}>{formatDate(record.timestamp)}</div>
                   </div>
                 );
              }
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
