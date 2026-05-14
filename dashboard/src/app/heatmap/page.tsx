'use client';

import React, { useState, useEffect } from 'react';
import styles from './heatmap.module.css';
import { 
  ArrowLeft,
  Sun,
  MapPin
} from 'lucide-react';
import Link from 'next/link';

// Dummy zones structurally initialized
const INITIAL_ZONES = Array.from({ length: 12 }, (_, i) => ({
  id: `Sector-${i + 1}`,
  lux: 0 // Will initialize securely on client
}));

const getHeatColor = (lux: number) => {
  // initial render safeguard
  if (lux === 0) return 'rgba(0,0,0,0)';
  if (lux < 30000) return 'rgba(5, 150, 105, 0.5)';     // Dark Green (Shade/Clouds)
  if (lux < 60000) return 'rgba(234, 179, 8, 0.5)';     // Yellow (Moderate Sun)
  if (lux < 85000) return 'rgba(249, 115, 22, 0.5)';    // Orange (High Sun)
  return 'rgba(239, 68, 68, 0.5)';                      // Red (Intense Sun)
};

export default function HeatmapPage() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Client-side only initial random population
    setZones(prev => prev.map(z => ({ ...z, lux: 10000 + Math.random() * 90000 })));
    setMounted(true);

    // Simulate real-time fluctuating sunlight (clouds passing, etc.)
    const interval = setInterval(() => {
      setZones(prevZones => 
        prevZones.map(zone => {
          // Add or subtract up to 10,000 lux smoothly to simulate changing sunlight
          let newLux = zone.lux + ((Math.random() - 0.5) * 20000);
          if (newLux < 10000) newLux = 10000;
          if (newLux > 110000) newLux = 110000;
          return { ...zone, lux: newLux };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const averageLux = zones.reduce((sum, z) => sum + z.lux, 0) / zones.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Monitor</span>
        </Link>
        <div className={styles.titleArea}>
           <div className={styles.iconCircle}><Sun size={32} /></div>
           <div>
              <h1 className={styles.title}>Sunlight Heatmap</h1>
              <p className={styles.subtitle}>Solar LDR analysis for optimal photosynthesis tracking.</p>
           </div>
        </div>
      </header>

      <div className={styles.mapSection}>
        {/* Map UI */}
        <div className={styles.mapPanel}>
          <div className={styles.mapLabel}>
            <span></span> Live: Thanangkilappu Paddy Fields, Jaffna
          </div>
          <div className={styles.heatmapGrid}>
            {zones.map((zone) => (
              <div 
                key={zone.id} 
                className={styles.zone}
                style={{ 
                  backgroundColor: getHeatColor(zone.lux),
                  boxShadow: `inset 0 0 30px ${getHeatColor(zone.lux)}`
                }}
              >
                <div className={styles.zoneInfo}>
                   {zone.id}: {Math.round(zone.lux).toLocaleString()} lx
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Sidebar Stats */}
        <div className={styles.statsPanel}>
          <div className={styles.statCard}>
            <h4>Field Average Lux</h4>
            <div className={styles.statValue}>
                {Math.round(averageLux).toLocaleString()} <span>lux</span>
            </div>
          </div>

          <div className={styles.statCard} style={{ flex: 1 }}>
             <h4>Location Data</h4>
             <div style={{display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px'}}>
               <MapPin size={16} /> 
               <span>9.6521° N, 80.0544° E</span>
             </div>
             <p style={{fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '16px'}}>
               Paddy fields in Thanangkilappu feature high direct sun exposure. LDR sensors actively simulate surface light intensity to track potential heat stress or optimal growing conditions.
             </p>
          </div>

          <div className={styles.legend}>
            <h4>Sensitivity Legend</h4>
            <div className={styles.legendScale}>
               <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background: 'rgba(239, 68, 68, 0.7)'}}></div>
                  <span>Intense Sun (&gt; 85k lux)</span>
               </div>
               <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background: 'rgba(249, 115, 22, 0.7)'}}></div>
                  <span>High Sun (60k - 85k lux)</span>
               </div>
               <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background: 'rgba(234, 179, 8, 0.7)'}}></div>
                  <span>Moderate Sun (30k - 60k lux)</span>
               </div>
               <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background: 'rgba(5, 150, 105, 0.7)'}}></div>
                  <span>Shade / Cloud (&lt; 30k lux)</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
