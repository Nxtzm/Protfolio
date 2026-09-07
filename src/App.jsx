import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProjectsShowcase from './components/ProjectsShowcase';
import PreviewModal from './components/PreviewModal';
import Skills from './components/Skills';
import Services from './components/Services';
import Contact from './components/Contact';
import ProjectModal from './components/ProjectModal';
import ProfileModal from './components/ProfileModal';

import {
  getStoredPortfolio,
  saveStoredPortfolio,
  resetPortfolioToDefault
} from './data/portfolioData';

import { Gamepad2, Layout } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState('game'); // 'game' or 'portfolio'
  const [isLowEnd, setIsLowEnd] = useState(true);
  const [combatRef, setCombatRef] = useState(null);
  const [farmingRef, setFarmingRef] = useState(null);
  const [worldRef, setWorldRef] = useState(null);

  // Portfolio State
  const [portfolioData, setPortfolioData] = useState(getStoredPortfolio);
  const [editMode, setEditMode] = useState(false);
  const [activePreviewProject, setActivePreviewProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleRendererReady = (renderer, combat, farming, world) => {
    setCombatRef(combat);
    setFarmingRef(farming);
    setWorldRef(world);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* GLOBAL VIEW SWITCHER HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm tracking-wider text-yellow-400">VALIANT HAVEN</span>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            2-PLAYER CO-OP RPG
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('game')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'game' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 size={16} /> Play 2P Game
          </button>
          <button
            onClick={() => setViewMode('portfolio')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'portfolio' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout size={16} /> Showcase Portfolio
          </button>
        </div>
      </header>

      {/* VIEW CONTENT */}
      {viewMode === 'game' ? (
        <div className="relative flex-1 w-full h-full">
          <GameCanvas onRendererReady={handleRendererReady} isLowEndPreset={isLowEnd} />
          <GameUI
            combat={combatRef}
            farming={farmingRef}
            world={worldRef}
            isLowEnd={isLowEnd}
            setIsLowEnd={setIsLowEnd}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <Navbar
            profile={portfolioData.profile}
            editMode={editMode}
            setEditMode={setEditMode}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onExportData={() => {}}
            onImportData={() => {}}
            onResetData={() => {}}
          />
          <main>
            <Hero profile={portfolioData.profile} editMode={editMode} onOpenProfileModal={() => setIsProfileModalOpen(true)} />
            <ProjectsShowcase projects={portfolioData.projects} editMode={editMode} onOpenPreview={(p) => setActivePreviewProject(p)} onOpenAddModal={() => { setProjectToEdit(null); setIsProjectModalOpen(true); }} onOpenEditModal={(p) => { setProjectToEdit(p); setIsProjectModalOpen(true); }} onDeleteProject={() => {}} />
            <Skills skills={portfolioData.skills} />
            <Services services={portfolioData.services} testimonials={portfolioData.testimonials} />
            <Contact profile={portfolioData.profile} />
          </main>
        </div>
      )}
    </div>
  );
}
