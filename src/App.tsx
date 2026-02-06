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

      {/* GitHub link */}
      <a
        href="https://github.com/StarKnightt/MineCraft"
        target="_blank"
        rel="noopener noreferrer"
        className="github-link"
        title="View on GitHub"
      >
        <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
    </div>
  );
});

// ---- App -----------------------------------------------------

// ---- Rotate screen prompt (portrait mobile only) ------------

function RotatePrompt() {
  return (
    <div className="rotate-prompt">
      <div className="rotate-phone">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
        </svg>
      </div>
      <p className="rotate-text">Rotate your device to landscape</p>
      <p className="rotate-sub">for the best experience</p>
    </div>
  );
}

// ---- App -----------------------------------------------------

export default function App() {
  return (
    <div className="game-container">
      <Scene />
      <HUD />
      <MobileControls />
      <RotatePrompt />
    </div>
  );
}
