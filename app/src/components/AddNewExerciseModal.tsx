import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Code2, FormInput, Copy, Check, AlertCircle } from 'lucide-react';
import type { Exercise } from '../types/exercise';

interface AddNewExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (newExercise: Exercise) => void;
  materialsList: Array<{ id: string; name: { en: string; nl: string }; description?: { en: string; nl: string } }>;
}

export const AddNewExerciseModal: React.FC<AddNewExerciseModalProps> = ({
  isOpen,
  onClose,
  onAddExercise,
  materialsList,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [nameEn, setNameEn] = useState<string>('');
  const [nameNl, setNameNl] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materialsList[0]?.id || 'bodyweight');
  const [categoryEn] = useState<string>('Strength & Conditioning');
  const [categoryNl] = useState<string>('Krachttraining & Conditie');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [primaryMuscle, setPrimaryMuscle] = useState<string>('quadriceps');
  const [secondaryMuscle, setSecondaryMuscle] = useState<string>('gluteus_maximus');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [instructionEn, setInstructionEn] = useState<string>('');

  // Raw JSON editing state
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const extractYoutubeId = (urlOrId: string): string => {
    const clean = urlOrId.trim();
    if (clean.length === 11 && !clean.includes('/') && !clean.includes('?')) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : clean;
  };

  // Build exercise object from form state
  const buildExerciseFromForm = (): Exercise => {
    const foundMat = materialsList.find(m => m.id === selectedMaterialId);
    const materialObj = {
      id: selectedMaterialId,
      name: foundMat?.name || { en: selectedMaterialId.replace(/_/g, ' '), nl: selectedMaterialId.replace(/_/g, ' ') },
      description: foundMat?.description || { en: 'Exercise equipment', nl: 'Trainingsmateriaal' },
    };

    const slug = (nameEn || 'new_exercise')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const generatedId = `${selectedMaterialId}_${slug}`;
    const ytId = extractYoutubeId(youtubeUrl);

    return {
      id: generatedId,
      exercise_name: {
        en: nameEn.trim() || 'New Exercise',
        nl: (nameNl.trim() || nameEn.trim() || 'Nieuwe Oefening'),
      },
      aliases: nameEn.trim() ? [nameEn.trim()] : [],
      material: materialObj,
      category: {
        en: categoryEn.trim(),
        nl: categoryNl.trim(),
      },
      target_muscles: {
        primary: [primaryMuscle],
        secondary: secondaryMuscle ? [secondaryMuscle] : [],
      },
      attributes: {
        difficulty,
        mechanics: 'compound',
        force_type: 'push',
        tracking_type: 'reps_only',
        rating: 5,
      },
      instructions: {
        en: instructionEn.trim() ? instructionEn.split('\n').filter(Boolean) : [`Execute ${nameEn.trim() || 'exercise'} with controlled movement and full range of motion.`],
        nl: [`Voer ${nameNl.trim() || nameEn.trim() || 'oefening'} uit met een gecontroleerde beweging en volledige bewegingsuitslag.`],
      },
      form_cues: {
        en: ['Maintain a stable core throughout the exercise.'],
        nl: ['Houd je romp stabiel gedurende de hele beweging.'],
      },
      relations: {
        progressions: [],
        regressions: [],
      },
      media: {
        videos: ytId ? [
          {
            youtube_id: ytId,
            type: 'standard',
            priority: 1,
            language: 'en',
            start_seconds: 0,
            thumbnail_seconds: 0,
            rating: 5,
            thumbnail_rating: 5,
          }
        ] : [],
      },
      meta: {
        schema_version: '1.1.0',
        updated_at: new Date().toISOString(),
      },
    };
  };

  // Synchronize JSON string when form updates (unless user is manually typing JSON)
  useEffect(() => {
    if (isOpen) {
      const generated = buildExerciseFromForm();
      setRawJsonText(JSON.stringify(generated, null, 2));
      setJsonError(null);
    }
  }, [isOpen, nameEn, nameNl, selectedMaterialId, difficulty, primaryMuscle, secondaryMuscle, youtubeUrl, instructionEn]);

  if (!isOpen) return null;

  // Handle direct JSON text edit by user
  const handleRawJsonChange = (text: string) => {
    setRawJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);

      // Optionally sync form back if valid
      if (parsed.exercise_name?.en) setNameEn(parsed.exercise_name.en);
      if (parsed.exercise_name?.nl) setNameNl(parsed.exercise_name.nl);
      if (parsed.material?.id) setSelectedMaterialId(parsed.material.id);
      if (parsed.attributes?.difficulty) setDifficulty(parsed.attributes.difficulty);
      if (parsed.target_muscles?.primary?.[0]) setPrimaryMuscle(parsed.target_muscles.primary[0]);
      if (parsed.media?.videos?.[0]?.youtube_id) setYoutubeUrl(parsed.media.videos[0].youtube_id);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonText);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let exerciseToCreate: Exercise;

    if (activeTab === 'json') {
      try {
        exerciseToCreate = JSON.parse(rawJsonText);
        if (!exerciseToCreate.id || !exerciseToCreate.exercise_name?.en) {
          alert('Invalid Exercise JSON: Missing id or exercise_name.en');
          return;
        }
      } catch {
        alert('Cannot create exercise: Invalid JSON syntax in editor.');
        return;
      }
    } else {
      if (!nameEn.trim()) {
        alert('Please enter an exercise name in English.');
        return;
      }
      exerciseToCreate = buildExerciseFromForm();
    }

    onAddExercise(exerciseToCreate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0E131F] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Add New Exercise</h3>
              <p className="text-xs text-slate-400">Create & edit live JSON payload for audit & commit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (Form Builder vs Live JSON Editor) */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === 'form'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FormInput className="w-3.5 h-3.5" />
              <span>Form Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === 'json'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live JSON & Editor</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'json' && (
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            )}
            <span className="text-[10px] font-mono text-slate-500">v1.1.0 Schema</span>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs flex flex-col">
          {activeTab === 'form' ? (
            <div className="space-y-4">
              {/* Exercise Name (EN & NL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Exercise Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="e.g. Nordic Hamstring Curl"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Exercise Name (Dutch)</label>
                  <input
                    type="text"
                    value={nameNl}
                    onChange={e => setNameNl(e.target.value)}
                    placeholder="bijv. Nordic Hamstring Curl"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              {/* Material / Equipment & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Equipment / Material *</label>
                  <select
                    value={selectedMaterialId}
                    onChange={e => setSelectedMaterialId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    {materialsList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name.en} ({m.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Difficulty *</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Primary & Secondary Muscle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Primary Target Muscle</label>
                  <select
                    value={primaryMuscle}
                    onChange={e => setPrimaryMuscle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    <option value="quadriceps">Quadriceps</option>
                    <option value="hamstrings">Hamstrings</option>
                    <option value="gluteus_maximus">Gluteus Maximus</option>
                    <option value="rectus_abdominis">Rectus Abdominis (Abs)</option>
                    <option value="biceps_brachii">Biceps</option>
                    <option value="triceps_brachii">Triceps</option>
                    <option value="pectoralis_major">Chest (Pectoralis)</option>
                    <option value="latissimus_dorsi">Back (Lats)</option>
                    <option value="deltoids_anterior">Shoulders (Deltoids)</option>
                    <option value="cardiovascular_system">Cardio System</option>
                    <option value="calves">Calves</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Secondary Target Muscle</label>
                  <select
                    value={secondaryMuscle}
                    onChange={e => setSecondaryMuscle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    <option value="">None</option>
                    <option value="gluteus_maximus">Gluteus Maximus</option>
                    <option value="hamstrings">Hamstrings</option>
                    <option value="calves">Calves</option>
                    <option value="rectus_abdominis">Abs (Core)</option>
                    <option value="erector_spinae">Lower Back</option>
                    <option value="triceps_brachii">Triceps</option>
                    <option value="forearms">Forearms</option>
                  </select>
                </div>
              </div>

              {/* YouTube Video Link */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">YouTube Demonstration Video (Link or ID)</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Instructions (English - 1 step per line)</label>
                <textarea
                  rows={2}
                  value={instructionEn}
                  onChange={e => setInstructionEn(e.target.value)}
                  placeholder="Step 1: Position your feet...&#10;Step 2: Lower slowly..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-brand-500 font-medium resize-none"
                />
              </div>
            </div>
          ) : (
            /* Live JSON Code & Interactive Editor */
            <div className="flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Live JSON Payload Editor
                </span>
                {jsonError ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Invalid JSON Syntax
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    Valid JSON Schema Payload 🟢
                  </span>
                )}
              </div>

              <textarea
                value={rawJsonText}
                onChange={e => handleRawJsonChange(e.target.value)}
                rows={16}
                className="w-full flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-brand-500 shadow-inner"
              />
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Create Exercise</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
