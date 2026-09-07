/**
 * 2.5D Isometric HTML5 Canvas Renderer Engine
 * Highly optimized for low-end hardware (Intel i3, 4GB RAM).
 * Features FMV-inspired visual presentation, viewport culling, dynamic depth sorting,
 * frame rate limiting, procedural tile/entity generation, and floating UI FX.
 */

import { TILE_WIDTH, TILE_HEIGHT, TILE_TYPES, gridToIso, isoToGrid, GRAPHICS_PRESETS } from './constants';

export class IsometricRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.preset = GRAPHICS_PRESETS.LOW; // Default low-end hardware preset
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.animationFrameId = null;
    this.lastFrameTime = performance.now();
    this.fpsCount = 0;
    this.currentFps = 60;
    this.fpsTimer = performance.now();
    this.floatingTexts = [];
  }

  setPreset(presetKey) {
    if (GRAPHICS_PRESETS[presetKey]) {
      this.preset = GRAPHICS_PRESETS[presetKey];
    }
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    if (this.floatingTexts.length > this.preset.maxParticles) return;
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0,
      life: 1.0,
    });
  }

  updateAndDrawFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 20 * dt;
      ft.life -= dt * 1.5;
      ft.alpha = Math.max(0, ft.life);

      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillStyle = ft.color;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(ft.text, ft.x, ft.y);
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  clear() {
    this.ctx.fillStyle = '#0f172a'; // Dark ambient theme background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderWorld(world, player1, player2, entities, time) {
    this.clear();

    const originX = this.canvas.width / 2 + this.camera.x;
    const originY = this.canvas.height / 3 + this.camera.y;

    // Viewport Culling Bounds
    const margin = 200;
    const viewLeft = -originX - margin;
    const viewRight = this.canvas.width - originX + margin;
    const viewTop = -originY - margin;
    const viewBottom = this.canvas.height - originY + margin;

    // 1. Draw Map Tiles
    for (let gy = 0; gy < world.height; gy++) {
      for (let gx = 0; gx < world.width; gx++) {
        const isoPos = gridToIso(gx, gy, originX, originY);
        if (isoPos.x < viewLeft || isoPos.x > viewRight || isoPos.y < viewTop || isoPos.y > viewBottom) {
          continue; // Cull invisible tiles
        }

        const tileType = world.getTile(gx, gy);
        this.drawTile(isoPos.x, isoPos.y, tileType, gx, gy, time);
      }
    }

    // 2. Depth Sorting Entities & Objects (Trees, Crops, Monsters, Players)
    const drawables = [];

    // Add crops and structures
    if (world.crops) {
      world.crops.forEach((crop) => {
        const iso = gridToIso(crop.gx, crop.gy, originX, originY);
        drawables.push({
          depth: crop.gx + crop.gy + 0.1,
          draw: () => this.drawCrop(iso.x, iso.y, crop, time),
        });
      });
    }

    // Add trees & environment features
    if (world.objects) {
      world.objects.forEach((obj) => {
        const iso = gridToIso(obj.gx, obj.gy, originX, originY);
        drawables.push({
          depth: obj.gx + obj.gy + 0.2,
          draw: () => this.drawWorldObject(iso.x, iso.y, obj, time),
        });
      });
    }

    // Add monsters / entities
    entities.forEach((entity) => {
      const iso = gridToIso(entity.gx, entity.gy, originX, originY);
      drawables.push({
        depth: entity.gx + entity.gy + 0.5,
        draw: () => this.drawEntity(iso.x, iso.y, entity, time),
      });
    });

    // Add Player 1
    if (player1) {
      const isoP1 = gridToIso(player1.gx, player1.gy, originX, originY);
      drawables.push({
        depth: player1.gx + player1.gy + 0.6,
        draw: () => this.drawPlayer(isoP1.x, isoP1.y, player1, '#3b82f6', 'Player 1', time),
      });
    }

    // Add Player 2
    if (player2) {
      const isoP2 = gridToIso(player2.gx, player2.gy, originX, originY);
      drawables.push({
        depth: player2.gx + player2.gy + 0.6,
        draw: () => this.drawPlayer(isoP2.x, isoP2.y, player2, '#eab308', 'Player 2', time),
      });
    }

    // Sort by isometric Y depth
    drawables.sort((a, b) => a.depth - b.depth);

    // Render sorted entities
    drawables.forEach((item) => item.draw());

    // 3. Day/Night Overlay Lighting (if enabled)
    if (this.preset.enableDayNightLighting && world.timeOfDay !== undefined) {
      this.drawDayNightFilter(world.timeOfDay);
    }

    // 4. Draw Floating Texts
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.updateAndDrawFloatingTexts(dt);
  }

  drawTile(x, y, tileType, gx, gy, time) {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y - hh);
    this.ctx.lineTo(x + hw, y);
    this.ctx.lineTo(x, y + hh);
    this.ctx.lineTo(x - hw, y);
    this.ctx.closePath();

    // Color choices inspired by Farm Merge Valley vibrant palette
    switch (tileType) {
      case TILE_TYPES.GRASS:
        this.ctx.fillStyle = (gx + gy) % 2 === 0 ? '#4ade80' : '#22c55e';
        break;
      case TILE_TYPES.TILLED:
        this.ctx.fillStyle = '#854d0e';
        break;
      case TILE_TYPES.WATER:
        const ripple = Math.sin(time * 2 + gx + gy) * 10;
        this.ctx.fillStyle = `rgb(38, 140, ${220 + ripple})`;
        break;
      case TILE_TYPES.STONE_PATH:
        this.ctx.fillStyle = '#64748b';
        break;
      case TILE_TYPES.WOOD_FLOOR:
        this.ctx.fillStyle = '#a16207';
        break;
      case TILE_TYPES.SAND:
        this.ctx.fillStyle = '#fde047';
        break;
      case TILE_TYPES.SNOW:
        this.ctx.fillStyle = '#f1f5f9';
        break;
      case TILE_TYPES.LAVA:
        this.ctx.fillStyle = '#ef4444';
        break;
      default:
        this.ctx.fillStyle = '#334155';
    }

    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    this.ctx.stroke();
  }

  drawCrop(x, y, crop, time) {
    const sway = Math.sin(time * 3 + crop.gx) * 2;
    this.ctx.save();
    this.ctx.translate(x + sway, y);

    if (crop.stage === 0) {
      // Seed mound
      this.ctx.fillStyle = '#713f12';
      this.ctx.beginPath();
      this.ctx.arc(0, -2, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (crop.stage === 1) {
      // Sprout
      this.ctx.fillStyle = '#86efac';
      this.ctx.fillRect(-2, -10, 4, 10);
    } else {
      // Fully grown crop (e.g. golden wheat / magical plant)
      this.ctx.fillStyle = crop.type === 'wheat' ? '#facc15' : crop.type === 'berry' ? '#ec4899' : '#a855f7';
      this.ctx.beginPath();
      this.ctx.arc(0, -14, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#16a34a';
      this.ctx.fillRect(-2, -8, 4, 8);
    }

    this.ctx.restore();
  }

  drawWorldObject(x, y, obj, time) {
    if (obj.type === 'tree') {
      const sway = Math.sin(time * 2 + obj.gx) * 3;
      // Shadow
      if (this.preset.enableShadows) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Trunk
      this.ctx.fillStyle = '#78350f';
      this.ctx.fillRect(x - 3, y - 18, 6, 18);

      // Foliage
      this.ctx.fillStyle = '#15803d';
      this.ctx.beginPath();
      this.ctx.arc(x + sway, y - 28, 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#22c55e';
      this.ctx.beginPath();
      this.ctx.arc(x + sway - 3, y - 32, 11, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (obj.type === 'rock') {
      this.ctx.fillStyle = '#64748b';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 6, 10, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (obj.type === 'house') {
      // Cottage structure
      this.ctx.fillStyle = '#b45309';
      this.ctx.fillRect(x - 20, y - 35, 40, 30);
      // Roof
      this.ctx.fillStyle = '#dc2626';
      this.ctx.beginPath();
      this.ctx.moveTo(x - 24, y - 35);
      this.ctx.lineTo(x, y - 55);
      this.ctx.lineTo(x + 24, y - 35);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  drawPlayer(x, y, player, color, label, time) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // Shadow
    if (this.preset.enableShadows) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Walking animation bobbing
    const bob = player.isMoving ? Math.sin(time * 12) * 3 : 0;

    // Body
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(0, -16 + bob, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.fillStyle = '#fde047';
    this.ctx.beginPath();
    this.ctx.arc(0, -28 + bob, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // Weapon overlay if swinging
    if (player.isAttacking) {
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(8, -18, 14, -Math.PI / 4, Math.PI / 2);
      this.ctx.stroke();
    }

    // Name Label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, 0, -38 + bob);

    // HP Bar
    if (player.hp !== undefined && player.maxHp) {
      const hpWidth = 24;
      const hpPct = Math.max(0, player.hp / player.maxHp);
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(-hpWidth / 2, -35 + bob, hpWidth, 4);
      this.ctx.fillStyle = '#22c55e';
      this.ctx.fillRect(-hpWidth / 2, -35 + bob, hpWidth * hpPct, 4);
    }

    this.ctx.restore();
  }

  drawEntity(x, y, entity, time) {
    this.ctx.save();
    this.ctx.translate(x, y);

    const bob = Math.sin(time * 6 + entity.gx) * 2;

    if (entity.isBoss) {
      // Boss monster
      this.ctx.fillStyle = '#9333ea';
      this.ctx.beginPath();
      this.ctx.arc(0, -22 + bob, 18, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillRect(-8, -36 + bob, 16, 5); // Boss Crown
    } else {
      // Normal monster (e.g., Forest Beast / Shadow Golem)
      this.ctx.fillStyle = entity.color || '#ea580c';
      this.ctx.beginPath();
      this.ctx.arc(0, -14 + bob, 9, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Name & HP Bar
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(entity.name, 0, -30 + bob);

    if (entity.hp && entity.maxHp) {
      const hpWidth = 20;
      const hpPct = Math.max(0, entity.hp / entity.maxHp);
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(-hpWidth / 2, -26 + bob, hpWidth, 3);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(-hpWidth / 2, -26 + bob, hpWidth * hpPct, 3);
    }

    this.ctx.restore();
  }

  drawDayNightFilter(timeOfDay) {
    // 0 = Noon, 0.5 = Dusk, 0.75 = Midnight, 1.0 = Dawn
    const nightAlpha = Math.sin(timeOfDay * Math.PI * 2) * 0.4 + 0.1;
    if (nightAlpha > 0.05) {
      this.ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.5, Math.max(0, nightAlpha))})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
