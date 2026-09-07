/**
 * Real-Time Graphical Combat Engine & Monster AI Mechanics
 * Handles player melee/ranged attack hitboxes, monster aggro AI, boss phase transitions,
 * critical hits, damage calculations, loot drops, and multiplayer sync.
 */

import { multiplayerManager } from '../services/multiplayer';

export class CombatEngine {
  constructor(gameState, renderer) {
    this.gameState = gameState;
    this.renderer = renderer;
  }

  playerAttack(player, world) {
    if (!player || player.hp <= 0) return;

    player.isAttacking = true;
    setTimeout(() => { player.isAttacking = false; }, 300);

    const weapon = player.equipment?.weapon || { attack: 10, effect: 'normal' };
    let baseDamage = weapon.attack + Math.floor(player.level * 2);

    // Critical Hit Check (15% chance)
    const isCrit = Math.random() < 0.15;
    if (isCrit) baseDamage = Math.floor(baseDamage * 1.8);

    // Search for monsters in adjacent tiles (radius 2)
    let hitCount = 0;
    this.gameState.monsters.forEach((monster) => {
      const dist = Math.hypot(monster.gx - player.gx, monster.gy - player.gy);
      if (dist <= 2.2) {
        hitCount++;
        const finalDamage = Math.max(1, baseDamage + Math.floor(Math.random() * 4));
        monster.hp -= finalDamage;

        // Life-steal weapon effect
        if (weapon.effect === 'lifesteal') {
          const heal = Math.floor(finalDamage * 0.25);
          player.hp = Math.min(player.maxHp, player.hp + heal);
          if (this.renderer) {
            const screen = this.getScreenCoordinates(player.gx, player.gy);
            this.renderer.addFloatingText(`+${heal} HP`, screen.x, screen.y - 15, '#22c55e');
          }
        }

        // Floating Damage Popup
        if (this.renderer) {
          const screen = this.getScreenCoordinates(monster.gx, monster.gy);
          const color = isCrit ? '#facc15' : '#ef4444';
          const text = isCrit ? `CRIT ${finalDamage}!` : `-${finalDamage}`;
          this.renderer.addFloatingText(text, screen.x, screen.y - 10, color);
        }

        // Broadcast Monster Damage to partner
        multiplayerManager.send({
          type: 'MONSTER_DAMAGE',
          monsterId: monster.id,
          damage: finalDamage,
        });

        // Check Monster Defeat
        if (monster.hp <= 0) {
          this.onMonsterDefeated(monster, player);
        }
      }
    });

    // Award Combat Skill XP
    if (hitCount > 0) {
      const skillLeveled = player.addSkillXp('Combat', 20);
      const playerLeveled = player.addXp(15);
      if (playerLeveled && this.renderer) {
        const screen = this.getScreenCoordinates(player.gx, player.gy);
        this.renderer.addFloatingText('LEVEL UP!', screen.x, screen.y - 30, '#a855f7');
      }
    }

    this.gameState.notify();
  }

  onMonsterDefeated(monster, player) {
    // Remove monster
    this.gameState.monsters = this.gameState.monsters.filter((m) => m.id !== monster.id);

    // Loot drops
    const goldDrop = monster.isBoss ? 250 : 25 + Math.floor(Math.random() * 20);
    player.gold += goldDrop;

    if (monster.isBoss) {
      player.addItem({ id: 'relic_blade_blueprint', name: 'Relic Blade Recipe', type: 'recipe', count: 1, rarity: 'LEGENDARY' });
      player.addItem({ id: 'ancient_essence', name: 'Ancient Core', type: 'material', count: 2, rarity: 'EPIC' });
    } else {
      player.addItem({ id: 'iron_ore', name: 'Iron Ore', type: 'material', count: 2, rarity: 'COMMON' });
    }

    if (this.renderer) {
      const screen = this.getScreenCoordinates(monster.gx, monster.gy);
      this.renderer.addFloatingText(`+${goldDrop} Gold!`, screen.x, screen.y, '#facc15');
    }

    this.gameState.saveProgress();
  }

  updateMonsterAI(dt, world) {
    const now = Date.now();
    const localP = this.gameState.localPlayer;
    if (!localP) return;

    this.gameState.monsters.forEach((monster) => {
      const distToP = Math.hypot(localP.gx - monster.gx, localP.gy - monster.gy);

      // Aggro Range = 6 tiles
      if (distToP <= 6 && distToP > 1.1) {
        // Move towards player
        if (Math.random() < 0.05) {
          const dx = Math.sign(localP.gx - monster.gx);
          const dy = Math.sign(localP.gy - monster.gy);
          const nextX = monster.gx + dx;
          const nextY = monster.gy + dy;
          if (world.isWalkable(nextX, nextY)) {
            monster.gx = nextX;
            monster.gy = nextY;
          }
        }
      } else if (distToP <= 1.2 && now - monster.lastAttackTime > 1500) {
        // Attack Player
        monster.lastAttackTime = now;
        const damage = Math.max(1, monster.attack - (localP.equipment?.armor?.defense || 0));
        localP.hp = Math.max(0, localP.hp - damage);

        if (this.renderer) {
          const screen = this.getScreenCoordinates(localP.gx, localP.gy);
          this.renderer.addFloatingText(`-${damage} HP`, screen.x, screen.y - 10, '#dc2626');
        }

        // Check Player Defeat & Respawn in Village
        if (localP.hp <= 0) {
          localP.hp = localP.maxHp;
          localP.gx = 10;
          localP.gy = 10;
          if (this.renderer) {
            const screen = this.getScreenCoordinates(10, 10);
            this.renderer.addFloatingText('RESPAWNED AT VILLAGE', screen.x, screen.y - 20, '#facc15');
          }
        }

        this.gameState.notify();
      }
    });
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
