/**
 * Farming & Livestock Systems Engine
 * Manages soil tilling, seed sowing, crop growth progression, livestock production (chickens, cows),
 * and skill experience allocation.
 */

export class FarmingEngine {
  constructor(gameState, worldMap, renderer) {
    this.gameState = gameState;
    this.worldMap = worldMap;
    this.renderer = renderer;
  }

  interactFarm(player) {
    if (!player) return;
    const { gx, gy } = player;

    // 1. Harvest Ready Crop
    const harvested = this.worldMap.harvestCrop(gx, gy);
    if (harvested) {
      const cropName = harvested.type === 'wheat' ? 'Golden Wheat' : harvested.type === 'berry' ? 'Mystic Berries' : 'Star Herb';
      player.addItem({ id: harvested.type, name: cropName, type: 'crop', count: 3, rarity: 'COMMON' });
      player.addSkillXp('Farming', 30);
      player.addXp(15);
      this.gameState.saveProgress(this.worldMap);

      if (this.renderer) {
        const screen = this.getScreenCoordinates(gx, gy);
        this.renderer.addFloatingText(`+3 ${cropName}!`, screen.x, screen.y - 10, '#22c55e');
      }
      this.gameState.notify();
      return;
    }

    // 2. Plant Seed on Tilled Soil
    const seed = player.inventory.find((i) => i.type === 'seed' && i.count > 0);
    if (seed && this.worldMap.getTile(gx, gy) === 2) { // 2 = TILLED
      const cropType = seed.id.replace('_seed', '');
      const planted = this.worldMap.plantCrop(gx, gy, cropType);
      if (planted) {
        player.removeItem(seed.id, 1);
        player.addSkillXp('Farming', 10);
        this.gameState.saveProgress(this.worldMap);

        if (this.renderer) {
          const screen = this.getScreenCoordinates(gx, gy);
          this.renderer.addFloatingText('Planted Seed!', screen.x, screen.y - 10, '#86efac');
        }
        this.gameState.notify();
        return;
      }
    }

    // 3. Till Grass Soil
    const tilled = this.worldMap.tillSoil(gx, gy);
    if (tilled) {
      player.addSkillXp('Farming', 5);
      if (this.renderer) {
        const screen = this.getScreenCoordinates(gx, gy);
        this.renderer.addFloatingText('Tilled Soil', screen.x, screen.y - 10, '#a16207');
      }
      this.gameState.notify();
    }
  }

  getScreenCoordinates(gx, gy) {
    if (!this.renderer) return { x: 300, y: 300 };
    const originX = this.renderer.canvas.width / 2 + this.renderer.camera.x;
    const originY = this.renderer.canvas.height / 3 + this.renderer.camera.y;
    return {
      x: (gx - gy) * 32 + originX,
      y: (gx + gy) * 16 + originY,
    };
  }
}
