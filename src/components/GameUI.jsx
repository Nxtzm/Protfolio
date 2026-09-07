/**
 * FMV-Inspired Graphical User Interface (UI) Component
 * Provides HUD overlay, Health/Mana/Stamina bars, Skills tree, Crafting workshop,
 * Inventory management, Samosa Bot prefix command console, and Low-End Performance controls.
 */

import React, { useState, useEffect } from 'react';
import { gameState } from '../game/gameState';
import { CRAFTING_RECIPES, CraftingEngine } from '../game/crafting';
import { EconomyEngine } from '../game/economy';
import {
  Swords,
  Sprout,
  Hammer,
  Backpack,
  Terminal,
  Settings,
  Shield,
  Zap,
  Coins,
  Sparkles,
  Users,
  Save,
  Activity,
} from 'lucide-react';

export default function GameUI({ combat, farming, world, isLowEnd, setIsLowEnd }) {
  const [player, setPlayer] = useState(gameState.localPlayer);
  const [remotePlayer, setRemotePlayer] = useState(gameState.remotePlayer);
  const [activeTab, setActiveTab] = useState(null); // 'inventory', 'skills', 'crafting', 'samosa', 'settings'
  const [samosaInput, setSamosaInput] = useState('');
  const [fps, setFps] = useState(60);
  const [saveMessage, setSaveMessage] = useState('');

  const craftingEngine = new CraftingEngine(gameState);
  const economyEngine = new EconomyEngine(gameState);

  useEffect(() => {
    const unsubscribe = gameState.subscribe(() => {
      setPlayer({ ...gameState.localPlayer });
      setRemotePlayer(gameState.remotePlayer ? { ...gameState.remotePlayer } : null);
    });

    // FPS Meter Loop
    let frameCount = 0;
    let lastFpsTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
      frameCount = 0;
      lastFpsTime = now;
    }, 1000);

    const countFrame = () => {
      frameCount++;
      requestAnimationFrame(countFrame);
    };
    const animId = requestAnimationFrame(countFrame);

    return () => {
      unsubscribe();
      clearInterval(interval);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSamosaSubmit = (e) => {
    e.preventDefault();
    if (!samosaInput) return;
    gameState.executeSamosaCommand(samosaInput);
    setSamosaInput('');
  };

  const handleManualSave = () => {
    gameState.saveProgress(world);
    setSaveMessage('Progress Saved!');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  if (!player) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans text-slate-100">
      {/* TOP BAR: HUD & CO-OP STATUS */}
      <div className="flex justify-between items-start w-full">
        {/* Player 1 HUD Card */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex items-center gap-4 min-w-[280px]">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-inner border border-blue-400">
            {player.level}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs font-bold tracking-wide">
              <span className="text-blue-400">{player.name} (P{player.slot})</span>
              <span className="text-yellow-400 flex items-center gap-1">
                <Coins size={12} /> {player.gold}
              </span>
            </div>
            {/* HP Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
              />
            </div>
            {/* XP Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all duration-300"
                style={{ width: `${Math.max(0, (player.xp / player.xpToNextLevel) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Co-op Partner Status Card */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-2xl p-3 shadow-xl flex items-center gap-3">
          <Users size={18} className={remotePlayer ? 'text-emerald-400' : 'text-slate-500'} />
          <div className="text-xs">
            <div className="font-bold text-slate-200">
              {remotePlayer ? remotePlayer.name : 'Waiting for P2...'}
            </div>
            <div className="text-[10px] text-slate-400">
              {remotePlayer ? `Lvl ${remotePlayer.level} Co-op Partner` : 'Share room link to play co-op'}
            </div>
          </div>
        </div>

        {/* Quick Save & Settings Panel */}
        <div className="pointer-events-auto flex items-center gap-2">
          {saveMessage && (
            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg animate-fade-in">
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleManualSave}
            className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Save Game Progress"
          >
            <Save size={16} /> Save
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? null : 'settings')}
            className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 shadow-md transition-all active:scale-95"
            title="Performance Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* CENTER POPUP MODALS */}
      {activeTab && (
        <div className="pointer-events-auto self-center bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[75vh] overflow-y-auto z-50">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-lg font-black tracking-wide capitalize flex items-center gap-2 text-yellow-400">
              {activeTab === 'inventory' && <Backpack size={20} />}
              {activeTab === 'skills' && <Sparkles size={20} />}
              {activeTab === 'crafting' && <Hammer size={20} />}
              {activeTab === 'samosa' && <Terminal size={20} />}
              {activeTab === 'settings' && <Activity size={20} />}
              {activeTab} Panel
            </h3>
            <button
              onClick={() => setActiveTab(null)}
              className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 px-2.5 py-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-medium">Equipped Weapon: <span className="text-emerald-400 font-bold">{player.equipment.weapon.name} (+{player.equipment.weapon.attack} ATK)</span></div>
              <div className="grid grid-cols-2 gap-2.5">
                {player.inventory.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{item.type} (x{item.count})</div>
                    </div>
                    {item.type === 'weapon' && (
                      <button
                        onClick={() => {
                          player.equipment.weapon = item;
                          gameState.notify();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2 py-1 rounded-lg"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SKILLS TAB */}
          {activeTab === 'skills' && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(player.skills).map(([skillName, s]) => (
                <div key={skillName} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-200">{skillName}</span>
                    <span className="text-yellow-400">Lvl {s.level}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${(s.xp / (s.level * 50)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CRAFTING TAB */}
          {activeTab === 'crafting' && (
            <div className="space-y-3">
              {CRAFTING_RECIPES.map((recipe) => {
                const canCraft = craftingEngine.canCraft(player, recipe);
                return (
                  <div key={recipe.id} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-200">{recipe.name}</div>
                      <div className="text-xs text-slate-400">{recipe.profession} (Lvl {recipe.skillLevel})</div>
                    </div>
                    <button
                      disabled={!canCraft}
                      onClick={() => craftingEngine.craftItem(player, recipe)}
                      className={`font-bold text-xs px-3 py-1.5 rounded-xl transition-all ${
                        canCraft ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Craft
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* SAMOSA BOT CONSOLE TAB */}
          {activeTab === 'samosa' && (
            <div className="space-y-3">
              <form onSubmit={handleSamosaSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={samosaInput}
                  onChange={(e) => setSamosaInput(e.target.value)}
                  placeholder="Type 'sam help', 'sam status', 'sam givegold 100'..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-400"
                />
                <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-3 rounded-xl">
                  Send
                </button>
              </form>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono text-emerald-400">
                {gameState.samosaLog.map((log) => (
                  <div key={log.id}>{log.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* PERFORMANCE SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl">
                <div>
                  <div className="font-bold text-slate-200">Low-End PC Hardware Mode</div>
                  <div className="text-[10px] text-slate-400">Caps FPS to 30, disables shadows & light FX for 4GB RAM PCs.</div>
                </div>
                <button
                  onClick={() => setIsLowEnd(!isLowEnd)}
                  className={`font-bold px-3 py-1.5 rounded-xl text-xs ${isLowEnd ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  {isLowEnd ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl font-mono text-slate-300 space-y-1">
                <div>Current FPS: <span className="text-yellow-400 font-bold">{fps}</span></div>
                <div>Server Sync: <span className="text-emerald-400">Active</span></div>
                <div>Storage Mode: Local & Server Auto-Sync</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM ACTION HOTBAR */}
      <div className="pointer-events-auto self-center bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <button
          onClick={() => combat && combat.playerAttack(player, world)}
          className="bg-red-600/90 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
        >
          <Swords size={16} /> Attack (Space)
        </button>
        <button
          onClick={() => farming && farming.interactFarm(player)}
          className="bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
        >
          <Sprout size={16} /> Farm / Harvest (F)
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => setActiveTab(activeTab === 'inventory' ? null : 'inventory')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-bold"
          title="Inventory"
        >
          <Backpack size={16} />
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'skills' ? null : 'skills')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-bold"
          title="Skills Tree"
        >
          <Sparkles size={16} />
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'crafting' ? null : 'crafting')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-bold"
          title="Crafting Workshop"
        >
          <Hammer size={16} />
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'samosa' ? null : 'samosa')}
          className="bg-yellow-600/90 hover:bg-yellow-500 text-slate-950 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1"
          title="Samosa Bot Console"
        >
          <Terminal size={16} /> Sam
        </button>
      </div>
    </div>
  );
}
