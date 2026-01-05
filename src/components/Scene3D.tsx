'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Brick } from '@/types/brick';
import { PlacedBrick } from '@/types/drag';
import { createBrickMesh, snapToGrid, findStackingHeight, getBricksBelow, getBrickById } from '@/utils/brickHelpers';

interface Scene3DProps {
  className?: string;
}

export interface Scene3DHandle {
  startDrag: (brick: Brick, clientX: number, clientY: number) => void;
  updateDrag: (clientX: number, clientY: number) => void;
  endDrag: () => void;
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(({ className = '' }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const ghostBrickRef = useRef<THREE.Group | null>(null);
  const dropIndicatorRef = useRef<THREE.Mesh | null>(null);
  const placedBricksRef = useRef<Map<string, THREE.Group>>(new Map());
  const selectionOutlineRef = useRef<THREE.LineSegments | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  
  const [fps, setFps] = useState<number>(60);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBrick, setDraggedBrick] = useState<Brick | null>(null);
  const [placedBricks, setPlacedBricks] = useState<PlacedBrick[]>([]);
  const [selectedBrickId, setSelectedBrickId] = useState<string | null>(null);
  const [isMovingBrick, setIsMovingBrick] = useState(false);
  const [stackingOn, setStackingOn] = useState<number>(0);
  
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  // Helper function to create selection outline
  const createSelectionOutline = useCallback((group: THREE.Group): THREE.LineSegments => {
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1)
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xf97316, // Orange highlight
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
    });
    const outline = new THREE.LineSegments(geometry, material);
    outline.position.copy(center);
    
