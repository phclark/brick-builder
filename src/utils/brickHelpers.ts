import * as THREE from 'three';
import { Brick } from '@/types/brick';
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
