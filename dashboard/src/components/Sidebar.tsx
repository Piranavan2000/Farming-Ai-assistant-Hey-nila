'use client';

import React from 'react';
import styles from './Sidebar.module.css';
import { 
  HeartPulse, 
  LayoutDashboard, 
  Map, 
  LineChart, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut,
  BrainCircuit,
  Waves,
  Sun
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Analytics', icon: LineChart, href: '/analytics' },
    { name: 'ML Analysis', icon: BrainCircuit, href: '/ml-analysis' },
    { name: 'Water Monitor', icon: Waves, href: '/tank-monitor' },
    { name: 'Sunlight Map', icon: Sun, href: '/heatmap' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <HeartPulse size={28} color="var(--primary-green)" strokeWidth={2.5}/>
        <span>AgriSense</span>
      </div>

      <div className={styles.navSection}>
        <div className={styles.sectionTitle}>Menu</div>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <Link href={item.href} key={item.name} className={styles.linkReset}>
              <li className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}>
                <item.icon className={styles.icon} />
                {item.name}
              </li>
            </Link>
          ))}
        </ul>
      </div>

      <div className={styles.navSection}>
        <div className={styles.sectionTitle}>General</div>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Settings className={styles.icon} />
            Settings
          </li>
          <li className={styles.navItem}>
            <HelpCircle className={styles.icon} />
            Help
          </li>
          <li className={styles.navItem}>
            <LogOut className={styles.icon} />
            Logout
          </li>
        </ul>
      </div>

      <div className={styles.appPromo}>
        <div className={styles.promoTitle}>Download our Mobile App</div>
        <div className={styles.promoSub}>Get connected on the field</div>
      </div>
    </aside>
  );
}
