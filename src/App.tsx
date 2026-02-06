// ============================================================
// App — root component.  Renders the 3D Scene and the 2D HUD
// overlay (crosshair + hotbar + controls hint).
//
// OPTIMIZATIONS:
//   - HUD only re-renders when activeBlockType changes (isolated
//     Zustand selector).
//   - Crosshair is a pure CSS element (zero JS overhead).
//   - Toolbar button styles are pre-computed via blockColors.
// ============================================================

import { memo, useCallback } from 'react';
import { Scene } from './components/Scene';
import { MobileControls } from './components/MobileControls';
import { useStore } from './store/useStore';
import { blockColors } from './textures';
import { BLOCK_TYPES } from './types';
import type { BlockType } from './types';
import './index.css';

// ---- HUD component (memoized) --------------------------------

const HUD = memo(function HUD() {
  const activeBlockType    = useStore((s) => s.activeBlockType);
  const setActiveBlockType = useStore((s) => s.setActiveBlockType);

  const handleSlotClick = useCallback(
    (type: BlockType) => setActiveBlockType(type),
    [setActiveBlockType],
  );

  return (
    <div className="hud">
      {/* Crosshair */}
      <div className="crosshair" />

      {/* Hotbar */}
      <div className="toolbar">
        {BLOCK_TYPES.map((type: BlockType, i: number) => (
          <button
            key={type}
            className={`toolbar-slot${activeBlockType === type ? ' active' : ''}`}
            onClick={() => handleSlotClick(type)}
          >
            <div
              className="toolbar-block"
              style={{ backgroundColor: blockColors[type] }}
            />
            <span className="toolbar-key">{i + 1}</span>
            <span className="toolbar-label">{type}</span>
          </button>
        ))}
      </div>

      {/* Controls hint */}
      <div className="controls-hint">
        <p><b>Click</b> to lock pointer &nbsp;|&nbsp; <b>WASD</b> Move &nbsp;|&nbsp; <b>Space</b> Jump &nbsp;|&nbsp; <b>Shift</b> Sneak</p>
        <p><b>Left-click</b> Place block &nbsp;|&nbsp; <b>Right-click</b> Break block &nbsp;|&nbsp; <b>1–5</b> Select type</p>
      </div>
    </div>
  );
});

// ---- App -----------------------------------------------------

export default function App() {
  return (
    <div className="game-container">
      <Scene />
      <HUD />
      <MobileControls />
    </div>
  );
}
