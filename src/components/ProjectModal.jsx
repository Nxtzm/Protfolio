import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Globe, Image, Tag, Folder } from 'lucide-react';

export default function ProjectModal({ isOpen, onClose, onSave, projectToEdit }) {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    category: 'Web Apps',
    url: '',
    imageUrl: '',
    tags: '',
    featured: false
  });

  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        id: projectToEdit.id || '',
        title: projectToEdit.title || '',
        description: projectToEdit.description || '',
        category: projectToEdit.category || 'Web Apps',
        url: projectToEdit.url || '',
        imageUrl: projectToEdit.imageUrl || '',
        tags: projectToEdit.tags ? projectToEdit.tags.join(', ') : '',
        featured: projectToEdit.featured || false
      });
    } else {
      setFormData({
        id: `proj-${Date.now()}`,
        title: '',
        description: '',
        category: 'Web Apps',
        url: 'https://',
        imageUrl: '',
        tags: 'React, Tailwind CSS',
        featured: false
      });
    }
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const tagArray = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    onSave({
      ...formData,
      tags: tagArray
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="font-heading font-bold text-lg text-white">
              {projectToEdit ? 'Edit Website Project' : 'Add New Portfolio Project'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g. NextGen Mobile Banking Web App"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Web Apps">Web Apps</option>
                <option value="SaaS">SaaS</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Landing Pages">Landing Pages</option>
                <option value="Mobile/Design">Mobile/Design</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Live Website URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Preview Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-500">Provide image URL for project screenshot thumbnail.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Describe what this website does, client goals, and technical features..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Tech Stack Tags (Comma-separated)</label>
            <input
              type="text"
              placeholder="React, TypeScript, Tailwind CSS, Stripe"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{projectToEdit ? 'Save Changes' : 'Add Project'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
