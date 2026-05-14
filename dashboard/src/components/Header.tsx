import React from 'react';
import styles from './Header.module.css';
import { Search, Mail, Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.searchBar}>
        <Search size={18} color="var(--text-light)" />
        <input 
          type="text" 
          placeholder="Search devices, sensors..." 
          className={styles.searchInput}
        />
        <div className={styles.cmdK}>⌘F</div>
      </div>

      <div className={styles.headerActions}>
        <button className={styles.iconBtn}>
          <Mail size={20} />
        </button>
        <button className={styles.iconBtn}>
          <Bell size={20} />
        </button>

        <div className={styles.profileSection}>
          <div className={styles.avatar}>AM</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Agri Manager</span>
            <span className={styles.profileRole}>admin@agrisense.io</span>
          </div>
        </div>
      </div>
    </header>
  );
}
