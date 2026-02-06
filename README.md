# Minecraft Web

A Minecraft-inspired voxel game running entirely in the browser, built with React, TypeScript, and Three.js.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r182-black?logo=threedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)

## Features

- **First-person controls** — WASD movement, mouse look, jump, sneak
- **Block system** — 5 block types: grass, dirt, stone, wood, glass
- **Place & break** — Left-click to place, right-click to break with raycasting
- **Per-face textures** — Grass has green top, dirt bottom, textured sides
- **Procedural terrain** — Rolling hills with trees generated at startup
- **Physics & collision** — Custom grid-based AABB collision with sub-stepping
- **Sound effects** — Procedural audio (place, break, footsteps, jump, respawn) via Web Audio API
- **Mobile support** — Virtual joystick, touch look, action buttons
- **Auto respawn** — Fall into the void and teleport back to spawn
- **Hotbar UI** — Select block types with keys 1-5 or click the toolbar
- **Performance optimized** — Instanced meshes, zero-alloc collision, memoized components, FPS overlay

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| 3D Engine | Three.js via @react-three/fiber |
| Helpers | @react-three/drei (Sky, PointerLockControls) |
| State | Zustand (in-place mutation + version counter) |
| Audio | Web Audio API (procedural, no audio files) |
| Build | Vite 7 with code-split chunks |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Controls

### Desktop

| Action | Input |
|--------|-------|
| Move | W A S D |
| Look | Mouse |
| Jump | Space |
| Sneak | Shift |
| Place block | Left-click |
| Break block | Right-click |
| Select block | 1 - 5 |

### Mobile

| Action | Input |
|--------|-------|
| Move | Left joystick |
| Look | Drag right side of screen |
| Jump / Place / Break | On-screen buttons |
| Select block | Tap hotbar |

## Project Structure

```
src/
├── audio/
│   └── sounds.ts           # Procedural sound effects
├── components/
│   ├── Block.tsx            # Instanced mesh block renderer
│   ├── Ground.tsx           # Invisible click plane
│   ├── MobileControls.tsx   # Touch gamepad overlay
│   ├── Player.tsx           # First-person controller + collision
│   └── Scene.tsx            # R3F Canvas + lighting + sky
├── hooks/
│   └── useKeyboard.ts       # Zero-rerender keyboard input
├── store/
│   └── useStore.ts          # Zustand game state
├── textures/
│   └── index.ts             # Texture loading + material cache
├── types/
│   └── index.ts             # Shared TypeScript types
├── App.tsx                  # Root component + HUD
├── index.css                # Global styles + mobile UI
└── main.tsx                 # Entry point
```

## Performance

- **5 draw calls** total (one instanced mesh per block type)
- **In-place block mutation** — no 5K-key object copy on add/remove
- **Cached position keys** — zero string allocation in collision loop
- **Pre-built noise buffers** — audio reuses cached AudioBuffers
- **Deduplicated materials** — shared instances for identical textures
- **React.memo** on all leaf components to prevent cascade re-renders
- **Code-split build** — game code ~7KB gzipped, libs cached separately

## License

MIT
