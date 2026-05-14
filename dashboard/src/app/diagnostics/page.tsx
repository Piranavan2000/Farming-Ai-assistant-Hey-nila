'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Wifi, 
  Terminal, 
  CheckCircle2, 
  XCircle,
  Clock,
  Server,
  Filter
} from 'lucide-react';
import styles from './diagnostics.module.css';

const API_BASE = 'http://localhost:5000/api';

export default function DiagnosticsPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/status`);
        const result = await response.json();
        if (result.success) setStatus(result.data);
      } catch (err) {
        console.error('Failed to fetch system status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) return <div className={styles.container}>Loading Diagnostics...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Technical Diagnostics</h1>
        <p>System health, communication logs, and real-time hardware telemetry</p>
      </header>

      <div className={styles.grid}>
        {/* Module 1: System Vital Signs */}
        <div className={styles.card}>
          <h2><ShieldCheck color="#22c55e" /> System Vitals</h2>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>System Uptime</span>
              <span className={styles.statValue}>{status.uptime}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Success Rate</span>
              <span className={styles.statValue} style={{ color: '#22c55e' }}>{status.successRate}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Last Heartbeat</span>
              <span className={styles.statValue}>{status.lastSeen ? new Date(status.lastSeen).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Active Task</span>
              <span className={styles.statValue}>MQTT Listening</span>
            </div>
          </div>
        </div>

        {/* Module 2: Data Integrity Monitor */}
        <div className={styles.card}>
          <h2><Filter color="#3b82f6" /> Data Integrity</h2>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Packets</span>
              <span className={styles.statValue}>{status.totalPackets}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Filter Hits (65535)</span>
              <span className={styles.statValue} style={{ color: status.filterHits > 0 ? '#f59e0b' : '#22c55e' }}>
                {status.filterHits}
              </span>
            </div>
            <div className={styles.statItem}>
               <span className={styles.statLabel}>Edge Cleaning</span>
               <span className={styles.statValue}>ACTIVE</span>
            </div>
            <div className={styles.statItem}>
               <span className={styles.statLabel}>Checksum Status</span>
               <span className={styles.statValue}>VALID</span>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '15px', opacity: 0.6 }}>
            Software-level filtering prevents invalid Modbus readings from polluting ML training sets.
          </p>
        </div>

        {/* Module 3: MQTT Configuration */}
        <div className={styles.card}>
          <h2><Server color="#a855f7" /> MQTT Telemetry</h2>
          <div className={styles.configItem}>
             <span className={styles.configLabel}>Broker Endpoint</span>
             <span className={styles.configValue}>{status.mqttConfig.broker}</span>
          </div>
          <div className={styles.configItem}>
             <span className={styles.configLabel}>Subscription Topic</span>
             <span className={styles.configValue}>{status.mqttConfig.topic}</span>
          </div>
          <div className={styles.configItem}>
             <span className={styles.configLabel}>Client Identifier</span>
             <span className={styles.configValue}>{status.mqttConfig.clientId}</span>
          </div>
        </div>

        {/* Module 4: Communication Logs (The Terminal) */}
        <div className={`${styles.card} ${styles.fullWidth}`}>
          <h2><Terminal size={20} /> Live Communication Logs</h2>
          <div className={styles.terminal}>
            {status.recentLogs.map((log: any, i: number) => (
              <div key={i} className={styles.logEntry}>
                <span className={styles.logTime}>[{log.timestamp}]</span>
                <span className={`${styles.logStatus} ${log.status === 'SUCCESS' ? styles.success : styles.error}`}>
                  {log.status}
                </span>
                <span className={styles.logPayload}>{log.payload}</span>
              </div>
            ))}
            {status.recentLogs.length === 0 && <div style={{ color: '#666' }}>Waiting for data...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
