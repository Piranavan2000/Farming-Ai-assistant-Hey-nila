'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import VoiceAssistant from './VoiceAssistant';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide global TopNav & VoiceAssistant on the root portal selector and the farmer portal
  const isPortalSelector = pathname === '/';
  const isFarmerPortal = pathname?.startsWith('/farmer');

  if (isPortalSelector || isFarmerPortal) {
    return <>{children}</>;
  }

  // Restore the original global layout for all other pages (tank-monitor, analytics, executive, etc.)
  return (
    <div id="glass-app-wrapper">
      <TopNav />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
      <VoiceAssistant />
    </div>
  );
}
