// ============================================================
// useKeyboard — zero-rerender keyboard state via useRef.
//
// Tracks WASD movement, Space jump, Shift sneak.
// Also fires a callback for digit keys 1-9 (hotbar selection)
// via a subscriber pattern so the HUD can react without
// coupling into the per-frame game loop.
//
// Returns a stable ref — reading `.current` inside useFrame
// causes zero React reconciliation cost.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { KeyMap } from '../types';

// ---- key code → action mapping ------------------------------

const CODE_TO_ACTION: Record<string, keyof KeyMap> = {
  KeyW:      'moveForward',
  KeyS:      'moveBackward',
  KeyA:      'moveLeft',
  KeyD:      'moveRight',
  Space:     'jump',
  ShiftLeft: 'sneak',
  ShiftRight:'sneak',
};

// Digit codes → 0-based hotbar index
const DIGIT_TO_INDEX: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
  Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8,
};

function createInitialKeys(): KeyMap {
  return {
    moveForward:  false,
    moveBackward: false,
    moveLeft:     false,
    moveRight:    false,
    jump:         false,
    sneak:        false,
  };
}

// ---- hook ---------------------------------------------------

/**
 * @param onDigit  Optional callback fired when a digit key (1-9) is
 *                 pressed.  Receives the 0-based index.  Lives here
 *                 so there's exactly one keydown listener for the
 *                 whole game.
 */
export function useKeyboard(onDigit?: (index: number) => void) {
  const keys     = useRef<KeyMap>(createInitialKeys());
  const digitCb  = useRef(onDigit);
  digitCb.current = onDigit;  // always latest, no stale closure

  const onDown = useCallback((e: KeyboardEvent) => {
    // Movement / jump / sneak
    const action = CODE_TO_ACTION[e.code];
    if (action) {
      keys.current[action] = true;
      return;
    }
    // Digit key → hotbar
    const idx = DIGIT_TO_INDEX[e.code];
    if (idx !== undefined) {
      digitCb.current?.(idx);
    }
  }, []);

  const onUp = useCallback((e: KeyboardEvent) => {
    const action = CODE_TO_ACTION[e.code];
    if (action) keys.current[action] = false;
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', onDown);
    document.addEventListener('keyup',   onUp);
    return () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('keyup',   onUp);
    };
  }, [onDown, onUp]);

  return keys;
}
