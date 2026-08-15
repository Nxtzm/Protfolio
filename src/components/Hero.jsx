import React from 'react';
import { Sparkles, ArrowRight, Mail, MapPin, Globe, Edit2, Share2 } from 'lucide-react';

export default function Hero({ profile, editMode, onOpenProfileModal }) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/15 to-pink-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Main Info Column */}
          <div className="lg:col-span-7 space-y-6">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Available for Client Projects & Consulting</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-heading leading-tight">
                Hi, I'm <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400">{profile.name}</span>
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-slate-300">
                {profile.title}
              </p>
            </div>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
              {profile.tagline || profile.bio}
            </p>

            {/* Quick Contact & Social Links */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-400">
              {profile.location && (
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span>{profile.email}</span>
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center gap-2 group"
              >
                <span>View Portfolio Projects</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#contact"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all"
              >
                Contact Me
              </a>

              {editMode && (
                <button
                  onClick={onOpenProfileModal}
                  className="px-4 py-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile Info</span>
                </button>
              )}
            </div>

            {/* Social Icons */}
            <div className="pt-4 flex items-center space-x-4 text-slate-400">
              {profile.socials?.github && (
                <a href={profile.socials.github} target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1 text-xs font-medium">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>GitHub</span>
                </a>
              )}
              {profile.socials?.linkedin && (
                <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1 text-xs font-medium">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>LinkedIn</span>
                </a>
              )}
              {profile.socials?.twitter && (
                <a href={profile.socials.twitter} target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1 text-xs font-medium">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>Twitter</span>
                </a>
              )}
              {profile.socials?.website && (
                <a href={profile.socials.website} target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1 text-xs font-medium">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Website</span>
                </a>
              )}
            </div>

          </div>

          {/* Profile Visual Card Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group w-full max-w-md">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-500"></div>

              <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center space-x-4">
                  <img
                    src={profile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"}
                    alt={profile.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-md"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";
                    }}
                  />
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white">{profile.name}</h3>
                    <p className="text-xs text-indigo-400 font-medium">{profile.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-xs text-slate-400">Taking Client Work</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed italic">
                  "{profile.bio}"
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Experience</p>
                    <p className="text-lg font-bold text-white font-heading">7+ Years</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Satisfaction</p>
                    <p className="text-lg font-bold text-emerald-400 font-heading">100% Client</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
