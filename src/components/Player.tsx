// ============================================================
// Player — first-person controller with grid-based AABB
// collision against blocks centered on integer coordinates.
//
// COORDINATE SYSTEM:
//   A block stored at key "bx,by,bz" is rendered with its
//   center at (bx, by, bz), so it occupies the volume:
//     [bx - 0.5, bx + 0.5] × [by - 0.5, by + 0.5] × [bz - 0.5, bz + 0.5]
//
//   The player AABB is defined by feet position (px, py, pz):
//     [px - HALF, px + HALF] × [py, py + PLAYER_H] × [pz - HALF, pz + HALF]
//
// COLLISION:
//   For each candidate block the player AABB might overlap,
//   we test actual AABB-vs-AABB intersection.  Movement is
//   resolved axis-by-axis (Y, then X, then Z) with sub-stepping
//   to prevent tunneling at low framerates.
// ============================================================

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useKeyboard } from '../hooks/useKeyboard';
import { useStore, posKey, fastPosKey } from '../store/useStore';
import { playFootstep, playJump, playRespawn } from '../audio/sounds';
import { mobileKeys, mobileLook, mobileAction } from './MobileControls';
import type { BlockType, PositionKey } from '../types';
import { BLOCK_TYPES } from '../types';
import * as THREE from 'three';

// ---- tuning constants ----------------------------------------

const SPEED       = 5.5;
const SNEAK_MUL   = 0.35;
const JUMP_VEL    = 8;
const GRAVITY     = -25;
const EYE_HEIGHT  = 1.5;
const PLAYER_W    = 0.6;
const PLAYER_H    = 1.7;
const HALF        = PLAYER_W / 2;
const RESPAWN_Y   = -20;      // fall below this → respawn
const SPAWN_POS   = { x: 0, y: 15, z: 0 };

// Pre-allocated objects (zero per-frame allocation)
const _fwd = new THREE.Vector3();
const _rgt = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

// Pre-allocated merged key state to avoid creating a new object per frame
const _mergedKeys = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  jump: false,
  sneak: false,
};

// ---- grid AABB collision ------------------------------------
//
// Given the player's AABB (minX..maxX, minY..maxY, minZ..maxZ),
// find every block whose volume overlaps it.
//
// Block at integer (bx,by,bz) occupies [bx-0.5, bx+0.5] on each axis.
// To find which integer block positions could overlap a range [lo, hi]:
//   bx_min = round(lo)  if  lo <= bx_min + 0.5
//   bx_max = round(hi)  if  hi >= bx_max - 0.5
// Simpler: bx ranges from ceil(lo - 0.5) to floor(hi + 0.5 - epsilon).

