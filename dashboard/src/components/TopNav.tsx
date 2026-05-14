'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileScan, Search, Bell } from 'lucide-react';
import styles from './TopNav.module.css';

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.navWrapper}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <FileScan className={styles.logoIcon} strokeWidth={2.5} size={28} />
          <span>agrisense</span>
        </div>
      </div>

      <div className={styles.centerSection}>
        <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}>
          Live Data
        </Link>
        <Link href="/analytics" className={`${styles.navLink} ${pathname === '/analytics' ? styles.active : ''}`}>
          Analytics
        </Link>
        <Link href="/ml-analysis" className={`${styles.navLink} ${pathname === '/ml-analysis' ? styles.active : ''}`}>
          ML Analysis
        </Link>
        <Link href="/diagnostics" className={`${styles.navLink} ${pathname === '/diagnostics' ? styles.active : ''}`}>
          Diagnostics
        </Link>
        <Link href="/tank-monitor" className={`${styles.navLink} ${pathname === '/tank-monitor' ? styles.active : ''}`}>
          Water Level
        </Link>
        <Link href="/heatmap" className={`${styles.navLink} ${pathname === '/heatmap' ? styles.active : ''}`}>
          Heatmap
        </Link>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.searchBar}>
          <Search size={18} color="var(--text-light)" />
          <input type="text" placeholder="Search" suppressHydrationWarning />
        </div>
        <button className={styles.upgradeBtn} suppressHydrationWarning>Upgrade</button>
        <button className={styles.iconBtn} suppressHydrationWarning>
          <Bell size={20} />
        </button>
        <div className={styles.avatar}>A</div>
      </div>
    </nav>
  );
}
