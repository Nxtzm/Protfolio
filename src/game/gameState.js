/**
 * Game State Manager
 * Authoritative game state handling, player movement, input polling,
 * persistence auto-sync, multiplayer coordination, and Samosa Bot prefix ("Sam") command processing.
 */

import { Player, Monster, NPC } from './entities';
import { multiplayerManager } from '../services/multiplayer';
import { discordService } from '../services/discordSdk';
import { serverPersistence } from '../services/serverPersistence';

export class GameStateManager {
  constructor() {
    this.localPlayer = null;
    this.remotePlayer = null;
    this.monsters = [];
    this.npcs = [];
    this.activeZone = 'VALIANT_VILLAGE';
    this.listeners = new Set();
    this.chatLog = [];
    this.samosaLog = [];
  }

  async init(worldInstance) {
    const user = await discordService.initialize();
    const slot = user.playerSlot || (user.isHost ? 1 : 2);

    // Check for saved progress to prevent any loss
    const saved = serverPersistence.loadPlayerProgress(user.id);
    if (saved && saved.player) {
      this.localPlayer = new Player(user.id, saved.player.name || user.username, slot);
      Object.assign(this.localPlayer, saved.player);
    } else {
      this.localPlayer = new Player(user.id, user.username, slot);
    }

    // Start auto-save every 10 seconds
    serverPersistence.startAutoSave(
      user.id,
      () => this.localPlayer,
      () => ({ crops: worldInstance ? worldInstance.crops : [] })
    );

    // Initialize multiplayer connection
    multiplayerManager.init(user.id, discordService.getInstanceId());
    multiplayerManager.subscribe((msg) => this.handleMultiplayerMessage(msg));

    // Spawn default village NPCs
    this.npcs = [
      new NPC('npc_elder', 'Elder Elion', 'Village Sage', 8, 8, [
        'Welcome, young heroes, to Valiant Village!',
        'A mysterious shadow creeps from the Eastern Dungeon.',
        'Work together: one of you farm and craft while the other smites the beasts!',
      ]),
      new NPC('npc_smith', 'Blacksmith Kael', 'Master Smith', 14, 8, [
        'Bring me iron ores from the mines and wood from the forest to craft glorious arms!',
      ], [
        { id: 'iron_shortsword', name: 'Iron Shortsword', cost: 100, attack: 12 },
        { id: 'reinforced_shield', name: 'Knight Shield', cost: 150, defense: 8 },
        { id: 'farmer_scythe', name: 'Harvest Scythe', cost: 80, farmingBonus: 1.5 },
      ]),
    ];

    // Spawn initial monsters in forest edge
    this.monsters = [
      new Monster('m_1', 'Corrupted Sprite', 18, 12, 40, 8, '#3b82f6'),
      new Monster('m_2', 'Gloom Shadow', 20, 15, 60, 12, '#8b5cf6'),
      new Monster('boss_1', 'Valiant Guardian', 25, 22, 250, 22, '#ef4444', true),
    ];

    this.addSamosaLog('Samosa Bot Active! Type "sam help" or use the Samosa panel.');
    this.notify();
  }

