// ============================================================
// Zustand store — heavily optimized for minimal allocations.
//
// BLOCK STORAGE:
//   Blocks are stored in a plain object keyed by "x,y,z" and
//   mutated in-place to avoid copying 5K+ keys on every add/
//   remove.  A monotonic `blockVersion` counter is stored in
//   the Zustand state; incrementing it gives React a new value
//   to compare, triggering re-renders only for components that
//   subscribe to `blockVersion`.
//
// COLLISION LOOKUP:
//   fastPosKey() caches the string key in a nested Map so the
//   60fps collision loop never allocates template-literal strings.
// ============================================================

import { create } from 'zustand';
import type { BlockType, PositionKey, Vec3 } from '../types';
import { playPlace, playBreak } from '../audio/sounds';

// ---- helpers ------------------------------------------------

export function posKey(x: number, y: number, z: number): PositionKey {
  return `${x},${y},${z}` as PositionKey;
}

export function keyToPos(key: PositionKey): Vec3 {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// ---- fast block lookup for collision (zero alloc) -----------

const _keyCache = new Map<number, Map<number, Map<number, PositionKey>>>();

export function fastPosKey(x: number, y: number, z: number): PositionKey {
  let ym = _keyCache.get(x);
  if (!ym) { ym = new Map(); _keyCache.set(x, ym); }
  let zm = ym.get(y);
  if (!zm) { zm = new Map(); ym.set(y, zm); }
  let k = zm.get(z);
  if (!k) { k = `${x},${y},${z}` as PositionKey; zm.set(z, k); }
  return k;
}

// ---- terrain generator --------------------------------------

function generateTerrain(): Record<PositionKey, BlockType> {
  const blocks: Record<PositionKey, BlockType> = Object.create(null);
  const SIZE = 16;

  for (let x = -SIZE; x <= SIZE; x++) {
    for (let z = -SIZE; z <= SIZE; z++) {
      const height = Math.floor(
        Math.sin(x * 0.15) * 2 +
        Math.cos(z * 0.15) * 2 +
        Math.sin((x + z) * 0.1) * 1.5,
      );

      for (let y = -3; y <= height; y++) {
        let type: BlockType;
        if (y === height) type = 'grass';
        else if (y >= height - 2) type = 'dirt';
        else type = 'stone';
        blocks[posKey(x, y, z)] = type;
      }
    }
  }

  // Trees
  const trees: [number, number, number][] = [
    [3, 0, 4], [-5, 0, -7], [10, 0, -3], [-8, 0, 12], [6, 0, -10],
  ];
  for (const [tx, , tz] of trees) {
    let groundY = 10;
    for (let y = 10; y >= -3; y--) {
      if (blocks[posKey(tx, y, tz)] !== undefined) { groundY = y; break; }
    }
    for (let dy = 1; dy <= 4; dy++) {
      blocks[posKey(tx, groundY + dy, tz)] = 'wood';
    }
  }

  return blocks;
}

// ---- player-position overlap check --------------------------

function overlapsPlayer(bx: number, by: number, bz: number, pp: Vec3): boolean {
  const [px, py, pz] = pp;
  const playerMinY = py - 0.9;
  const playerMaxY = py + 0.9;
  const blockMinY = by - 0.5;
  const blockMaxY = by + 0.5;
  if (blockMaxY <= playerMinY || blockMinY >= playerMaxY) return false;
  return Math.abs(bx - px) < 0.8 && Math.abs(bz - pz) < 0.8;
}

// ---- store types (extended from the shared GameState) -------

export interface StoreState {
  blocks: Record<PositionKey, BlockType>;
  blockVersion: number;
  activeBlockType: BlockType;
  playerPosition: Vec3;

  addBlock: (pos: Vec3) => void;
  removeBlock: (pos: Vec3) => void;
  setActiveBlockType: (type: BlockType) => void;
  setPlayerPosition: (pos: Vec3) => void;
}

// ---- store --------------------------------------------------

export const useStore = create<StoreState>((set, get) => ({
  blocks: generateTerrain(),
  blockVersion: 0,
  activeBlockType: 'grass',
  playerPosition: [0, 10, 0],

  addBlock: ([x, y, z]: Vec3) => {
    const state = get();
    const key = posKey(x, y, z);
    if (state.blocks[key] !== undefined) return;
    if (overlapsPlayer(x, y, z, state.playerPosition)) return;

    // Mutate in-place — no 5K-key copy.  Bump version so
    // subscribers (Block.tsx) see a new number and re-render.
    state.blocks[key] = state.activeBlockType;
    set({ blockVersion: state.blockVersion + 1 });
    playPlace();
  },

  removeBlock: ([x, y, z]: Vec3) => {
    const state = get();
    const key = posKey(x, y, z);
    if (state.blocks[key] === undefined) return;

    delete state.blocks[key];
    set({ blockVersion: state.blockVersion + 1 });
    playBreak();
  },

  setActiveBlockType: (type: BlockType) =>
    set({ activeBlockType: type }),

  setPlayerPosition: (pos: Vec3) => {
    const prev = get().playerPosition;
    const dx = pos[0] - prev[0];
    const dy = pos[1] - prev[1];
    const dz = pos[2] - prev[2];
    if (dx * dx + dy * dy + dz * dz > 0.25) {
      set({ playerPosition: pos });
    }
  },
}));

/** Read the current block version (useful outside React) */
export function getBlockVersion(): number {
  return useStore.getState().blockVersion;
}
