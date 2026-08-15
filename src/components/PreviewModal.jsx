import React, { useState } from 'react';
import { ExternalLink, Eye, Monitor, Smartphone, X, AlertCircle, RefreshCw } from 'lucide-react';

export default function PreviewModal({ project, onClose }) {
  const [device, setDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  if (!project) return null;

  const handleRefresh = () => {
    setLoading(true);
    setIframeError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Modal Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">

          <div className="flex items-center space-x-3 truncate">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <span className="text-sm font-semibold text-white truncate ml-2">{project.title}</span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {project.category}
            </span>
          </div>

          {/* Viewport Toggles & Controls */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  device === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop View Mode"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  device === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile View Mode"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            <button
              onClick={handleRefresh}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
              title="Reload Preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Open Direct</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
              title="Close Preview Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Website Preview Iframe Wrapper */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden">

          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Loading Live Website Preview...</p>
            </div>
          )}

          <div
            className={`h-full transition-all duration-300 flex flex-col items-center justify-center ${
              device === 'mobile'
                ? 'w-[375px] max-w-full rounded-[36px] border-[10px] border-slate-800 shadow-2xl overflow-hidden'
                : 'w-full rounded-lg border border-slate-800 shadow-lg'
            }`}
          >
            <iframe
              src={project.url}
              title={project.title}
              className="w-full h-full bg-white rounded-md"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setIframeError(true);
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>

          {/* Iframe X-Frame-Options Fallback Notice */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 flex items-center gap-2 shadow-xl backdrop-blur-md max-w-md text-center">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>If website blocks iframe embedding due to security headers, click <strong>Open Direct</strong> above.</span>
          </div>

        </div>

      </div>
    </div>
  );
}
