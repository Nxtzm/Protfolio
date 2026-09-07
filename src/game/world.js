/**
 * World Map & Environmental Mechanics Engine
 * Manages tilemap data, regional zones (Village, Farmland, Deep Forest, Dungeon Ruins),
 * collision detection, environmental objects, dynamic crop growth, and day/night cycles.
 */

import { TILE_TYPES } from './constants';

export class WorldMap {
  constructor(width = 32, height = 32) {
    this.width = width;
    this.height = height;
    this.tiles = new Array(width * height).fill(TILE_TYPES.GRASS);
    this.crops = []; // { gx, gy, type, stage, plantedTime, growthDuration }
    this.objects = []; // { id, type, gx, gy }
    this.timeOfDay = 0.2; // 0.0 to 1.0 (Noon to Midnight to Dawn)

    this.generateWorld();
  }

  generateWorld() {
    // 1. Cobblestone Village Roads & Merchant Square
    for (let x = 6; x <= 16; x++) {
      this.setTile(x, 10, TILE_TYPES.STONE_PATH);
    }
    for (let y = 6; y <= 16; y++) {
      this.setTile(10, y, TILE_TYPES.STONE_PATH);
    }

    // Village Structures (Houses & Smithy)
    this.objects.push({ id: 'house_elder', type: 'house', gx: 8, gy: 7 });
    this.objects.push({ id: 'house_smith', type: 'house', gx: 14, gy: 7 });

    // 2. Farmland Region (West)
    for (let fx = 2; fx <= 6; fx++) {
      for (let fy = 12; fy <= 16; fy++) {
        this.setTile(fx, fy, TILE_TYPES.TILLED);
      }
    }
    // Pre-planted crops
    this.crops.push({ gx: 3, gy: 13, type: 'wheat', stage: 2, plantedTime: Date.now() });
    this.crops.push({ gx: 4, gy: 13, type: 'berry', stage: 1, plantedTime: Date.now() });

    // 3. Deep Forest Region (North & East)
    const treePositions = [
      { gx: 2, gy: 2 }, { gx: 4, gy: 3 }, { gx: 18, gy: 4 }, { gx: 22, gy: 5 },
      { gx: 24, gy: 8 }, { gx: 20, gy: 18 }, { gx: 26, gy: 20 }, { gx: 28, gy: 24 }
    ];
    treePositions.forEach((pos, idx) => {
      this.objects.push({ id: `tree_${idx}`, type: 'tree', gx: pos.gx, gy: pos.gy });
    });

    // Rocks / Mining Ores
    const rockPositions = [
      { gx: 18, gy: 18 }, { gx: 22, gy: 22 }, { gx: 24, gy: 18 }
    ];
    rockPositions.forEach((pos, idx) => {
      this.objects.push({ id: `rock_${idx}`, type: 'rock', gx: pos.gx, gy: pos.gy });
    });

    // 4. River Stream
    for (let ry = 0; ry < this.height; ry++) {
      const rx = 28 - Math.floor(Math.sin(ry * 0.3) * 2);
      this.setTile(rx, ry, TILE_TYPES.WATER);
    }

    // 5. Dungeon Ruins Entrance (South-East)
    for (let dx = 22; dx <= 26; dx++) {
      for (let dy = 22; dy <= 26; dy++) {
        if (this.getTile(dx, dy) !== TILE_TYPES.WATER) {
          this.setTile(dx, dy, TILE_TYPES.STONE_PATH);
        }
      }
    }
  }

  getTile(gx, gy) {
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return TILE_TYPES.WALL;
    return this.tiles[gy * this.width + gx];
  }

  setTile(gx, gy, tileType) {
    if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
      this.tiles[gy * this.width + gx] = tileType;
    }
  }

  isWalkable(gx, gy) {
    const tile = this.getTile(gx, gy);
    if (tile === TILE_TYPES.WATER || tile === TILE_TYPES.WALL) return false;

    // Check collision with solid buildings
    const solidObj = this.objects.find((obj) => obj.gx === gx && obj.gy === gy && (obj.type === 'house' || obj.type === 'rock'));
    if (solidObj) return false;

    return true;
  }

  update(dt) {
    // Advance day/night cycle slowly
    this.timeOfDay = (this.timeOfDay + dt * 0.005) % 1.0;

    // Update Crop Growth Stages
    const now = Date.now();
    this.crops.forEach((crop) => {
      if (crop.stage < 2) {
        if (now - crop.plantedTime > 8000) { // 8 seconds per growth stage for quick gameplay
          crop.stage += 1;
          crop.plantedTime = now;
        }
      }
    });
  }

  tillSoil(gx, gy) {
    const current = this.getTile(gx, gy);
    if (current === TILE_TYPES.GRASS) {
      this.setTile(gx, gy, TILE_TYPES.TILLED);
      return true;
    }
    return false;
  }

  plantCrop(gx, gy, cropType) {
    if (this.getTile(gx, gy) === TILE_TYPES.TILLED) {
      const existing = this.crops.find((c) => c.gx === gx && c.gy === gy);
      if (!existing) {
        this.crops.push({
          gx,
          gy,
          type: cropType,
          stage: 0,
          plantedTime: Date.now(),
        });
        return true;
      }
    }
    return false;
  }

  harvestCrop(gx, gy) {
    const idx = this.crops.findIndex((c) => c.gx === gx && c.gy === gy && c.stage === 2);
    if (idx >= 0) {
      const harvested = this.crops[idx];
      this.crops.splice(idx, 1);
      return harvested;
    }
    return null;
  }
}
