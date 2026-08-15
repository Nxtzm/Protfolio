import React from 'react';
import { Layers, Quote, Star, ArrowRight } from 'lucide-react';

export default function Services({ services, testimonials }) {
  return (
    <section id="services" className="py-20 bg-slate-950 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

        {/* Services Part */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Client Offerings</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
              Services & Client Work Solutions
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Tailored development services designed to help businesses launch high-impact web products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-xl space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg font-heading group-hover:scale-105 transition-transform">
                    {service.title.charAt(0)}
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white group-hover:text-indigo-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {service.price}
                  </span>
                  <a
                    href="#contact"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Inquire</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Part */}
        {testimonials && testimonials.length > 0 && (
          <div className="pt-12 border-t border-slate-800/80">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                <Quote className="w-3.5 h-3.5" />
                <span>Client Recommendations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                What Clients Say
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((test) => (
                <div
                  key={test.id}
                  className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 relative space-y-4 shadow-lg"
                >
                  <div className="flex items-center space-x-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed italic">
                    "{test.content}"
                  </p>

                  <div className="flex items-center space-x-4 pt-2">
                    <img
                      src={test.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"}
                      alt={test.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <div>
                      <h4 className="font-heading font-bold text-white text-sm">{test.name}</h4>
                      <p className="text-xs text-slate-400">{test.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
