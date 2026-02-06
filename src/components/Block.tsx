// ============================================================
// Cubes — renders ALL blocks using InstancedMesh.
//
// OPTIMIZATIONS:
//   1. Subscribes to blockVersion (number) not blocks (object),
//      so Zustand's shallow check is a simple === comparison.
//   2. groupByType reads blocks once from getState() — no React
//      subscription to the massive blocks object.
//   3. Shared BoxGeometry and Object3D (zero per-frame alloc).
//   4. Static instancedMesh args prevent remount.
//   5. React.memo on BlockTypeRenderer prevents re-renders when
//      its positions array hasn't changed (by reference).
// ============================================================

import { useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { useStore, keyToPos } from '../store/useStore';
import { blockMaterials } from '../textures';
import type { BlockType, PositionKey, Vec3 } from '../types';
import { BLOCK_TYPES } from '../types';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_INTERACT_DIST = 5;
const MAX_INSTANCES = 8192;

const sharedGeo = new THREE.BoxGeometry(1, 1, 1);
const _dummy = new THREE.Object3D();

// ---- group blocks by type -----------------------------------

function groupByType(blocks: Record<PositionKey, BlockType>): Record<BlockType, Vec3[]> {
  const groups: Record<BlockType, Vec3[]> = {
    grass: [], dirt: [], stone: [], wood: [], glass: [],
  };
  const keys = Object.keys(blocks);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i] as PositionKey;
    groups[blocks[key]].push(keyToPos(key));
  }
  return groups;
}

// ---- per-type instanced mesh (memoized) ---------------------

interface BlockTypeRendererProps {
  type: BlockType;
  positions: Vec3[];
  onPlace: (pos: Vec3, normal: Vec3) => void;
  onBreak: (pos: Vec3) => void;
}

const BlockTypeRenderer = memo(function BlockTypeRenderer(
  { type, positions, onPlace, onBreak }: BlockTypeRendererProps,
) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const mats = blockMaterials[type];

  // Keep positions in a ref so click handlers always see latest
  const posRef = useRef(positions);
  posRef.current = positions;

  // Update instance matrices when positions change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const count = positions.length;
    for (let i = 0; i < count; i++) {
      const p = positions[i];
      _dummy.position.set(p[0], p[1], p[2]);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId == null || e.distance > MAX_INTERACT_DIST) return;

    const pos = posRef.current[e.instanceId];
    if (!pos) return;

    const button = e.nativeEvent.button;

    if (button === 2) {
      onBreak(pos);
    } else if (button === 0 && e.face) {
      const n = e.face.normal;
      onPlace(pos, [Math.round(n.x), Math.round(n.y), Math.round(n.z)]);
    }
  }, [onPlace, onBreak]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[sharedGeo, undefined, MAX_INSTANCES]}
      material={mats}
      onPointerDown={handlePointerDown}
      castShadow
      receiveShadow
    />
  );
});

// ---- public component ---------------------------------------

export function Cubes() {
  // Subscribe to the cheap version counter, not the entire blocks object
  const blockVersion = useStore((s) => s.blockVersion);
  const addBlock     = useStore((s) => s.addBlock);
  const removeBlock  = useStore((s) => s.removeBlock);

  // Recompute groups only when blockVersion changes
  const groups = useMemo(() => {
    const blocks = useStore.getState().blocks;
    return groupByType(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockVersion]);

  const handlePlace = useCallback(
    (blockPos: Vec3, normal: Vec3) => {
      addBlock([
        blockPos[0] + normal[0],
        blockPos[1] + normal[1],
        blockPos[2] + normal[2],
      ]);
    },
    [addBlock],
  );

  const handleBreak = useCallback(
    (pos: Vec3) => removeBlock(pos),
    [removeBlock],
  );

  return (
    <>
      {BLOCK_TYPES.map((type) => (
        <BlockTypeRenderer
          key={type}
          type={type}
          positions={groups[type]}
          onPlace={handlePlace}
          onBreak={handleBreak}
        />
      ))}
    </>
  );
}
