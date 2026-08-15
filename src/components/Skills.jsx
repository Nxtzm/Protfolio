import React from 'react';
import { Code, CheckCircle, Award } from 'lucide-react';

export default function Skills({ skills }) {
  return (
    <section id="skills" className="py-20 bg-slate-900/60 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
            <Code className="w-3.5 h-3.5" />
            <span>Technical Expertise</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
            Skills & Domain Proficiency
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Proven track record in building enterprise-grade frontends, modern full-stack architectures, and performant web APIs.
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-base">{skill.name}</h3>
                    <span className="text-xs text-slate-400">{skill.category || 'General'}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-indigo-400 font-heading">{skill.level}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${skill.level}%` }}
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
