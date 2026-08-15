import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Eye, Plus, Edit2, Trash2, Tag, Layout } from 'lucide-react';

export default function ProjectsShowcase({
  projects,
  editMode,
  onOpenPreview,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteProject
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique categories dynamically
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(projects.map((p) => p.category))];
    return cats;
  }, [projects]);

  // Filter projects by category and search term
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesCategory =
        selectedCategory === 'All' || project.category === selectedCategory;
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.tags && project.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [projects, selectedCategory, searchQuery]);

  return (
    <section id="projects" className="py-20 bg-slate-950 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-3">
              <Layout className="w-3.5 h-3.5" />
              <span>Live Website Gallery</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
              Featured Client Projects & Websites
            </h2>
            <p className="mt-2 text-slate-400 max-w-2xl text-sm sm:text-base">
              Explore live websites, web applications, and digital experiences created for clients with interactive live previews.
            </p>
          </div>

          {/* Add New Project Button (Edit Mode) */}
          {editMode && (
            <button
              onClick={onOpenAddModal}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Website Project</span>
            </button>
          )}
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-10">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-850'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
            <Layout className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Projects Found</h3>
            <p className="text-slate-400 text-sm">
              Try resetting your filter or search query to see available website projects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group relative rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 flex flex-col overflow-hidden shadow-xl"
              >
                {/* Image & Preview Overlay */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={project.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800";
                    }}
                  />

                  {/* Category Tag */}
                  <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    {project.category}
                  </span>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button
                      onClick={() => onOpenPreview(project)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Live Preview</span>
                    </button>

                    <a
                      href={project.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Visit Link</span>
                    </a>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading font-bold text-xl text-white group-hover:text-indigo-400 transition-colors">
                        {project.title}
                      </h3>

                      {/* Manage Actions in Edit Mode */}
                      {editMode && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => onOpenEditModal(project)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Project Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProject(project.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  </div>

                  {/* Tech Stack Tags */}
                  <div className="pt-6 border-t border-slate-800/80 mt-6 flex flex-wrap gap-1.5">
                    {project.tags && project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
