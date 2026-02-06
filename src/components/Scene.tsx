// ============================================================
// Scene — R3F Canvas with sky, lighting, and all game objects.
//
// OPTIMIZATIONS:
//   - antialias: false (saves ~30% GPU fill on most devices)
//   - powerPreference: high-performance
//   - toneMapping: NoToneMapping (skip per-pixel tone map pass)
//   - Shadow map 1024 with tighter frustum
//   - Raycaster far limit prevents long-range intersection tests
//   - Performance monitor overlay in dev mode
// ============================================================

import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Player } from './Player';
import { Ground } from './Ground';
import { Cubes } from './Block';
import * as THREE from 'three';

// ---- Renderer tuning applied inside the Canvas --------------

function RendererTuner() {
  const { gl, raycaster } = useThree();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // Skip tone mapping (saves a per-pixel shader op)
    gl.toneMapping = THREE.NoToneMapping;

    // Limit raycaster reach so it doesn't test distant geometry
    raycaster.far = 8;

    // Disable unnecessary features
    gl.shadowMap.autoUpdate = true;
    gl.info.autoReset = true;
  }, [gl, raycaster]);

  return null;
}

// ---- Performance stats overlay (shows FPS + draw calls) -----

function PerfStats() {
  const { gl } = useThree();
  const divRef = useRef<HTMLDivElement | null>(null);
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    // Create overlay div once
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed; top: 8px; right: 8px; z-index: 100;
      padding: 4px 8px; border-radius: 4px;
      background: rgba(0,0,0,0.6); color: #0f0;
      font: 11px/1.4 'Courier New', monospace;
      pointer-events: none; user-select: none;
    `;
    document.body.appendChild(div);
    divRef.current = div;

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTime.current;
      const fps = Math.round((frames.current / elapsed) * 1000);
      frames.current = 0;
      lastTime.current = now;

      const info = gl.info.render;
      div.textContent =
        `${fps} fps | ${info.calls} draws | ${info.triangles} tris`;
    }, 500);

    return () => {
      clearInterval(interval);
      div.remove();
    };
  }, [gl]);

  // Increment frame count on every render
  useEffect(() => {
    const id = requestAnimationFrame(function tick() {
      frames.current++;
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}

// ---- Scene --------------------------------------------------

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 70, near: 0.1, far: 500, position: [0, 15, 0] }}
      onContextMenu={(e) => e.preventDefault()}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <RendererTuner />
      <PerfStats />

      {/* Sky */}
      <Sky sunPosition={[100, 60, 100]} turbidity={0.5} rayleigh={0.5} />

      {/* Fog */}
      <fog attach="fog" args={['#87ceeb', 60, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[50, 80, 50]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={10}
        shadow-camera-far={200}
      />

      {/* Game objects */}
      <Player />
      <Ground />
      <Cubes />
    </Canvas>
  );
}
