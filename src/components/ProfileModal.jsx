import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, Link } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, profile, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    tagline: '',
    bio: '',
    avatar: '',
    email: '',
    phone: '',
    location: '',
    availableForHire: true,
    socials: {
      github: '',
      linkedin: '',
      twitter: '',
      website: ''
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        title: profile.title || '',
        tagline: profile.tagline || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        availableForHire: profile.availableForHire ?? true,
        socials: {
          github: profile.socials?.github || '',
          linkedin: profile.socials?.linkedin || '',
          twitter: profile.socials?.twitter || '',
          website: profile.socials?.website || ''
        }
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-heading font-bold text-lg text-white">Edit Profile & Branding Information</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Professional Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Avatar / Profile Photo URL</label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Tagline</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Full Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-300 uppercase mb-2">Social Profiles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="url"
                placeholder="GitHub URL"
                value={formData.socials.github}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, github: e.target.value }
                  })
                }
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              />
              <input
                type="url"
                placeholder="LinkedIn URL"
                value={formData.socials.linkedin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, linkedin: e.target.value }
                  })
                }
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              />
              <input
                type="url"
                placeholder="Twitter URL"
                value={formData.socials.twitter}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, twitter: e.target.value }
                  })
                }
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              />
              <input
                type="url"
                placeholder="Personal Site URL"
                value={formData.socials.website}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, website: e.target.value }
                  })
                }
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="availableForHire"
              checked={formData.availableForHire}
              onChange={(e) => setFormData({ ...formData, availableForHire: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
            />
            <label htmlFor="availableForHire" className="text-xs text-slate-300 font-medium">
              Display "Available for Work" badge on header
            </label>
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
              <span>Save Profile</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
