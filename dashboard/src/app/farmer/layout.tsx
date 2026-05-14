import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'AgriSense — Farmer Portal',
  description: 'Simple voice-driven farm insights for farmers',
};

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'url(/hero_bg.webp) center/cover no-repeat',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0'
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 0
      }} />
      
      <div style={{
        width: '100%',
        maxWidth: '450px',
        height: '100vh',
        maxHeight: '850px',
        backgroundColor: '#0d0d12',
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        /* Desktop styling for the phone frame */
        border: 'none',
        borderRadius: '0',
      }}
      className="mobile-frame"
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 480px) {
            .mobile-frame {
              border-radius: 40px !important;
              border: 8px solid #1a1a24 !important;
              height: 90vh !important;
            }
          }
          .mobile-frame::-webkit-scrollbar {
            display: none;
          }
          .mobile-frame {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
        {children}
      </div>
    </div>
  );
}
