'use client';

import { AppProvider } from '@/lib/store';
import TopNav from '@/components/TopNav';
import SpatialCanvas from '@/components/SpatialCanvas';
import SpaceRouter from '@/components/SpaceRouter';
import { useKeyboardShortcuts } from '@/components/useKeyboardShortcuts';
import SearchOverlay from '@/components/SearchOverlay';
import DetailOverlay from '@/components/DetailOverlay';

function MainApp() {
  useKeyboardShortcuts();
  
  return (
    <main className="relative w-full h-screen overflow-hidden bg-space-navy flex flex-col selection:bg-primary-blue/30">
      <SpatialCanvas />
      <SearchOverlay />
      <DetailOverlay />
      
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <TopNav />
        
        <div className="flex-1 relative w-full h-full pointer-events-auto">
          <SpaceRouter />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