    return outline;
  }, []);

  // Update selection outline
  const updateSelectionOutline = useCallback(() => {
    if (selectionOutlineRef.current && sceneRef.current) {
      sceneRef.current.remove(selectionOutlineRef.current);
      selectionOutlineRef.current.geometry.dispose();
      (selectionOutlineRef.current.material as THREE.Material).dispose();
      selectionOutlineRef.current = null;
    }

    if (selectedBrickId && sceneRef.current) {
      const brickGroup = placedBricksRef.current.get(selectedBrickId);
      if (brickGroup) {
        const outline = createSelectionOutline(brickGroup);
        sceneRef.current.add(outline);
        selectionOutlineRef.current = outline;
      }
    }
  }, [selectedBrickId, createSelectionOutline]);

  // Handle mousedown on brick (for starting drag on selected bricks)
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || isDragging || isMovingBrick) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
  }, [isDragging, isMovingBrick]);

  // Handle brick selection or drag initiation via click
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || isDragging || isMovingBrick) return;
    if (!mouseDownPosRef.current) return;

    // Check if this was a click (not a drag)
    const dx = Math.abs(event.clientX - mouseDownPosRef.current.x);
    const dy = Math.abs(event.clientY - mouseDownPosRef.current.y);
    
    if (dx > 5 || dy > 5) {
      // This was a drag for camera, not a click
      mouseDownPosRef.current = null;
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    
    // Check intersections with placed bricks
    const brickMeshes: THREE.Object3D[] = [];
    placedBricksRef.current.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          brickMeshes.push(child);
        }
      });
    });

    const intersects = raycasterRef.current.intersectObjects(brickMeshes, false);
    
    if (intersects.length > 0) {
      // Find which brick was clicked
      const clickedMesh = intersects[0].object;
      for (const [brickId, group] of placedBricksRef.current.entries()) {
        let found = false;
        group.traverse((child) => {
          if (child === clickedMesh) {
            found = true;
          }
        });
        if (found) {
          // If clicking the already selected brick with shift, start moving it
          if (brickId === selectedBrickId && event.shiftKey) {
            startMovingBrick();
          } else {
            setSelectedBrickId(brickId);
            setPlacedBricks(prev => prev.map(b => ({
              ...b,
              isSelected: b.id === brickId
            })));
          }
          mouseDownPosRef.current = null;
          return;
        }
      }
    } else {
      // Clicked on empty space, deselect
      setSelectedBrickId(null);
      setPlacedBricks(prev => prev.map(b => ({ ...b, isSelected: false })));
    }
    
    mouseDownPosRef.current = null;
  }, [isDragging, isMovingBrick, selectedBrickId]);

  // Handle keyboard events for rotation and deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedBrickId) return;

      // Delete key removes selected brick
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const brickGroup = placedBricksRef.current.get(selectedBrickId);
        if (brickGroup && sceneRef.current) {
          sceneRef.current.remove(brickGroup);
          placedBricksRef.current.delete(selectedBrickId);
          setPlacedBricks(prev => prev.filter(b => b.id !== selectedBrickId));
          setSelectedBrickId(null);
        }
        return;
      }

      // R key rotates brick 90 degrees
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        const brickGroup = placedBricksRef.current.get(selectedBrickId);
        if (brickGroup) {
          brickGroup.rotation.y += Math.PI / 2;
          setPlacedBricks(prev => prev.map(b => 
            b.id === selectedBrickId 
              ? { ...b, rotation: (b.rotation + 90) % 360 }
              : b
          ));
        }
      }

      // M key or double-click moves brick
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        startMovingBrick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBrickId]);

  // Handle moving selected brick
  const startMovingBrick = useCallback(() => {
    if (!selectedBrickId) return;
    
    const placedBrick = placedBricks.find(b => b.id === selectedBrickId);
    const brick = placedBrick ? getBrickById(placedBrick.brickId) : null;
    
    if (!brick || !placedBrick) return;

    setIsMovingBrick(true);
    setDraggedBrick(brick);
    
    // Remove the brick temporarily
    const brickGroup = placedBricksRef.current.get(selectedBrickId);
    if (brickGroup && sceneRef.current) {
      sceneRef.current.remove(brickGroup);
    }
    
    // Disable orbit controls
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
    
    // Create ghost brick
    const ghostBrick = createBrickMesh(brick, true);
    ghostBrick.position.set(
      placedBrick.position.x,
      placedBrick.position.y,
      placedBrick.position.z
    );
    ghostBrick.rotation.y = (placedBrick.rotation * Math.PI) / 180;
    
    if (sceneRef.current) {
      sceneRef.current.add(ghostBrick);
      ghostBrickRef.current = ghostBrick;
    }
  }, [selectedBrickId, placedBricks]);

  const updateGhostBrickPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !cameraRef.current || !ghostBrickRef.current || !draggedBrick) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeRef.current, intersectPoint);
    
    if (intersectPoint) {
      const snappedX = snapToGrid(intersectPoint.x, 1);
      const snappedZ = snapToGrid(intersectPoint.z, 1);
      
      // Filter out the currently moving brick when calculating stacking
      const otherBricks = isMovingBrick 
        ? placedBricks.filter(b => b.id !== selectedBrickId)
        : placedBricks;
      
      const stackingY = findStackingHeight(
        { x: snappedX, z: snappedZ },
        { width: draggedBrick.dimensions.width, depth: draggedBrick.dimensions.depth },
        otherBricks,
        draggedBrick.dimensions.height
      );
      
      const bricksBelow = getBricksBelow(
        { x: snappedX, z: snappedZ },
        { width: draggedBrick.dimensions.width, depth: draggedBrick.dimensions.depth },
        otherBricks
      );
      setStackingOn(bricksBelow.length);
      
      ghostBrickRef.current.position.set(snappedX, stackingY, snappedZ);
      
      if (dropIndicatorRef.current) {
        dropIndicatorRef.current.position.set(snappedX, 0.01, snappedZ);
        dropIndicatorRef.current.visible = true;
        
        const material = dropIndicatorRef.current.material as THREE.MeshBasicMaterial;
        if (bricksBelow.length > 0) {
          material.color.setHex(0x06b6d4);
        } else {
          material.color.setHex(0x10b981);
        }
      }
    }
  }, [draggedBrick, placedBricks, isMovingBrick, selectedBrickId]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startDrag: (brick: Brick, clientX: number, clientY: number) => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      setIsDragging(true);
      setDraggedBrick(brick);
      setStackingOn(0);
      setSelectedBrickId(null); // Deselect when dragging new brick
      
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      const ghostBrick = createBrickMesh(brick, true);
      ghostBrick.position.y = brick.dimensions.height / 2;
      
      ghostBrick.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissive = new THREE.Color(brick.color);
          material.emissiveIntensity = 0.3;
        }
      });
      
      sceneRef.current.add(ghostBrick);
      ghostBrickRef.current = ghostBrick;
      
      if (!dropIndicatorRef.current) {
        const indicatorGeometry = new THREE.RingGeometry(
          Math.max(brick.dimensions.width, brick.dimensions.depth) * 0.6,
          Math.max(brick.dimensions.width, brick.dimensions.depth) * 0.7,
          32
        );
        const indicatorMaterial = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        dropIndicatorRef.current = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        dropIndicatorRef.current.rotation.x = -Math.PI / 2;
        sceneRef.current.add(dropIndicatorRef.current);
      } else {
        const newGeometry = new THREE.RingGeometry(
          Math.max(brick.dimensions.width, brick.dimensions.depth) * 0.6,
          Math.max(brick.dimensions.width, brick.dimensions.depth) * 0.7,
          32
        );
        dropIndicatorRef.current.geometry.dispose();
        dropIndicatorRef.current.geometry = newGeometry;
        dropIndicatorRef.current.visible = true;
      }
      
      updateGhostBrickPosition(clientX, clientY);
    },
    
    updateDrag: (clientX: number, clientY: number) => {
      if (!isDragging && !isMovingBrick) return;
      if (!ghostBrickRef.current) return;
      updateGhostBrickPosition(clientX, clientY);
    },
    
    endDrag: () => {
      if ((!isDragging && !isMovingBrick) || !ghostBrickRef.current || !draggedBrick || !sceneRef.current) return;
      
      const position = {
        x: ghostBrickRef.current.position.x,
        y: ghostBrickRef.current.position.y,
        z: ghostBrickRef.current.position.z,
      };
      
      const rotation = ghostBrickRef.current.rotation.y;
      
      sceneRef.current.remove(ghostBrickRef.current);
      ghostBrickRef.current = null;
      
      if (dropIndicatorRef.current) {
        dropIndicatorRef.current.visible = false;
      }
      
      const permanentBrick = createBrickMesh(draggedBrick, false);
      permanentBrick.position.set(position.x, position.y, position.z);
      permanentBrick.rotation.y = rotation;
      sceneRef.current.add(permanentBrick);
      
      let placedBrickId: string;
      
      if (isMovingBrick && selectedBrickId) {
        // Update existing brick
        placedBrickId = selectedBrickId;
        placedBricksRef.current.set(placedBrickId, permanentBrick);
        
        setPlacedBricks(prev => prev.map(b => 
          b.id === placedBrickId
            ? { ...b, position, rotation: (rotation * 180) / Math.PI, isSelected: true }
            : b
        ));
      } else {
        // Create new brick
        placedBrickId = `brick-${Date.now()}-${Math.random()}`;
        placedBricksRef.current.set(placedBrickId, permanentBrick);
        
        const newPlacedBrick: PlacedBrick = {
          id: placedBrickId,
          brickId: draggedBrick.id,
          position,
          rotation: (rotation * 180) / Math.PI,
          isSelected: false,
        };
        
        setPlacedBricks(prev => [...prev, newPlacedBrick]);
      }
      
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      
      setIsDragging(false);
      setIsMovingBrick(false);
      setDraggedBrick(null);
      setStackingOn(0);
      
      if (isMovingBrick) {
        setSelectedBrickId(placedBrickId);
      }
    },
  }), [isDragging, isMovingBrick, draggedBrick, updateGhostBrickPosition, placedBricks, selectedBrickId]);

  // Update selection outline when selection changes
  useEffect(() => {
    updateSelectionOutline();
  }, [selectedBrickId, updateSelectionOutline]);

  // Attach mouse handlers to canvas
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.3);
    scene.add(hemisphereLight);

    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 40, 0xf97316, 0x94a3b8);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Floor plane
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Animation loop
    const animate = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // FPS calculation
      if (lastFrameTimeRef.current !== 0) {
        const delta = currentTime - lastFrameTimeRef.current;
        const currentFps = 1000 / delta;
        fpsFramesRef.current.push(currentFps);
        
        if (fpsFramesRef.current.length > 60) {
          fpsFramesRef.current.shift();
        }

        if (fpsFramesRef.current.length === 60) {
          const avgFps = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
          setFps(Math.round(avgFps));
          fpsFramesRef.current = [];
        }
      }
      lastFrameTimeRef.current = currentTime;

      // Animate ghost brick
      if (ghostBrickRef.current) {
        const pulse = Math.sin(currentTime * 0.003) * 0.1 + 0.9;
        ghostBrickRef.current.scale.set(pulse, pulse, pulse);
      }

      // Animate drop indicator
      if (dropIndicatorRef.current && dropIndicatorRef.current.visible) {
        dropIndicatorRef.current.rotation.z += 0.02;
      }

      // Animate selection outline
      if (selectionOutlineRef.current) {
        const pulse = Math.sin(currentTime * 0.005) * 0.2 + 0.8;
        const material = selectionOutlineRef.current.material as THREE.LineBasicMaterial;
        material.opacity = pulse;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container && rendererRef.current.domElement) {
          container.removeChild(rendererRef.current.domElement);
        }
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* FPS Counter */}
      <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-3 py-2 rounded-lg font-mono text-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">FPS:</span>
          <span className={`font-semibold ${fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fps}
          </span>
        </div>
      </div>

      {/* Drag Indicator */}
      {(isDragging || isMovingBrick) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-lg font-sans text-sm backdrop-blur-sm shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div className="flex flex-col">
              <span className="font-semibold">{isMovingBrick ? 'Moving' : 'Placing'}: {draggedBrick?.name}</span>
              {stackingOn > 0 && (
                <span className="text-xs text-orange-100">
                  Stacking on {stackingOn} brick{stackingOn !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedBrickId && !isDragging && !isMovingBrick && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-lg font-sans text-sm backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔸</span>
            <div className="flex flex-col">
              <span className="font-semibold">Brick Selected</span>
              <span className="text-xs text-orange-100">
                M to move • R to rotate • Delete to remove
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Info */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-4 py-3 rounded-lg font-sans text-sm backdrop-blur-sm max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-semibold">🖱️ Controls:</span>
          </div>
          <div className="text-slate-300 text-xs space-y-0.5">
            <div>• Click brick to select</div>
            <div>• M: Move selected brick</div>
            <div>• R: Rotate selected brick</div>
            <div>• Delete: Remove selected</div>
            <div>• Left Click + Drag: Orbit</div>
            <div>• Right Click + Drag: Pan</div>
            <div>• Scroll: Zoom</div>
          </div>
        </div>
      </div>

      {/* Placed Bricks Counter */}
      {placedBricks.length > 0 && (
        <div className="absolute top-20 left-4 bg-cyan-500/90 text-white px-3 py-2 rounded-lg font-mono text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/80">Bricks:</span>
            <span className="font-semibold">{placedBricks.length}</span>
          </div>
        </div>
      )}
    </div>
  );
});

Scene3D.displayName = 'Scene3D';

export default Scene3D;
