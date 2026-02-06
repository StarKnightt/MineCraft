// ============================================================
// Texture system — loads 16x16 pixel art PNGs once, creates
// reusable MeshStandardMaterial arrays for each block type.
//
// OPTIMIZATIONS:
//   - Each unique texture/config combo creates exactly ONE material
//     instance.  Grass-side is reused across all 4 side faces, not
//     duplicated.  This halves GPU material switches and RAM.
//   - All textures use NearestFilter (no bilinear blur).
//   - generateMipmaps disabled (16x16 doesn't benefit from mips).
// ============================================================

import * as THREE from 'three';
import type { BlockType } from '../types';

// ---- texture loader (singleton) -----------------------------

const loader = new THREE.TextureLoader();

function loadTex(path: string): THREE.Texture {
  const tex = loader.load(path);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;          // 16x16 doesn't need mips
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---- load all texture images --------------------------------

const tex = {
  grassTop:  loadTex('/textures/grass_top.png'),
  grassSide: loadTex('/textures/grass_side.png'),
  dirt:      loadTex('/textures/dirt.png'),
  stone:     loadTex('/textures/stone.png'),
  woodSide:  loadTex('/textures/wood_side.png'),
  woodTop:   loadTex('/textures/wood_top.png'),
  glass:     loadTex('/textures/glass.png'),
};

// ---- material cache (deduplicated) --------------------------
// Each unique (texture, transparent, opacity, side) combo is
// created exactly once.

const _matCache = new Map<THREE.Texture, Map<string, THREE.MeshStandardMaterial>>();

function mat(
  texture: THREE.Texture,
  opts?: { transparent?: boolean; opacity?: number; side?: THREE.Side },
): THREE.MeshStandardMaterial {
  const transparent = opts?.transparent ?? false;
  const opacity     = opts?.opacity ?? 1;
  const side        = opts?.side ?? THREE.FrontSide;
  const cacheKey    = `${transparent}|${opacity}|${side}`;

  let sub = _matCache.get(texture);
  if (!sub) { sub = new Map(); _matCache.set(texture, sub); }

  let m = sub.get(cacheKey);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      map:         texture,
      transparent,
      opacity,
      side,
      alphaTest:   transparent ? 0.1 : 0,
    });
    sub.set(cacheKey, m);
  }
  return m;
}

// ---- per-face material arrays (6 faces of BoxGeometry) ------
// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
//                         right left top bottom front back
//
// mat() returns the SAME instance for identical args, so
// grassSide reuses one material object across all 4 side faces.

const grassSideMat = mat(tex.grassSide);
const grassMats = [
  grassSideMat,           // right
  grassSideMat,           // left
  mat(tex.grassTop),      // top
  mat(tex.dirt),          // bottom
  grassSideMat,           // front
  grassSideMat,           // back
];

const dirtMat = mat(tex.dirt);
const dirtMats = [dirtMat, dirtMat, dirtMat, dirtMat, dirtMat, dirtMat];

const stoneMat = mat(tex.stone);
const stoneMats = [stoneMat, stoneMat, stoneMat, stoneMat, stoneMat, stoneMat];

const woodSideMat = mat(tex.woodSide);
const woodTopMat  = mat(tex.woodTop);
const woodMats = [
  woodSideMat,            // right
  woodSideMat,            // left
  woodTopMat,             // top
  woodTopMat,             // bottom
  woodSideMat,            // front
  woodSideMat,            // back
];

const glassMat = mat(tex.glass, { transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const glassMats = [glassMat, glassMat, glassMat, glassMat, glassMat, glassMat];

export const blockMaterials: Record<BlockType, THREE.MeshStandardMaterial[]> = {
  grass: grassMats,
  dirt:  dirtMats,
  stone: stoneMats,
  wood:  woodMats,
  glass: glassMats,
};

export const blockColors: Record<BlockType, string> = {
  grass: '#5d9b3a',
  dirt:  '#8b6914',
  stone: '#888888',
  wood:  '#9c6632',
  glass: '#8fd4f0',
};

export const blockTransparent: Record<BlockType, boolean> = {
  grass: false,
  dirt:  false,
  stone: false,
  wood:  false,
  glass: true,
};
