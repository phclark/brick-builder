'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Brick } from '@/types/brick';
import { PlacedBrick } from '@/types/drag';
import { createBrickMesh, snapToGrid } from '@/utils/brickHelpers';

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
  const placedBricksRef = useRef<Map<string, THREE.Group>>(new Map());
  
  const [fps, setFps] = useState<number>(60);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBrick, setDraggedBrick] = useState<Brick | null>(null);
  const [placedBricks, setPlacedBricks] = useState<PlacedBrick[]>([]);
  
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startDrag: (brick: Brick, clientX: number, clientY: number) => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      setIsDragging(true);
      setDraggedBrick(brick);
      
      // Disable orbit controls during drag
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      // Create ghost brick
      const ghostBrick = createBrickMesh(brick, true);
      ghostBrick.position.y = brick.dimensions.height / 2; // Position above ground
      sceneRef.current.add(ghostBrick);
      ghostBrickRef.current = ghostBrick;
      
      // Update initial position
      updateGhostBrickPosition(clientX, clientY);
    },
    
    updateDrag: (clientX: number, clientY: number) => {
      if (!isDragging || !ghostBrickRef.current) return;
      updateGhostBrickPosition(clientX, clientY);
    },
    
    endDrag: () => {
      if (!isDragging || !ghostBrickRef.current || !draggedBrick || !sceneRef.current) return;
      
      // Place the brick at the ghost position
      const position = {
        x: ghostBrickRef.current.position.x,
        y: ghostBrickRef.current.position.y,
        z: ghostBrickRef.current.position.z,
      };
      
      // Remove ghost brick
      sceneRef.current.remove(ghostBrickRef.current);
      ghostBrickRef.current = null;
      
      // Create permanent brick
      const permanentBrick = createBrickMesh(draggedBrick, false);
      permanentBrick.position.set(position.x, position.y, position.z);
      sceneRef.current.add(permanentBrick);
      
      // Store placed brick
      const placedBrickId = `brick-${Date.now()}-${Math.random()}`;
      placedBricksRef.current.set(placedBrickId, permanentBrick);
      
      const newPlacedBrick: PlacedBrick = {
        id: placedBrickId,
        brickId: draggedBrick.id,
        position,
        rotation: 0,
      };
      
      setPlacedBricks(prev => [...prev, newPlacedBrick]);
      
      // Re-enable orbit controls
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      
      setIsDragging(false);
      setDraggedBrick(null);
    },
  }));

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
      // Snap to grid
      intersectPoint.x = snapToGrid(intersectPoint.x, 1);
      intersectPoint.z = snapToGrid(intersectPoint.z, 1);
      intersectPoint.y = draggedBrick.dimensions.height / 2;
      
      ghostBrickRef.current.position.copy(intersectPoint);
    }
  }, [draggedBrick]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate-50 background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // Orbit Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movements
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera going below ground
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting setup
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional light for sun-like illumination with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    // Shadow camera optimization
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

    // Hemisphere light for sky/ground ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(
      0x87ceeb, // Sky color (light blue)
      0x8b7355, // Ground color (brown)
      0.3
    );
    scene.add(hemisphereLight);

    // Grid floor for spatial reference
    const gridHelper = new THREE.GridHelper(
      40, // Size
      40, // Divisions
      0xf97316, // Center line color (orange - primary color)
      0x94a3b8  // Grid color (slate-400)
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Floor plane to receive shadows
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Animation loop with FPS tracking
    const animate = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // FPS calculation
      if (lastFrameTimeRef.current !== 0) {
        const delta = currentTime - lastFrameTimeRef.current;
        const currentFps = 1000 / delta;
        fpsFramesRef.current.push(currentFps);
        
        // Keep last 60 frames for average
        if (fpsFramesRef.current.length > 60) {
          fpsFramesRef.current.shift();
        }

        // Update FPS display every 30 frames
        if (fpsFramesRef.current.length === 60) {
          const avgFps = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
          setFps(Math.round(avgFps));
          fpsFramesRef.current = [];
        }
      }
      lastFrameTimeRef.current = currentTime;

      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

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
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
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
      {isDragging && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-lg font-sans text-sm backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2">
            <span className="font-semibold">🎯 Placing: {draggedBrick?.name}</span>
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
            <div>• Drag brick from palette</div>
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