function collides(
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number,
  blocks: Record<PositionKey, BlockType>,
): boolean {
  // Which integer block coordinates could overlap?
  const bx0 = Math.ceil(minX - 0.5 + 0.001);
  const bx1 = Math.floor(maxX + 0.5 - 0.001);
  const by0 = Math.ceil(minY - 0.5 + 0.001);
  const by1 = Math.floor(maxY + 0.5 - 0.001);
  const bz0 = Math.ceil(minZ - 0.5 + 0.001);
  const bz1 = Math.floor(maxZ + 0.5 - 0.001);

  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      for (let bz = bz0; bz <= bz1; bz++) {
        // fastPosKey caches the string so the hot loop never
        // allocates template-literal garbage.
        if (blocks[fastPosKey(bx, by, bz)] !== undefined) {
          if (
            maxX > bx - 0.5 && minX < bx + 0.5 &&
            maxY > by - 0.5 && minY < by + 0.5 &&
            maxZ > bz - 0.5 && minZ < bz + 0.5
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}
// ---- component -----------------------------------------------

export function Player() {
  const { camera } = useThree();

  // Detect touch device (for conditional PointerLockControls)
  const [isMobile] = useState(() =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
  );

  // Euler for mobile camera look
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const initCam = useRef(false);

  // Mutable state (refs — zero re-renders)
  const px = useRef(0);
  const py = useRef(15);   // spawn high, will fall
  const pz = useRef(0);
  const vy = useRef(0);
  const onGround = useRef(false);
  const lastStoreUpdate = useRef(0);

  const setPlayerPosition  = useStore((s) => s.setPlayerPosition);
  const setActiveBlockType = useStore((s) => s.setActiveBlockType);

  const onDigit = (idx: number) => {
    if (idx < BLOCK_TYPES.length) {
      setActiveBlockType(BLOCK_TYPES[idx] as BlockType);
    }
  };
  const keys = useKeyboard(onDigit);

  useFrame((state, rawDt) => {
    const dt     = Math.min(rawDt, 0.1);
    const kRaw   = keys.current;
    const blocks = useStore.getState().blocks;

    // Merge keyboard + mobile keys into pre-allocated object
    _mergedKeys.moveForward  = kRaw.moveForward  || mobileKeys.moveForward;
    _mergedKeys.moveBackward = kRaw.moveBackward || mobileKeys.moveBackward;
    _mergedKeys.moveLeft     = kRaw.moveLeft     || mobileKeys.moveLeft;
    _mergedKeys.moveRight    = kRaw.moveRight    || mobileKeys.moveRight;
    _mergedKeys.jump         = kRaw.jump         || mobileKeys.jump;
    _mergedKeys.sneak        = kRaw.sneak        || mobileKeys.sneak;
    const k = _mergedKeys;

    // ---- 0. mobile camera look --------------------------------

    if (isMobile) {
      if (!initCam.current) {
        euler.current.setFromQuaternion(camera.quaternion);
        initCam.current = true;
      }
      if (mobileLook.dx !== 0 || mobileLook.dy !== 0) {
        const sensitivity = 0.004;
        euler.current.y -= mobileLook.dx * sensitivity;
        euler.current.x -= mobileLook.dy * sensitivity;
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
        camera.quaternion.setFromEuler(euler.current);
        mobileLook.dx = 0;
        mobileLook.dy = 0;
      }
    }

    // ---- 0b. mobile place/break via raycasting ----------------

    if (mobileAction.current) {
      // Check blocks in front of camera
      const action = mobileAction.current;
      mobileAction.current = null;

      // Simple grid raycast — step through grid
      camera.getWorldDirection(_rayDir);
      _rayOrigin.copy(camera.position);
      const step = 0.15;
      const maxDist = 5;

      let hitKey: PositionKey | null = null;
      let prevKey: PositionKey | null = null;

      for (let d = 0; d < maxDist; d += step) {
        const tx = _rayOrigin.x + _rayDir.x * d;
        const ty = _rayOrigin.y + _rayDir.y * d;
        const tz = _rayOrigin.z + _rayDir.z * d;
        const bx = Math.round(tx);
        const by = Math.round(ty);
        const bz = Math.round(tz);
        const key = posKey(bx, by, bz);

        if (blocks[key] !== undefined) {
          hitKey = key;
          break;
        }
        prevKey = key;
      }

      if (hitKey) {
        if (action === 'break') {
          const parts = hitKey.split(',');
          useStore.getState().removeBlock([Number(parts[0]), Number(parts[1]), Number(parts[2])]);
        } else if (action === 'place' && prevKey) {
          const parts = prevKey.split(',');
          useStore.getState().addBlock([Number(parts[0]), Number(parts[1]), Number(parts[2])]);
        }
      }
    }

    // ---- 1. horizontal input (camera-relative) ----------------

    const speed = k.sneak ? SPEED * SNEAK_MUL : SPEED;

    const q = camera.quaternion;
    _fwd.set(0, 0, -1).applyQuaternion(q); _fwd.y = 0; _fwd.normalize();
    _rgt.set(1, 0, 0).applyQuaternion(q);  _rgt.y = 0; _rgt.normalize();

    const inputFwd   = (k.moveForward ? 1 : 0) - (k.moveBackward ? 1 : 0);
    const inputRight = (k.moveRight   ? 1 : 0) - (k.moveLeft     ? 1 : 0);

    let vx = (_fwd.x * inputFwd + _rgt.x * inputRight) * speed;
    let vz = (_fwd.z * inputFwd + _rgt.z * inputRight) * speed;

    // ---- 2. gravity + jump ------------------------------------

    if (k.jump && onGround.current) {
      vy.current = JUMP_VEL;
      onGround.current = false;
      playJump();
    }
    vy.current += GRAVITY * dt;
    if (vy.current < -40) vy.current = -40;

    // ---- 3. move + collide (split axis, sub-stepped) ----------
    //
    // Sub-step: split the frame into steps of max 1/60s to
    // prevent tunneling through blocks at low fps.

    const SUB_DT = 1 / 60;
    let remaining = dt;

    while (remaining > 0.0001) {
      const step = Math.min(remaining, SUB_DT);
      remaining -= step;

      // --- Y axis (gravity, most important) ---
      {
        const newY = py.current + vy.current * step;
        const minX = px.current - HALF;
        const maxX = px.current + HALF;
        const minZ = pz.current - HALF;
        const maxZ = pz.current + HALF;

        if (collides(minX, newY, minZ, maxX, newY + PLAYER_H, maxZ, blocks)) {
          if (vy.current <= 0) {
            // Falling — snap feet to top of the block below.
            // The block top is at by + 0.5.  Find the highest block
            // the player's feet are trying to go into.
            const byTest = Math.ceil(newY - 0.5 + 0.001);
            // Snap feet to top of that block
            py.current = byTest + 0.5;
            // Verify we're not still colliding (e.g. spawned inside)
            while (collides(minX, py.current, minZ, maxX, py.current + PLAYER_H, maxZ, blocks)) {
              py.current += 1;
            }
            onGround.current = true;
          }
          // else: moving up, hit head — just stop
          vy.current = 0;
        } else {
          py.current = newY;
          // Check grounded: is there a block just below feet?
          onGround.current = collides(
            minX, newY - 0.02, minZ,
            maxX, newY + 0.02, maxZ,
            blocks,
          );
        }
      }

      // --- X axis ---
      {
        const newX = px.current + vx * step;
        if (collides(
          newX - HALF,       py.current, pz.current - HALF,
          newX + HALF,       py.current + PLAYER_H, pz.current + HALF,
          blocks,
        )) {
          vx = 0; // blocked — stop horizontal movement on this axis
        } else {
          px.current = newX;
        }
      }

      // --- Z axis ---
      {
        const newZ = pz.current + vz * step;
        if (collides(
          px.current - HALF, py.current, newZ - HALF,
          px.current + HALF, py.current + PLAYER_H, newZ + HALF,
          blocks,
        )) {
          vz = 0;
        } else {
          pz.current = newZ;
        }
      }
    }

    // ---- 4. respawn check -------------------------------------

    if (py.current < RESPAWN_Y) {
      px.current = SPAWN_POS.x;
      py.current = SPAWN_POS.y;
      pz.current = SPAWN_POS.z;
      vy.current = 0;
      onGround.current = false;
      playRespawn();
    }

    // ---- 5. footstep sound -----------------------------------

    if (onGround.current && (Math.abs(vx) > 0.5 || Math.abs(vz) > 0.5)) {
      playFootstep();
    }

    // ---- 6. sync camera ---------------------------------------

    camera.position.set(px.current, py.current + EYE_HEIGHT, pz.current);

    // ---- 7. throttled store update (~4Hz) ----------------------

    const now = state.clock.elapsedTime;
    if (now - lastStoreUpdate.current > 0.25) {
      lastStoreUpdate.current = now;
      setPlayerPosition([px.current, py.current, pz.current]);
    }
  });

  return isMobile ? null : <PointerLockControls />;
}
