'use client';

import { useState, useRef, useCallback } from 'react';
import Scene3D, { Scene3DHandle } from "@/components/Scene3D";
import BrickPalette from "@/components/BrickPalette";
import { Brick } from '@/types/brick';
import { Menu, X } from 'lucide-react';

export default function Home() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const sceneRef = useRef<Scene3DHandle>(null);

  const handleBrickSelect = (brickId: string) => {
    console.log('Selected brick:', brickId);
  };

  const handleBrickDragStart = useCallback((brick: Brick, event: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    if (sceneRef.current) {
      sceneRef.current.startDrag(brick, clientX, clientY);
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging && sceneRef.current) {
      sceneRef.current.updateDrag(event.clientX, event.clientY);
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (isDragging && sceneRef.current && event.touches.length > 0) {
      event.preventDefault();
      sceneRef.current.updateDrag(event.touches[0].clientX, event.touches[0].clientY);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && sceneRef.current) {
      sceneRef.current.endDrag();
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && sceneRef.current) {
      sceneRef.current.endDrag();
      setIsDragging(false);
    }
  }, [isDragging]);

  return (
    <div 
      className="w-screen h-screen overflow-hidden bg-slate-50 relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Scene */}
      <Scene3D ref={sceneRef} className="w-full h-full" />
      
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
          onBrickDragStart={handleBrickDragStart}
        />
      </div>

      {/* Mobile Overlay Backdrop */}
      {isPaletteOpen && (
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 lg:hidden"
          onClick={() => setIsPaletteOpen(false)}
        />
      )}

      {/* Drag Cursor Overlay */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none z-30" style={{ cursor: 'grabbing' }} />
      )}
    </div>
  );
}
