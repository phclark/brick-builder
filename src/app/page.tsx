'use client';

import { useState } from 'react';
import Scene3D from "@/components/Scene3D";
import BrickPalette from "@/components/BrickPalette";
import { Menu, X } from 'lucide-react';

export default function Home() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [selectedBrickId, setSelectedBrickId] = useState<string | null>(null);

  const handleBrickSelect = (brickId: string) => {
    setSelectedBrickId(brickId);
    console.log('Selected brick:', brickId);
    // TODO: Add brick to 3D scene
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 relative">
      {/* 3D Scene */}
      <Scene3D className="w-full h-full" />
      
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-heading">
              BrickBuilder <span className="text-orange-500">3D</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-600 font-body mt-1">
              Creative Building Workspace
            </p>
          </div>
          
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="lg:hidden pointer-events-auto p-2 rounded-lg bg-white shadow-lg hover:bg-slate-50 transition-colors border border-slate-200"
            aria-label={isPaletteOpen ? 'Close brick palette' : 'Open brick palette'}
          >
            {isPaletteOpen ? (
              <X className="w-6 h-6 text-slate-700" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Brick Palette - Side Panel */}
      <div
        className={`
          absolute top-0 right-0 h-full pointer-events-auto z-20
          transition-transform duration-300 ease-in-out
          w-full sm:w-96 md:w-80 lg:w-96
          ${isPaletteOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <BrickPalette
          className="h-full"
          onBrickSelect={handleBrickSelect}
        />
      </div>

      {/* Mobile Overlay Backdrop */}
      {isPaletteOpen && (
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 lg:hidden"
          onClick={() => setIsPaletteOpen(false)}
        />
      )}

      {/* Selected Brick Indicator (for testing) */}
      {selectedBrickId && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200 pointer-events-none z-10">
          <p className="text-xs text-slate-600">Selected:</p>
          <p className="text-sm font-semibold text-slate-900">{selectedBrickId}</p>
        </div>
      )}
    </div>
  );
}
