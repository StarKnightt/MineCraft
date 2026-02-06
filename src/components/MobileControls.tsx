// ============================================================
// MobileControls — virtual gamepad overlay for touch devices.
//
//  LEFT  side: joystick for WASD movement
//  RIGHT side: touch area for camera look (drag)
//  Buttons: Jump, Place, Break (overlaid on right side)
//  Hotbar: tappable block selector along the bottom
//
// Touch input is written directly into the shared KeyMap ref
// from useKeyboard (via the exported mobileKeys ref), so the
// Player's useFrame loop picks it up with zero extra wiring.
// Camera rotation is applied by dispatching into a shared ref.
// ============================================================

import { useRef, useCallback, useEffect, useState, memo } from 'react';
import type { KeyMap, BlockType } from '../types';
import { BLOCK_TYPES } from '../types';
import { useStore } from '../store/useStore';
import { blockColors } from '../textures';

// ---- shared refs for cross-component communication ----------

// Mobile keys — written by this component, read by Player
export const mobileKeys: KeyMap = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  jump: false,
  sneak: false,
};

// Mobile look delta — accumulated per frame, consumed by Player
export const mobileLook = { dx: 0, dy: 0 };

// Mobile action — 'place' | 'break' | null, consumed once per frame
export const mobileAction = { current: null as 'place' | 'break' | null };

// ---- detect touch device ------------------------------------

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ---- component ----------------------------------------------

export const MobileControls = memo(function MobileControls() {
  const [visible, setVisible] = useState(false);
  const activeBlockType = useStore((s) => s.activeBlockType);
  const setActiveBlockType = useStore((s) => s.setActiveBlockType);

  useEffect(() => {
    setVisible(isTouchDevice());
  }, []);

  // --- Joystick state ---
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  const JOYSTICK_RADIUS = 50;

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateJoystick(touch.clientX, touch.clientY);
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, []);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        mobileKeys.moveForward = false;
        mobileKeys.moveBackward = false;
        mobileKeys.moveLeft = false;
        mobileKeys.moveRight = false;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(-50%, -50%)';
        }
        break;
      }
    }
  }, []);

  function updateJoystick(tx: number, ty: number) {
    const cx = joystickCenter.current.x;
    const cy = joystickCenter.current.y;
    let dx = tx - cx;
    let dy = ty - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const threshold = 0.3;
    const nx = dx / JOYSTICK_RADIUS;
    const ny = dy / JOYSTICK_RADIUS;

    mobileKeys.moveForward = ny < -threshold;
    mobileKeys.moveBackward = ny > threshold;
    mobileKeys.moveLeft = nx < -threshold;
    mobileKeys.moveRight = nx > threshold;
  }

  // --- Look area state ---
  const lookTouchId = useRef<number | null>(null);
  const lookPrev = useRef({ x: 0, y: 0 });

  const handleLookStart = useCallback((e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lookPrev.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleLookMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lookPrev.current.x;
        const dy = touch.clientY - lookPrev.current.y;
        lookPrev.current = { x: touch.clientX, y: touch.clientY };
        mobileLook.dx += dx;
        mobileLook.dy += dy;
        break;
      }
    }
  }, []);

  const handleLookEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  }, []);

  // --- Jump button ---
  const handleJumpStart = useCallback(() => {
    mobileKeys.jump = true;
  }, []);

  const handleJumpEnd = useCallback(() => {
    mobileKeys.jump = false;
  }, []);

  if (!visible) return null;

  return (
    <div className="mobile-controls">
      {/* Left: Joystick */}
      <div
        className="joystick-area"
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div className="joystick-base">
          <div className="joystick-knob" ref={knobRef} />
        </div>
      </div>

      {/* Right: Look area */}
      <div
        className="look-area"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Action buttons */}
      <div className="mobile-actions">
        <button
          className="mobile-btn jump-btn"
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          onTouchCancel={handleJumpEnd}
        >
          Jump
        </button>
        <button
          className="mobile-btn place-btn"
          onTouchStart={() => { mobileAction.current = 'place'; }}
        >
          Place
        </button>
        <button
          className="mobile-btn break-btn"
          onTouchStart={() => { mobileAction.current = 'break'; }}
        >
          Break
        </button>
      </div>

      {/* Mobile hotbar */}
      <div className="mobile-hotbar">
        {BLOCK_TYPES.map((type: BlockType) => (
          <button
            key={type}
            className={`mobile-hotbar-slot${activeBlockType === type ? ' active' : ''}`}
            onTouchStart={() => setActiveBlockType(type)}
          >
            <div
              className="mobile-hotbar-block"
              style={{ backgroundColor: blockColors[type] }}
            />
            <span className="mobile-hotbar-label">{type}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
