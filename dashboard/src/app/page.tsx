'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './portal.module.css';

export default function PortalSelection() {
  const router = useRouter();

  return (
    <div className={styles.portalPage}>
      {/* Background animated gradient */}
      <div className={styles.bgGlow} />

      <div className={styles.portalHeader}>
        <div className={styles.logoMark}>
          <span className={styles.logoIcon}>🌾</span>
        </div>
        <h1 className={styles.brandTitle}>
          JAFFNA <span className={styles.brandHighlight}>AGRI-SENSE</span>
        </h1>
        <p className={styles.brandSub}>Smart Precision Farming Platform</p>
      </div>

      <div className={styles.cardsRow}>
        {/* Farmer Card */}
        <button className={styles.portalCard} onClick={() => router.push('/farmer')}>
          <div className={styles.cardIconWrap} style={{ background: 'linear-gradient(135deg, #FF8C00, #FF6600)' }}>
            <span className={styles.cardEmoji}>👨‍🌾</span>
          </div>
          <h2 className={styles.cardTitle}>Farmer Portal</h2>
          <p className={styles.cardDesc}>
            Simple voice-driven view for farmers. Large text, easy actions, full voice support.
          </p>
          <div className={styles.cardBadge} style={{ background: '#FF6600' }}>
            🎤 Voice Enabled
          </div>
          <div className={styles.cardLang}>
            <span>🇱🇰 தமிழ் / English</span>
          </div>
        </button>

        {/* Executive Card */}
        <button className={styles.portalCard} onClick={() => router.push('/executive')}>
          <div className={styles.cardIconWrap} style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
            <span className={styles.cardEmoji}>📊</span>
          </div>
          <h2 className={styles.cardTitle}>Executive Portal</h2>
          <p className={styles.cardDesc}>
            Full analytics dashboard with charts, ML predictions, and detailed telemetry.
          </p>
          <div className={styles.cardBadge} style={{ background: '#6366F1' }}>
            📈 Advanced Analytics
          </div>
          <div className={styles.cardLang}>
            <span>English</span>
          </div>
        </button>
      </div>

      <p className={styles.footerText}>© 2026 AgriSense — SLIIT Research Project</p>
    </div>
  );
}
