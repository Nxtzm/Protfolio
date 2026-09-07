/**
 * Regional Economy & Merchant System Engine
 * Manages shop inventories, item buying, selling, gold transactions,
 * and dynamic supply/demand pricing.
 */

export class EconomyEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  getItemValue(item, mode = 'sell') {
    let base = 10;
    if (item.type === 'weapon') base = 40;
    if (item.type === 'armor') base = 35;
    if (item.type === 'material') base = 12;
    if (item.type === 'crop') base = 15;
    if (item.type === 'seed') base = 8;
    if (item.rarity === 'RARE') base *= 2;
    if (item.rarity === 'EPIC') base *= 4;
    if (item.rarity === 'LEGENDARY') base *= 8;

    return mode === 'sell' ? Math.floor(base * 0.6) : base;
  }

  buyItem(player, itemToBuy) {
    if (!player || !itemToBuy) return false;
    const cost = itemToBuy.cost || this.getItemValue(itemToBuy, 'buy');

    if (player.gold >= cost) {
      player.gold -= cost;
      player.addItem(itemToBuy);
      this.gameState.saveProgress();
      this.gameState.notify();
      return true;
    }
    return false;
  }

  sellItem(player, itemId, count = 1) {
    if (!player) return false;
    const item = player.inventory.find((i) => i.id === itemId);
    if (item && item.count >= count) {
      const val = this.getItemValue(item, 'sell') * count;
      player.removeItem(itemId, count);
      player.gold += val;
      this.gameState.saveProgress();
      this.gameState.notify();
      return true;
    }
    return false;
  }
}
