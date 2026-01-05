import * as THREE from 'three';
import { Brick } from '@/types/brick';
import { PlacedBrick } from '@/types/drag';
import { BRICKS } from '@/data/bricks';

export function createBrickMesh(brick: Brick, isGhost: boolean = false): THREE.Group {
  const group = new THREE.Group();
  
  const { width, height, depth } = brick.dimensions;
  
  // Create main brick body
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: brick.color,
    metalness: 0.2,
    roughness: 0.8,
    transparent: isGhost,
    opacity: isGhost ? 0.6 : 1.0,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !isGhost;
  mesh.receiveShadow = !isGhost;
  group.add(mesh);
  
  // Add studs on top
  const studRadius = 0.15;
  const studHeight = 0.1;
  const studGeometry = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 16);
  const studMaterial = new THREE.MeshStandardMaterial({
    color: brick.color,
    metalness: 0.2,
    roughness: 0.7,
    transparent: isGhost,
    opacity: isGhost ? 0.6 : 1.0,
  });
  
  // Calculate stud positions
  const studSpacing = 1; // Standard brick unit spacing
  const studsX = Math.floor(width);
  const studsZ = Math.floor(depth);
  
  for (let x = 0; x < studsX; x++) {
    for (let z = 0; z < studsZ; z++) {
      const stud = new THREE.Mesh(studGeometry, studMaterial);
      const offsetX = (x - (studsX - 1) / 2) * studSpacing;
      const offsetZ = (z - (studsZ - 1) / 2) * studSpacing;
      stud.position.set(offsetX, height / 2 + studHeight / 2, offsetZ);
      stud.castShadow = !isGhost;
      stud.receiveShadow = !isGhost;
      group.add(stud);
    }
  }
  
  return group;
}

export function getBrickById(brickId: string): Brick | undefined {
  return BRICKS.find(brick => brick.id === brickId);
}

export function snapToGrid(value: number, gridSize: number = 1): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Check if two bricks overlap in the XZ plane (top-down view)
 */
export function checkBricksOverlap(
  pos1: { x: number; z: number },
  dims1: { width: number; depth: number },
  pos2: { x: number; z: number },
  dims2: { width: number; depth: number }
): boolean {
  const halfWidth1 = dims1.width / 2;
  const halfDepth1 = dims1.depth / 2;
  const halfWidth2 = dims2.width / 2;
  const halfDepth2 = dims2.depth / 2;

  const minX1 = pos1.x - halfWidth1;
  const maxX1 = pos1.x + halfWidth1;
  const minZ1 = pos1.z - halfDepth1;
  const maxZ1 = pos1.z + halfDepth1;

  const minX2 = pos2.x - halfWidth2;
  const maxX2 = pos2.x + halfWidth2;
  const minZ2 = pos2.z - halfDepth2;
  const maxZ2 = pos2.z + halfDepth2;

  // Check if rectangles overlap
  return !(maxX1 <= minX2 || minX1 >= maxX2 || maxZ1 <= minZ2 || minZ1 >= maxZ2);
}

/**
 * Find the highest brick that overlaps with the given position and dimensions
 * Returns the Y position where the new brick should be placed
 */
export function findStackingHeight(
  position: { x: number; z: number },
  dimensions: { width: number; depth: number },
  placedBricks: PlacedBrick[],
  newBrickHeight: number
): number {
  let maxHeight = 0;

  for (const placedBrick of placedBricks) {
    const brick = getBrickById(placedBrick.brickId);
    if (!brick) continue;

    // Check if bricks overlap in XZ plane
    const overlaps = checkBricksOverlap(
      { x: position.x, z: position.z },
      { width: dimensions.width, depth: dimensions.depth },
      { x: placedBrick.position.x, z: placedBrick.position.z },
      { width: brick.dimensions.width, depth: brick.dimensions.depth }
    );

    if (overlaps) {
      // Calculate the top of this brick
      const topY = placedBrick.position.y + brick.dimensions.height / 2;
      maxHeight = Math.max(maxHeight, topY);
    }
  }

  // Return the Y position for the center of the new brick
  // If maxHeight is 0, place on ground (newBrickHeight / 2)
  // Otherwise, place on top of the highest brick
  return maxHeight === 0 ? newBrickHeight / 2 : maxHeight + newBrickHeight / 2;
}

/**
 * Get all bricks that the new brick would stack on top of
 */
export function getBricksBelow(
  position: { x: number; z: number },
  dimensions: { width: number; depth: number },
  placedBricks: PlacedBrick[]
): PlacedBrick[] {
  const bricksBelow: PlacedBrick[] = [];

  for (const placedBrick of placedBricks) {
    const brick = getBrickById(placedBrick.brickId);
    if (!brick) continue;

    const overlaps = checkBricksOverlap(
      { x: position.x, z: position.z },
      { width: dimensions.width, depth: dimensions.depth },
      { x: placedBrick.position.x, z: placedBrick.position.z },
      { width: brick.dimensions.width, depth: brick.dimensions.depth }
    );

    if (overlaps) {
      bricksBelow.push(placedBrick);
    }
  }

  return bricksBelow;
}
