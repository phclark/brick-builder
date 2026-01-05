export interface DragState {
  isDragging: boolean;
  brickId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface PlacedBrick {
  id: string;
  brickId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: number;
}