  saveProgress(worldInstance) {
    if (this.localPlayer) {
      serverPersistence.savePlayerProgress(this.localPlayer.id, this.localPlayer, {
        crops: worldInstance ? worldInstance.crops : [],
      });
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach((cb) => cb());
  }

  handleMultiplayerMessage(msg) {
    if (msg.type === 'PLAYER_UPDATE' && msg.payload) {
      if (!this.remotePlayer) {
        this.remotePlayer = new Player(msg.senderId, msg.payload.name, msg.payload.slot);
      }
      Object.assign(this.remotePlayer, msg.payload);
      this.notify();
    } else if (msg.type === 'MONSTER_DAMAGE') {
      const target = this.monsters.find((m) => m.id === msg.monsterId);
      if (target) {
        target.hp -= msg.damage;
        if (target.hp <= 0) {
          this.monsters = this.monsters.filter((m) => m.id !== target.id);
        }
      }
      this.notify();
    } else if (msg.type === 'SAMOSA_CMD') {
      this.executeSamosaCommand(msg.command, false);
    }
  }

  movePlayer(dx, dy, world) {
    if (!this.localPlayer) return;
    const nextGx = Math.max(0, Math.min(world.width - 1, this.localPlayer.gx + dx));
    const nextGy = Math.max(0, Math.min(world.height - 1, this.localPlayer.gy + dy));

    // Collision check
    if (!world.isWalkable(nextGx, nextGy)) return;

    this.localPlayer.gx = nextGx;
    this.localPlayer.gy = nextGy;
    this.localPlayer.isMoving = true;

    // Broadcast position update
    multiplayerManager.send({
      type: 'PLAYER_UPDATE',
      payload: {
        id: this.localPlayer.id,
        name: this.localPlayer.name,
        slot: this.localPlayer.slot,
        gx: this.localPlayer.gx,
        gy: this.localPlayer.gy,
        hp: this.localPlayer.hp,
        maxHp: this.localPlayer.maxHp,
        isMoving: true,
        facing: this.localPlayer.facing,
      },
    });

    this.notify();
  }

  // Samosa Bot Command Handler (Supports case-insensitive "Sam" prefix)
  executeSamosaCommand(inputStr, broadcast = true) {
    if (!inputStr) return;
    const trimmed = inputStr.trim();

    // Check for "sam" prefix (case-insensitive)
    if (!trimmed.toLowerCase().startsWith('sam')) {
      return;
    }

    const args = trimmed.split(/\s+/);
    const cmd = (args[1] || 'help').toLowerCase();

    let response = '';

    switch (cmd) {
      case 'help':
        response = '[SAMOSA BOT] Commands: sam status | sam givegold <amt> | sam spawn <monster> | sam heal | sam save';
        break;
      case 'status':
        response = `[SAMOSA BOT] Hero: ${this.localPlayer.name} | Lvl: ${this.localPlayer.level} | HP: ${this.localPlayer.hp}/${this.localPlayer.maxHp} | Gold: ${this.localPlayer.gold}`;
        break;
      case 'givegold':
        const amt = parseInt(args[2], 10) || 100;
        this.localPlayer.gold += amt;
        this.saveProgress();
        response = `[SAMOSA BOT] Granted ${amt} Gold to ${this.localPlayer.name}! Progress Saved.`;
        break;
      case 'heal':
        this.localPlayer.hp = this.localPlayer.maxHp;
        this.localPlayer.stamina = this.localPlayer.maxStamina;
        response = `[SAMOSA BOT] Fully restored HP and Stamina!`;
        break;
      case 'save':
        this.saveProgress();
        response = `[SAMOSA BOT] Progress explicitly saved to host/local storage!`;
        break;
      case 'spawn':
        const mName = args[2] || 'Shadow Beast';
        const newM = new Monster(
          'm_' + Date.now(),
          mName,
          this.localPlayer.gx + 2,
          this.localPlayer.gy + 2,
          50,
          10,
          '#10b981'
        );
        this.monsters.push(newM);
        response = `[SAMOSA BOT] Spawned ${mName} near coordinates (${newM.gx}, ${newM.gy})!`;
        break;
      default:
        response = `[SAMOSA BOT] Unknown Samosa command: "${cmd}". Type "sam help" for command list.`;
    }

    this.addSamosaLog(response);

    if (broadcast) {
      multiplayerManager.send({
        type: 'SAMOSA_CMD',
        command: inputStr,
      });
    }

    this.notify();
  }

  addSamosaLog(text) {
    this.samosaLog.unshift({ text, id: Date.now() });
    if (this.samosaLog.length > 20) this.samosaLog.pop();
  }
}

export const gameState = new GameStateManager();
