'use client';

import { useState } from 'react';
import { Brick } from '@/types/brick';

interface BrickThumbnailProps {
  brick: Brick;
  onClick?: () => void;
  onDragStart?: (brick: Brick, event: React.MouseEvent | React.TouchEvent) => void;
}

export default function BrickThumbnail({ brick, onClick, onDragStart }: BrickThumbnailProps) {
  const { dimensions, color, name } = brick;
  const [isPressed, setIsPressed] = useState(false);

  // Calculate aspect ratio for visual representation
  const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth);
  const scale = 40 / maxDim;
  
  const width = dimensions.width * scale;
  const height = dimensions.height * scale;
  const depth = dimensions.depth * scale;

  // Create isometric-like view
  const visualWidth = width + depth * 0.5;
  const visualHeight = height + depth * 0.3;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(true);
    if (onDragStart) {
      onDragStart(brick, e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    if (onDragStart) {
      onDragStart(brick, e);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={handleMouseUp}
      className={`
        group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 
        bg-white transition-all duration-200 w-full
        ${isPressed 
          ? 'border-orange-500 shadow-xl scale-95 bg-orange-50' 
          : 'border-slate-200 hover:border-orange-400 hover:shadow-lg'
        }
        cursor-grab active:cursor-grabbing
      `}
      title={brick.description}
    >
      {/* Brick visual representation */}
      <div className="relative flex items-center justify-center w-full h-20">
        {/* Main brick face */}
        <div
          className={`
            rounded-sm shadow-md transition-all duration-200 
            ${isPressed ? 'scale-95 opacity-80' : 'group-hover:scale-110'}
          `}
          style={{
            width: `${visualWidth}px`,
            height: `${visualHeight}px`,
            backgroundColor: color,
            border: '1px solid rgba(0,0,0,0.2)',
          }}
        >
          {/* Add studs for visual detail */}
          <div className="absolute inset-0 flex items-start justify-center pt-1 gap-0.5">
            {Array.from({ length: Math.min(dimensions.width, 4) }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/30"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
              />
            ))}
          </div>
        </div>

        {/* Side face for 3D effect */}
        <div
          className={`
            absolute rounded-sm opacity-60 transition-all duration-200
            ${isPressed ? 'scale-95 opacity-40' : ''}
          `}
          style={{
            width: `${depth * 0.5}px`,
            height: `${visualHeight}px`,
            backgroundColor: color,
            filter: 'brightness(0.7)',
            transform: `translateX(${visualWidth / 2}px) skewY(-30deg) ${isPressed ? 'scale(0.95)' : ''}`,
            transformOrigin: 'left',
            border: '1px solid rgba(0,0,0,0.2)',
          }}
        />

        {/* Top face for 3D effect */}
        <div
          className={`
            absolute rounded-sm opacity-80 transition-all duration-200
            ${isPressed ? 'scale-95 opacity-50' : ''}
          `}
          style={{
            width: `${visualWidth}px`,
            height: `${depth * 0.3}px`,
            backgroundColor: color,
            filter: 'brightness(1.2)',
            transform: `translateY(-${visualHeight / 2}px) skewX(-30deg) ${isPressed ? 'scale(0.95)' : ''}`,
            transformOrigin: 'bottom',
            border: '1px solid rgba(0,0,0,0.2)',
          }}
        />

        {/* Drag indicator overlay */}
        {isPressed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-orange-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg animate-pulse">
              Dragging...
            </div>
          </div>
        )}
      </div>

      {/* Brick name */}
      <div className={`
        text-xs font-medium text-center leading-tight transition-colors duration-200
        ${isPressed ? 'text-orange-600' : 'text-slate-700'}
      `}>
        {name}
      </div>

      {/* Dimensions badge */}
      <div className={`
        text-[10px] font-mono px-2 py-0.5 rounded transition-colors duration-200
        ${isPressed ? 'text-orange-600 bg-orange-100' : 'text-slate-500 bg-slate-100'}
      `}>
        {dimensions.width}×{dimensions.height}×{dimensions.depth}
      </div>

      {/* Hover indicator */}
      <div className={`
        absolute inset-0 rounded-lg transition-colors duration-200 pointer-events-none
        ${isPressed ? 'bg-orange-500/10' : 'bg-orange-500/0 group-hover:bg-orange-500/5'}
      `} />
    </button>
  );
}
