import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [portfolioData, setPortfolioData] = useState(getStoredPortfolio);
  const [editMode, setEditMode] = useState(false);

  // Modal States
  const [activePreviewProject, setActivePreviewProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Persist changes on state update
  useEffect(() => {
    saveStoredPortfolio(portfolioData);
  }, [portfolioData]);

  // Project CRUD operations
  const handleSaveProject = (projectData) => {
    setPortfolioData((prev) => {
      const existingIndex = prev.projects.findIndex((p) => p.id === projectData.id);
      let updatedProjects;
      if (existingIndex >= 0) {
        updatedProjects = [...prev.projects];
        updatedProjects[existingIndex] = projectData;
      } else {
        updatedProjects = [projectData, ...prev.projects];
      }
      return { ...prev, projects: updatedProjects };
    });
  };

  const handleDeleteProject = (projectId) => {
    if (window.confirm("Are you sure you want to remove this project?")) {
      setPortfolioData((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== projectId)
      }));
    }
  };

  // Profile Save
  const handleSaveProfile = (updatedProfile) => {
    setPortfolioData((prev) => ({
      ...prev,
      profile: updatedProfile
    }));
  };

  // Export Portfolio JSON Backup
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolioData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Portfolio JSON Backup
  const handleImportData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.profile && importedData.projects) {
          setPortfolioData(importedData);
          alert("Portfolio imported successfully!");
        } else {
          alert("Invalid portfolio file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Reset Demo Data
  const handleResetData = () => {
    if (window.confirm("Reset portfolio to initial demo data? All local changes will be restored.")) {
      const defaultData = resetPortfolioToDefault();
      setPortfolioData(defaultData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header / Navbar */}
      <Navbar
        profile={portfolioData.profile}
        editMode={editMode}
        setEditMode={setEditMode}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {/* Main Portfolio Sections */}
      <main className="flex-1">
        <Hero
          profile={portfolioData.profile}
          editMode={editMode}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />

        <ProjectsShowcase
          projects={portfolioData.projects}
          editMode={editMode}
          onOpenPreview={(project) => setActivePreviewProject(project)}
          onOpenAddModal={() => {
            setProjectToEdit(null);
            setIsProjectModalOpen(true);
          }}
          onOpenEditModal={(project) => {
            setProjectToEdit(project);
            setIsProjectModalOpen(true);
          }}
          onDeleteProject={handleDeleteProject}
        />

        <Skills skills={portfolioData.skills} />

        <Services
          services={portfolioData.services}
          testimonials={portfolioData.testimonials}
        />

        <Contact profile={portfolioData.profile} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-2">
          <p>© {new Date().getFullYear()} {portfolioData.profile.name}. All rights reserved.</p>
          <p>Professional Client Portfolio & Dynamic Showcase Builder.</p>
        </div>
      </footer>

      {/* Modals */}
      {activePreviewProject && (
        <PreviewModal
          project={activePreviewProject}
          onClose={() => setActivePreviewProject(null)}
        />
      )}

      {isProjectModalOpen && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setProjectToEdit(null);
          }}
          onSave={handleSaveProject}
          projectToEdit={projectToEdit}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={portfolioData.profile}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
