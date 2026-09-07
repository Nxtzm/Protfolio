/**
 * Interconnected Crafting & Profession Engine
 * Integrates Smithing, Alchemy, and Cooking crafting chains.
 * Smithing: Ores + Wood -> Weapons & Armor
 * Alchemy: Herbs + Crops -> Health & Mana Potions
 * Cooking: Crops + Fish -> Food Buffs
 */

export const CRAFTING_RECIPES = [
  {
    id: 'health_potion',
    name: 'Health Potion',
    profession: 'Alchemy',
    skillLevel: 1,
    inputs: [
      { id: 'berry', name: 'Mystic Berries', count: 2 },
    ],
    output: { id: 'health_potion', name: 'Health Potion', type: 'consumable', effect: 'heal_30', rarity: 'UNCOMMON' },
  },
  {
    id: 'iron_shortsword',
    name: 'Iron Shortsword',
    profession: 'Smithing',
    skillLevel: 1,
    inputs: [
      { id: 'iron_ore', name: 'Iron Ore', count: 3 },
      { id: 'wood', name: 'Timber', count: 2 },
    ],
    output: { id: 'iron_shortsword', name: 'Iron Shortsword', type: 'weapon', attack: 12, rarity: 'COMMON' },
  },
  {
    id: 'lifesteal_blade',
    name: 'Vampiric Spellblade',
    profession: 'Smithing',
    skillLevel: 3,
    inputs: [
      { id: 'iron_ore', name: 'Iron Ore', count: 5 },
      { id: 'ancient_essence', name: 'Ancient Core', count: 1 },
    ],
    output: { id: 'lifesteal_blade', name: 'Vampiric Spellblade', type: 'weapon', attack: 28, effect: 'lifesteal', rarity: 'RARE' },
  },
  {
    id: 'hearty_stew',
    name: 'Hearty Farm Stew',
    profession: 'Cooking',
    skillLevel: 1,
    inputs: [
      { id: 'wheat', name: 'Golden Wheat', count: 2 },
      { id: 'berry', name: 'Mystic Berries', count: 1 },
    ],
    output: { id: 'hearty_stew', name: 'Hearty Farm Stew', type: 'consumable', effect: 'stamina_full', rarity: 'UNCOMMON' },
  },
];

export class CraftingEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  canCraft(player, recipe) {
    if (!player || !recipe) return false;
    for (const req of recipe.inputs) {
      const inv = player.inventory.find((i) => i.id === req.id);
      if (!inv || inv.count < req.count) return false;
    }
    return true;
  }

  craftItem(player, recipe) {
    if (!this.canCraft(player, recipe)) return false;

    // Deduct ingredients
    for (const req of recipe.inputs) {
      player.removeItem(req.id, req.count);
    }

    // Add crafted output
    player.addItem(recipe.output);

    // Award skill XP
    player.addSkillXp(recipe.profession, 25);
    player.addXp(15);

    this.gameState.saveProgress();
    this.gameState.notify();
    return true;
  }
}
