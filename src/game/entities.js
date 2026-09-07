/**
 * Entity Classes: Player, Monster, NPC
 */

export class Player {
  constructor(id, name, slot = 1) {
    this.id = id;
    this.name = name;
    this.slot = slot;
    this.gx = slot === 1 ? 10 : 12;
    this.gy = slot === 1 ? 10 : 12;
    this.targetGx = this.gx;
    this.targetGy = this.gy;

    // Core Attributes
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.mana = 50;
    this.maxMana = 50;
    this.gold = 250;

    // Action states
    this.isMoving = false;
    this.isAttacking = false;
    this.isFarming = false;
    this.facing = 'south';

    // Equipped gear
    this.equipment = {
      weapon: { id: 'iron_shortsword', name: 'Iron Shortsword', type: 'weapon', attack: 12, rarity: 'COMMON', effect: 'fast' },
      armor: { id: 'leather_vest', name: 'Leather Vest', type: 'armor', defense: 5, rarity: 'COMMON' },
      accessory: null,
    };

    // Inventory (Slots)
    this.inventory = [
      { id: 'wheat_seed', name: 'Wheat Seed', type: 'seed', count: 10, rarity: 'COMMON' },
      { id: 'health_potion', name: 'Health Potion', type: 'consumable', count: 5, effect: 'heal_30', rarity: 'UNCOMMON' },
      { id: 'iron_ore', name: 'Iron Ore', type: 'material', count: 3, rarity: 'COMMON' },
      { id: 'wood', name: 'Timber', type: 'material', count: 15, rarity: 'COMMON' },
    ];

    // RPG Skill Progression (Levels & Specializations)
    this.skills = {
      Farming: { level: 1, xp: 0, spec: null },
      Mining: { level: 1, xp: 0, spec: null },
      Combat: { level: 1, xp: 0, spec: null },
      Foraging: { level: 1, xp: 0, spec: null },
      Fishing: { level: 1, xp: 0, spec: null },
      Alchemy: { level: 1, xp: 0, spec: null },
      Smithing: { level: 1, xp: 0, spec: null },
      Hunting: { level: 1, xp: 0, spec: null },
      Cooking: { level: 1, xp: 0, spec: null },
      Jewelcrafting: { level: 1, xp: 0, spec: null },
    };
  }

  addXp(amount) {
    this.xp += amount;
    if (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level += 1;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
      this.maxHp += 15;
      this.hp = this.maxHp;
      this.maxStamina += 10;
      this.stamina = this.maxStamina;
      return true; // Leveled up
    }
    return false;
  }

  addSkillXp(skillName, amount) {
    if (!this.skills[skillName]) return false;
    const s = this.skills[skillName];
    s.xp += amount;
    const req = s.level * 50;
    if (s.xp >= req) {
      s.xp -= req;
      s.level += 1;
      return true; // Skill leveled up
    }
    return false;
  }

  addItem(item) {
    const existing = this.inventory.find((i) => i.id === item.id);
    if (existing) {
      existing.count += item.count || 1;
    } else {
      this.inventory.push({ ...item, count: item.count || 1 });
    }
  }

  removeItem(itemId, count = 1) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx >= 0) {
      if (this.inventory[idx].count > count) {
        this.inventory[idx].count -= count;
      } else {
        this.inventory.splice(idx, 1);
      }
      return true;
    }
    return false;
  }
}

export class Monster {
  constructor(id, name, gx, gy, hp, attack, color = '#ea580c', isBoss = false) {
    this.id = id;
    this.name = name;
    this.gx = gx;
    this.gy = gy;
    this.hp = hp;
    this.maxHp = hp;
    this.attack = attack;
    this.color = color;
    this.isBoss = isBoss;
    this.bossPhase = 1;
    this.targetPlayerId = null;
    this.lastAttackTime = 0;
  }
}

export class NPC {
  constructor(id, name, title, gx, gy, dialogue, shopItems = []) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.gx = gx;
    this.gy = gy;
    this.dialogue = dialogue;
    this.shopItems = shopItems;
  }
}
