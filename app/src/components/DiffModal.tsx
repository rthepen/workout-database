import React from 'react';
import { X } from 'lucide-react';
import type { Exercise } from '../types/exercise';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  original: Exercise | null;
  modified: Exercise | null;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  original,
  modified,
}) => {
  if (!isOpen || !modified) return null;

  const origJSON = original ? JSON.stringify(original, null, 2) : '';
  const modJSON = JSON.stringify(modified, null, 2);

  // Compute key field differences
  const changes: { field: string; orig: string; mod: string }[] = [];

  if (original) {
    if (original.exercise_name?.en !== modified.exercise_name?.en) {
      changes.push({
        field: 'Exercise Name (EN)',
        orig: original.exercise_name?.en || '',
        mod: modified.exercise_name?.en || '',
      });
    }
    if (original.exercise_name?.nl !== modified.exercise_name?.nl) {
      changes.push({
        field: 'Exercise Name (NL)',
        orig: original.exercise_name?.nl || '',
        mod: modified.exercise_name?.nl || '',
      });
    }
    if (JSON.stringify(original.target_muscles) !== JSON.stringify(modified.target_muscles)) {
      changes.push({
        field: 'Target Muscles',
        orig: (original.target_muscles?.primary || []).join(', '),
        mod: (modified.target_muscles?.primary || []).join(', '),
      });
    }
    if (JSON.stringify(original.attributes) !== JSON.stringify(modified.attributes)) {
      changes.push({
        field: 'Attributes (Difficulty / Mechanics)',
        orig: `${original.attributes?.difficulty} | ${original.attributes?.mechanics}`,
        mod: `${modified.attributes?.difficulty} | ${modified.attributes?.mechanics}`,
      });
    }
    if (JSON.stringify(original.media?.videos) !== JSON.stringify(modified.media?.videos)) {
      changes.push({
        field: 'Videos & Timestamps',
        orig: `${original.media?.videos?.length || 0} videos (${original.media?.videos?.map(v => `${v.youtube_id}@${v.start_seconds || 0}s`).join(', ') || 'none'})`,
        mod: `${modified.media?.videos?.length || 0} videos (${modified.media?.videos?.map(v => `${v.youtube_id}@${v.start_seconds || 0}s`).join(', ') || 'none'})`,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-bold text-base text-white">Local Change Diff Inspector</h2>
            <p className="text-xs text-slate-400 font-mono">{modified.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted Key Changes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Detected Modifications ({changes.length})
          </h3>

          {changes.length === 0 ? (
            <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400 italic">
              No field modifications compared to the baseline record.
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map((c, idx) => (
                <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-brand-400">{c.field}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300">
                      <span className="text-[10px] text-rose-500 block mb-0.5 uppercase font-bold">Original:</span>
                      {c.orig || 'none'}
                    </div>
                    <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded text-emerald-300">
                      <span className="text-[10px] text-emerald-500 block mb-0.5 uppercase font-bold">Modified:</span>
                      {c.mod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side by side JSON Diff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">Original JSON</span>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 max-h-60 overflow-y-auto">
              {origJSON}
            </pre>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-400">Updated JSON</span>
            <pre className="p-3 bg-slate-950 border border-emerald-950 rounded-lg text-[10px] font-mono text-emerald-300 max-h-60 overflow-y-auto">
              {modJSON}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
