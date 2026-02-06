// ============================================================
// Ground — invisible click plane for placing blocks on empty
// space.  Uses getState() instead of subscribing to blocks,
// so it never re-renders when blocks change.
//
// Wrapped in memo — this component has zero props and no store
// subscriptions that change, so it renders exactly once.
// ============================================================

import { memo, useCallback } from 'react';
import { useStore, posKey } from '../store/useStore';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '../types';

export const Ground = memo(function Ground() {
  const addBlock = useStore((s) => s.addBlock);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!e.point) return;

    const pos: Vec3 = [
      Math.round(e.point.x),
      Math.floor(e.point.y) + 1,
      Math.round(e.point.z),
    ];

    const blocks = useStore.getState().blocks;
    if (blocks[posKey(pos[0], pos[1], pos[2])] === undefined) {
      addBlock(pos);
    }
  }, [addBlock]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -4, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial visible={false} />
    </mesh>
  );
});
