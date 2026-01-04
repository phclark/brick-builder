export type BrickCategory = 'basic' | 'slopes' | 'special';

export interface Brick {
  id: string;
  name: string;
  category: BrickCategory;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  color: string;
  description: string;
}

export const BRICK_CATEGORIES: { id: BrickCategory; label: string }[] = [
  { id: 'basic', label: 'Basic Bricks' },
  { id: 'slopes', label: 'Slopes' },
  { id: 'special', label: 'Special' },
];
