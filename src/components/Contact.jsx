import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export default function Contact({ profile }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 5000);
    }
  };

  return (
    <section id="contact" className="py-20 bg-slate-900/80 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Contact Details Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Get In Touch</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
                Let's Work Together
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Have a project in mind, need a custom website, or looking to collaborate? Send me a message and I'll respond within 24 hours.
              </p>
            </div>

            <div className="space-y-4">
              {profile.email && (
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Email Me At</p>
                    <a href={`mailto:${profile.email}`} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Call / WhatsApp</p>
                    <p className="text-sm font-bold text-white">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile.location && (
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Location</p>
                    <p className="text-sm font-bold text-white">{profile.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Form Column */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl relative">

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white font-heading">Message Sent Successfully!</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Thank you for reaching out. I've received your inquiry and will get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Connor"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="sarah@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Subject</label>
                    <input
                      type="text"
                      placeholder="Project Inquiry / Website Build"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell me about your project goals, timelines, and requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message to {profile.name.split(' ')[0]}</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
