'use client';

import { Brick } from '@/types/brick';

interface BrickThumbnailProps {
  brick: Brick;
  onClick?: () => void;
  onDragStart?: (brick: Brick, event: React.MouseEvent | React.TouchEvent) => void;
}

export default function BrickThumbnail({ brick, onClick, onDragStart }: BrickThumbnailProps) {
  const { dimensions, color, name } = brick;

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
    if (onDragStart) {
      onDragStart(brick, e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (onDragStart) {
      onDragStart(brick, e);
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-slate-200 bg-white hover:border-orange-400 hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing w-full"
      title={brick.description}
    >
      {/* Brick visual representation */}
      <div className="relative flex items-center justify-center w-full h-20">
        {/* Main brick face */}
        <div
          className="rounded-sm shadow-md transition-transform duration-200 group-hover:scale-110"
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
          className="absolute rounded-sm opacity-60"
          style={{
            width: `${depth * 0.5}px`,
            height: `${visualHeight}px`,
            backgroundColor: color,
            filter: 'brightness(0.7)',
            transform: `translateX(${visualWidth / 2}px) skewY(-30deg)`,
            transformOrigin: 'left',
            border: '1px solid rgba(0,0,0,0.2)',
          }}
        />

        {/* Top face for 3D effect */}
        <div
          className="absolute rounded-sm opacity-80"
          style={{
            width: `${visualWidth}px`,
            height: `${depth * 0.3}px`,
            backgroundColor: color,
            filter: 'brightness(1.2)',
            transform: `translateY(-${visualHeight / 2}px) skewX(-30deg)`,
            transformOrigin: 'bottom',
            border: '1px solid rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* Brick name */}
      <div className="text-xs font-medium text-slate-700 text-center leading-tight">
        {name}
      </div>

      {/* Dimensions badge */}
      <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
        {dimensions.width}×{dimensions.height}×{dimensions.depth}
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-lg bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-200 pointer-events-none" />
    </button>
  );
}
