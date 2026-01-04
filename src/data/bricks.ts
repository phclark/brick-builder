import { Brick } from '@/types/brick';

export const BRICKS: Brick[] = [
  // 2x2 Bricks
  {
    id: 'basic-2x2-half',
    name: '2x2 Half-Height',
    category: 'basic',
    dimensions: { width: 2, height: 0.5, depth: 2 },
    color: '#f97316',
    description: 'Half-height 2x2 building brick',
  },
  {
    id: 'basic-2x2-full',
    name: '2x2 Full-Height',
    category: 'basic',
    dimensions: { width: 2, height: 1, depth: 2 },
    color: '#f97316',
    description: 'Full-height 2x2 building brick',
  },

  // 2x4 Bricks
  {
    id: 'basic-2x4-half',
    name: '2x4 Half-Height',
    category: 'basic',
    dimensions: { width: 2, height: 0.5, depth: 4 },
    color: '#06b6d4',
    description: 'Half-height 2x4 building brick',
  },
  {
    id: 'basic-2x4-full',
    name: '2x4 Full-Height',
    category: 'basic',
    dimensions: { width: 2, height: 1, depth: 4 },
    color: '#06b6d4',
    description: 'Full-height 2x4 building brick',
  },

  // 4x8 Bricks
  {
    id: 'basic-4x8-half',
    name: '4x8 Half-Height',
    category: 'basic',
    dimensions: { width: 4, height: 0.5, depth: 8 },
    color: '#3b82f6',
    description: 'Half-height 4x8 building brick',
  },
  {
    id: 'basic-4x8-full',
    name: '4x8 Full-Height',
    category: 'basic',
    dimensions: { width: 4, height: 1, depth: 8 },
    color: '#3b82f6',
    description: 'Full-height 4x8 building brick',
  },
];
