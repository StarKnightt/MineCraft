// ============================================================
// Core types for the Minecraft-web voxel engine
// ============================================================

/** Every placeable block type in the game */
export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'glass';

/** All block types as a runtime array (order = hotbar order) */
export const BLOCK_TYPES: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'glass'];

/**
 * A world-space integer coordinate encoded as "x,y,z".
 * Using a string key lets us store blocks in a plain object
 * with O(1) lookup / delete instead of scanning an array.
 */
export type PositionKey = `${number},${number},${number}`;

/** Tuple shorthand used throughout Three.js helpers */
export type Vec3 = [x: number, y: number, z: number];

// ---- Keyboard -----------------------------------------------

export interface KeyMap {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  sneak: boolean;
}
