/**
 * Main Isometric Game Canvas Component
 * Manages canvas lifecycle, rendering loop, keyboard inputs,
 * combat AI ticks, and viewport responsiveness.
 */

import React, { useRef, useEffect } from 'react';
import { IsometricRenderer } from '../game/renderer';
import { WorldMap } from '../game/world';
import { gameState } from '../game/gameState';
import { CombatEngine } from '../game/combat';
import { FarmingEngine } from '../game/farming';

export default function GameCanvas({ onRendererReady, isLowEndPreset }) {
  const canvasRef = useRef(null);
  const worldRef = useRef(new WorldMap(32, 32));
  const rendererRef = useRef(null);
  const combatRef = useRef(null);
  const farmingRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set Canvas Dimensions
    const updateCanvasSize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Initialize Renderer & Game Subsystems
    const renderer = new IsometricRenderer(canvas);
    if (isLowEndPreset) renderer.setPreset('LOW');
    rendererRef.current = renderer;

    const combat = new CombatEngine(gameState, renderer);
    combatRef.current = combat;

    const farming = new FarmingEngine(gameState, worldRef.current, renderer);
    farmingRef.current = farming;

    if (onRendererReady) onRendererReady(renderer, combat, farming, worldRef.current);

    // Initialize Game State
    gameState.init(worldRef.current);

    // Keyboard Input Handling
    const handleKeyDown = (e) => {
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      const key = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(key)) gameState.movePlayer(0, -1, worldRef.current);
      if (['s', 'arrowdown'].includes(key)) gameState.movePlayer(0, 1, worldRef.current);
      if (['a', 'arrowleft'].includes(key)) gameState.movePlayer(-1, 0, worldRef.current);
      if (['d', 'arrowright'].includes(key)) gameState.movePlayer(1, 0, worldRef.current);
      if (key === ' ') {
        e.preventDefault();
        combat.playerAttack(gameState.localPlayer, worldRef.current);
      }
      if (key === 'f') {
        farming.interactFarm(gameState.localPlayer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Main Render Loop
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update world time & crop growth
      worldRef.current.update(dt);

      // Update Monster AI
      combat.updateMonsterAI(dt, worldRef.current);

      // Render 2.5D Isometric World
      renderer.renderWorld(
        worldRef.current,
        gameState.localPlayer,
        gameState.remotePlayer,
        gameState.monsters,
        now / 1000
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLowEndPreset]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
    </div>
  );
}
