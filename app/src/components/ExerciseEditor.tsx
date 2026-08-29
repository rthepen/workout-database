import React, { useState } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Languages, 
  Layers, 
  GitFork, 
  Sliders, 
  Tag, 
  Eye
} from 'lucide-react';
import { ANATOMICAL_MUSCLES } from '../types/exercise';
import type { Exercise } from '../types/exercise';
import { validateExercise } from '../utils/schemaValidator';

interface ExerciseEditorProps {
  exercise: Exercise;
  allExercises: Exercise[];
  onSave: (updated: Exercise) => void;
  onOpenDiff: () => void;
}

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  exercise,
  allExercises,
  onSave,
  onOpenDiff,
}) => {
  const [formData, setFormData] = useState<Exercise>({ ...exercise });
  const [aliasInput, setAliasInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'muscles' | 'instructions' | 'relations'>('details');
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);

  // Sync state if selection changes
  React.useEffect(() => {
    setFormData({ ...exercise });
  }, [exercise.id]);

  const validationIssues = validateExercise(formData);

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0];
    const updated: Exercise = {
      ...formData,
      meta: {
        ...formData.meta,
        updated_at: today,
      },
    };
    onSave(updated);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2500);
  };

  const handleAddAlias = () => {
    if (aliasInput.trim() && !formData.aliases?.includes(aliasInput.trim())) {
      setFormData({
        ...formData,
        aliases: [...(formData.aliases || []), aliasInput.trim()],
      });
      setAliasInput('');
    }
  };

  const handleRemoveAlias = (index: number) => {
    setFormData({
      ...formData,
      aliases: formData.aliases.filter((_, idx) => idx !== index),
    });
  };

  const handleToggleMuscle = (muscle: string, type: 'primary' | 'secondary') => {
    const currentPrimary = formData.target_muscles?.primary || [];
    const currentSecondary = formData.target_muscles?.secondary || [];

    if (type === 'primary') {
      const exists = currentPrimary.includes(muscle);
      let updatedPrimary = exists ? currentPrimary.filter(m => m !== muscle) : [...currentPrimary, muscle];
      let updatedSecondary = currentSecondary.filter(m => m !== muscle);
      setFormData({
        ...formData,
        target_muscles: { primary: updatedPrimary, secondary: updatedSecondary },
      });
    } else {
      const exists = currentSecondary.includes(muscle);
      let updatedSecondary = exists ? currentSecondary.filter(m => m !== muscle) : [...currentSecondary, muscle];
      let updatedPrimary = currentPrimary.filter(m => m !== muscle);
      setFormData({
        ...formData,
        target_muscles: { primary: updatedPrimary, secondary: updatedSecondary },
      });
    }
  };

  // Instruction and form cues helpers
  const handleInstructionChange = (lang: 'en' | 'nl', index: number, value: string) => {
    const list = [...(formData.instructions?.[lang] || [])];
    list[index] = value;
    setFormData({
      ...formData,
      instructions: {
        ...formData.instructions,
        [lang]: list,
      },
    });
  };

  const handleAddInstruction = (lang: 'en' | 'nl') => {
    const list = [...(formData.instructions?.[lang] || []), ''];
    setFormData({
      ...formData,
      instructions: {
        ...formData.instructions,
        [lang]: list,
      },
    });
  };

  const handleRemoveInstruction = (lang: 'en' | 'nl', index: number) => {
    const list = formData.instructions?.[lang]?.filter((_, idx) => idx !== index) || [];
    setFormData({
      ...formData,
      instructions: {
        ...formData.instructions,
        [lang]: list,
      },
    });
  };

  const handleCueChange = (lang: 'en' | 'nl', index: number, value: string) => {
    const list = [...(formData.form_cues?.[lang] || [])];
    list[index] = value;
    setFormData({
      ...formData,
      form_cues: {
        ...formData.form_cues,
        [lang]: list,
      },
    });
  };

  const handleAddCue = (lang: 'en' | 'nl') => {
    const list = [...(formData.form_cues?.[lang] || []), ''];
    setFormData({
      ...formData,
      form_cues: {
        ...formData.form_cues,
        [lang]: list,
      },
    });
  };

  const handleRemoveCue = (lang: 'en' | 'nl', index: number) => {
    const list = formData.form_cues?.[lang]?.filter((_, idx) => idx !== index) || [];
    setFormData({
      ...formData,
      form_cues: {
        ...formData.form_cues,
        [lang]: list,
      },
    });
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Editor Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-brand-400 bg-brand-950 px-2 py-0.5 rounded border border-brand-800">
              {formData.id}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              v{formData.meta?.schema_version}
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            {formData.exercise_name?.en || 'Untitled Exercise'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDiff}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>View Diff</span>
          </button>

          <button
            onClick={handleSave}
            disabled={validationIssues.length > 0}
            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-md transition ${
              validationIssues.length > 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20'
            }`}
          >
            {showSavedFeedback ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Warnings */}
      {validationIssues.length > 0 && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Schema Validation Errors ({validationIssues.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-rose-200">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>
                <strong>{issue.field}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs space-x-4">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'details'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          General & Attributes
        </button>
        <button
          onClick={() => setActiveTab('muscles')}
          className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'muscles'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Anatomical Muscles ({formData.target_muscles?.primary?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'instructions'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          Instructions & Form Cues
        </button>
        <button
          onClick={() => setActiveTab('relations')}
          className={`pb-2 font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'relations'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          Graph Relations
        </button>
      </div>

      {/* TAB 1: General & Attributes */}
      {activeTab === 'details' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* English Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Exercise Name (EN)</label>
              <input
                type="text"
                value={formData.exercise_name?.en || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  exercise_name: { ...formData.exercise_name, en: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-md focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Dutch Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Exercise Name (NL)</label>
              <input
                type="text"
                value={formData.exercise_name?.nl || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  exercise_name: { ...formData.exercise_name, nl: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-md focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Category (EN)</label>
              <input
                type="text"
                value={formData.category?.en || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  category: { ...formData.category, en: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-md focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Category (NL)</label>
              <input
                type="text"
                value={formData.category?.nl || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  category: { ...formData.category, nl: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-md focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Biomechanical Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Difficulty</label>
              <select
                value={formData.attributes?.difficulty || 'beginner'}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, difficulty: e.target.value as any }
                })}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-md px-2.5 py-1.5"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Mechanics</label>
              <select
                value={formData.attributes?.mechanics || 'compound'}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, mechanics: e.target.value as any }
                })}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-md px-2.5 py-1.5"
              >
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
                <option value="isometric">Isometric</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Force Type</label>
              <select
                value={formData.attributes?.force_type || 'push'}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, force_type: e.target.value as any }
                })}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-md px-2.5 py-1.5"
              >
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="dynamic">Dynamic</option>
                <option value="isometric">Isometric</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Tracking Type</label>
              <select
                value={formData.attributes?.tracking_type || 'reps_and_weight'}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, tracking_type: e.target.value as any }
                })}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-md px-2.5 py-1.5"
              >
                <option value="reps_and_weight">Reps & Weight</option>
                <option value="reps_only">Reps Only</option>
                <option value="time_only">Time Only</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          </div>

          {/* Aliases Tag Manager */}
          <div className="pt-2">
            <label className="block text-slate-400 mb-1 font-medium">Search Aliases</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.aliases?.map((alias, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 flex items-center gap-1 text-[11px]"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                  <span>{alias}</span>
                  <button
                    onClick={() => handleRemoveAlias(idx)}
                    className="hover:text-rose-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add alias (e.g. Incline Bench Press)..."
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-md focus:outline-none focus:border-brand-500 text-xs"
              />
              <button
                onClick={handleAddAlias}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Anatomical Muscle Picker */}
      {activeTab === 'muscles' && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Select the 29 standardized anatomical muscle groups for this exercise:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANATOMICAL_MUSCLES.map((muscle) => {
              const isPrimary = formData.target_muscles?.primary?.includes(muscle);
              const isSecondary = formData.target_muscles?.secondary?.includes(muscle);

              return (
                <div
                  key={muscle}
                  className={`p-2 rounded-lg border flex items-center justify-between transition ${
                    isPrimary
                      ? 'bg-brand-950/60 border-brand-500/60 shadow-sm'
                      : isSecondary
                      ? 'bg-sky-950/50 border-sky-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <span className={`font-medium capitalize ${
                    isPrimary ? 'text-brand-300' : isSecondary ? 'text-sky-300' : 'text-slate-400'
                  }`}>
                    {muscle.replace(/_/g, ' ')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleMuscle(muscle, 'primary')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                        isPrimary ? 'bg-brand-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Set as Primary"
                    >
                      Pri
                    </button>
                    <button
                      onClick={() => handleToggleMuscle(muscle, 'secondary')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                        isSecondary ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Set as Secondary"
                    >
                      Sec
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Multi-step Instructions & Form Cues */}
      {activeTab === 'instructions' && (
        <div className="space-y-6 text-xs">
          {/* Instructions EN & NL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">Step-by-Step Instructions</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { handleAddInstruction('en'); handleAddInstruction('nl'); }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>
            </div>

            {formData.instructions?.en?.map((_, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">Step #{idx + 1} (EN)</span>
                  <textarea
                    rows={2}
                    value={formData.instructions.en[idx] || ''}
                    onChange={(e) => handleInstructionChange('en', idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-white rounded focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
                <div className="space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Step #{idx + 1} (NL)</span>
                    <button
                      onClick={() => { handleRemoveInstruction('en', idx); handleRemoveInstruction('nl', idx); }}
                      className="text-slate-500 hover:text-rose-400"
                      title="Remove Step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.instructions.nl[idx] || ''}
                    onChange={(e) => handleInstructionChange('nl', idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-white rounded focus:outline-none focus:border-brand-500 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Form Cues EN & NL */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">Key Form Cues</h3>
              <button
                onClick={() => { handleAddCue('en'); handleAddCue('nl'); }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Cue
              </button>
            </div>

            {formData.form_cues?.en?.map((_, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <input
                  type="text"
                  placeholder="Coaching cue in English..."
                  value={formData.form_cues.en[idx] || ''}
                  onChange={(e) => handleCueChange('en', idx, e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-white rounded text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Coaching cue in Dutch..."
                    value={formData.form_cues.nl[idx] || ''}
                    onChange={(e) => handleCueChange('nl', idx, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-white rounded text-xs"
                  />
                  <button
                    onClick={() => { handleRemoveCue('en', idx); handleRemoveCue('nl', idx); }}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Graph Relations Linker */}
      {activeTab === 'relations' && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Link progressions (harder exercises) and regressions (easier variations) across the workout graph:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Progressions */}
            <div className="space-y-2 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <h4 className="font-bold text-slate-200">Progressions (Harder)</h4>
              <div className="space-y-1.5">
                {formData.relations?.progressions?.map((progId, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
                    <span className="text-brand-400">{progId}</span>
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        relations: {
                          ...formData.relations,
                          progressions: formData.relations.progressions.filter((_, i) => i !== idx)
                        }
                      })}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add progression dropdown */}
              <select
                onChange={(e) => {
                  if (e.target.value && !formData.relations?.progressions?.includes(e.target.value)) {
                    setFormData({
                      ...formData,
                      relations: {
                        ...formData.relations,
                        progressions: [...(formData.relations?.progressions || []), e.target.value]
                      }
                    });
                  }
                }}
                value=""
                className="w-full bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-1.5 mt-2"
              >
                <option value="">+ Link progression exercise...</option>
                {allExercises
                  .filter(e => e.id !== formData.id && !formData.relations?.progressions?.includes(e.id))
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.exercise_name?.en} ({e.id})</option>
                  ))}
              </select>
            </div>

            {/* Regressions */}
            <div className="space-y-2 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <h4 className="font-bold text-slate-200">Regressions (Easier)</h4>
              <div className="space-y-1.5">
                {formData.relations?.regressions?.map((regId, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
                    <span className="text-sky-400">{regId}</span>
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        relations: {
                          ...formData.relations,
                          regressions: formData.relations.regressions.filter((_, i) => i !== idx)
                        }
                      })}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add regression dropdown */}
              <select
                onChange={(e) => {
                  if (e.target.value && !formData.relations?.regressions?.includes(e.target.value)) {
                    setFormData({
                      ...formData,
                      relations: {
                        ...formData.relations,
                        regressions: [...(formData.relations?.regressions || []), e.target.value]
                      }
                    });
                  }
                }}
                value=""
                className="w-full bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-1.5 mt-2"
              >
                <option value="">+ Link regression exercise...</option>
                {allExercises
                  .filter(e => e.id !== formData.id && !formData.relations?.regressions?.includes(e.id))
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.exercise_name?.en} ({e.id})</option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
