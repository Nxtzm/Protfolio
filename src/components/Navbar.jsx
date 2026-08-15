import React, { useRef } from 'react';
import { Briefcase, Download, Upload, RotateCcw, Settings, Eye, Check, ExternalLink } from 'lucide-react';

export default function Navbar({
  profile,
  editMode,
  setEditMode,
  onOpenProfileModal,
  onExportData,
  onImportData,
  onResetData
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportData(file);
    }
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        {/* Brand & Availability Status */}
        <div className="flex items-center space-x-4">
          <a href="#" className="text-xl font-bold tracking-tight text-white flex items-center gap-2 group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              {profile.name ? profile.name.charAt(0) : 'P'}
            </span>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold leading-tight">{profile.name}</span>
              <span className="text-xs text-slate-400 font-normal">Portfolio Showcase</span>
            </div>
          </a>

          {profile.availableForHire && (
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
              Available for work
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a href="#projects" className="hover:text-indigo-400 transition-colors">Projects & Websites</a>
          <a href="#skills" className="hover:text-indigo-400 transition-colors">About & Skills</a>
          <a href="#services" className="hover:text-indigo-400 transition-colors">Services</a>
          <a href="#contact" className="hover:text-indigo-400 transition-colors">Contact</a>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Edit Mode Toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              editMode
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Toggle Portfolio Edit Mode"
          >
            {editMode ? <Eye className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            <span>{editMode ? 'Preview Client View' : 'Manage Portfolio'}</span>
          </button>

          {/* Data Controls in Edit Mode */}
          {editMode && (
            <div className="hidden sm:flex items-center space-x-2 border-l border-slate-800 pl-3">
              <button
                onClick={onOpenProfileModal}
                className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                title="Edit Profile Information"
              >
                Edit Profile
              </button>

              <button
                onClick={onExportData}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                title="Export Portfolio JSON Backup"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                title="Import Portfolio Data from JSON"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />

              <button
                onClick={onResetData}
                className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                title="Reset Portfolio to Default Demo Data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          <a
            href="#contact"
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" />
            <span>Hire Me</span>
          </a>
        </div>

      </div>
    </header>
  );
}
