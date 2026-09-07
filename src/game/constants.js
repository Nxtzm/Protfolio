/**
 * Game Engine Constants & Utility Math Functions
 * Designed for lightweight isometric 2.5D presentation.
 */

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const TILE_TYPES = {
  EMPTY: 0,
  GRASS: 1,
  TILLED: 2,
  WATER: 3,
  STONE_PATH: 4,
  WOOD_FLOOR: 5,
  SAND: 6,
  SNOW: 7,
  LAVA: 8,
  WALL: 9,
};

export const GRAPHICS_PRESETS = {
  LOW: {
    targetFps: 30,
    enableShadows: false,
    enableParticles: false,
    enableDayNightLighting: false,
    maxParticles: 15,
  },
  MEDIUM: {
    targetFps: 60,
    enableShadows: true,
    enableParticles: true,
    enableDayNightLighting: true,
    maxParticles: 50,
  },
  HIGH: {
    targetFps: 60,
    enableShadows: true,
    enableParticles: true,
    enableDayNightLighting: true,
    maxParticles: 100,
  },
};

/**
 * Converts Grid (X, Y) coordinates to Isometric Screen (X, Y) pixel coordinates.
 */
export function gridToIso(gx, gy, originX = 0, originY = 0) {
  const isoX = (gx - gy) * (TILE_WIDTH / 2) + originX;
  const isoY = (gx + gy) * (TILE_HEIGHT / 2) + originY;
  return { x: isoX, y: isoY };
}

/**
 * Converts Isometric Screen (X, Y) coordinates back to Grid (X, Y) tile coordinates.
 */
export function isoToGrid(screenX, screenY, originX = 0, originY = 0) {
  const relX = screenX - originX;
  const relY = screenY - originY;
  const gx = (relX / (TILE_WIDTH / 2) + relY / (TILE_HEIGHT / 2)) / 2;
  const gy = (relY / (TILE_HEIGHT / 2) - relX / (TILE_WIDTH / 2)) / 2;
  return { gx: Math.floor(gx), gy: Math.floor(gy) };
}

export const SKILL_CATEGORIES = [
  'Farming',
  'Mining',
  'Combat',
  'Foraging',
  'Fishing',
  'Alchemy',
  'Smithing',
  'Hunting',
  'Cooking',
  'Jewelcrafting',
];

export const ITEM_RARITIES = {
  COMMON: { name: 'Common', color: '#9ca3af' },
  UNCOMMON: { name: 'Uncommon', color: '#22c55e' },
  RARE: { name: 'Rare', color: '#3b82f6' },
  EPIC: { name: 'Epic', color: '#a855f7' },
  LEGENDARY: { name: 'Legendary', color: '#eab308' },
  MYTHIC: { name: 'Mythic', color: '#ef4444' },
  RELIC: { name: 'Relic', color: '#06b6d4' },
};
