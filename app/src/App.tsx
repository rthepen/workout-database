import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuditQueue } from './components/AuditQueue';
import type { AuditFilterType } from './components/AuditQueue';
import { VideoInspector } from './components/VideoInspector';
import { ExerciseEditor } from './components/ExerciseEditor';
import { ContributionModal } from './components/ContributionModal';
import { DiffModal } from './components/DiffModal';
import { fetchAllExercises, saveExercisesToLocal, resetLocalEdits } from './services/exerciseService';
import type { Exercise, VideoMedia } from './types/exercise';
import confetti from 'canvas-confetti';

export function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [originalExercises, setOriginalExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLocalEdits, setHasLocalEdits] = useState<boolean>(false);

  // Filter & Queue State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState<AuditFilterType>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortByOldest, setSortByOldest] = useState<boolean>(true);

  // Modals
  const [isContributionModalOpen, setIsContributionModalOpen] = useState<boolean>(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  // Initial Data Load
  const loadData = async () => {
    setIsLoading(true);
    const res = await fetchAllExercises();
    setExercises(res.exercises);
    setOriginalExercises(res.exercises);
    setIsLive(res.isLive);
    if (res.exercises.length > 0) {
      setSelectedExercise(res.exercises[0]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save exercise changes
  const handleSaveExercise = (updated: Exercise) => {
    const updatedList = exercises.map(e => e.id === updated.id ? updated : e);
    setExercises(updatedList);
    setSelectedExercise(updated);
    saveExercisesToLocal(updatedList);
    setHasLocalEdits(true);

    // Trigger celebratory particle effect
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Confetti fallback
    }
  };

  // Video updates from Inspector
  const handleUpdateVideos = (videos: VideoMedia[]) => {
    if (!selectedExercise) return;
    const today = new Date().toISOString().split('T')[0];
    const updated: Exercise = {
      ...selectedExercise,
      media: {
        ...selectedExercise.media,
        videos,
      },
      meta: {
        ...selectedExercise.meta,
        updated_at: today,
      },
    };
    handleSaveExercise(updated);
  };

  const handleResetEdits = () => {
    if (confirm('Are you sure you want to discard all local modifications?')) {
      resetLocalEdits();
      setHasLocalEdits(false);
      loadData();
    }
  };

  const originalSelected = originalExercises.find(e => e.id === selectedExercise?.id) || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F17] text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading Workout Database & Schema Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 selection:bg-brand-500/30 selection:text-brand-300">
      {/* Top Application Header */}
      <Header
        exercises={exercises}
        isLive={isLive}
        onRefresh={loadData}
        onOpenPRModal={() => setIsContributionModalOpen(true)}
        onResetEdits={handleResetEdits}
        hasLocalEdits={hasLocalEdits}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Verification & Audit Queue */}
        <AuditQueue
          exercises={exercises}
          selectedExercise={selectedExercise}
          onSelectExercise={setSelectedExercise}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          auditFilter={auditFilter}
          onAuditFilterChange={setAuditFilter}
          selectedMaterial={selectedMaterial}
          onMaterialChange={setSelectedMaterial}
          selectedMuscle={selectedMuscle}
          onMuscleChange={setSelectedMuscle}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          sortByOldest={sortByOldest}
          onToggleSort={() => setSortByOldest(!sortByOldest)}
        />

        {/* Right Column: Active Exercise Workspace (Video Inspector & Schema Editor) */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6">
          {selectedExercise ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Active YouTube Video Player & Timestamp Capture */}
              <VideoInspector
                exercise={selectedExercise}
                onUpdateVideos={handleUpdateVideos}
              />

              {/* Schema-Compliant Exercise Form Editor */}
              <ExerciseEditor
                exercise={selectedExercise}
                allExercises={exercises}
                onSave={handleSaveExercise}
                onOpenDiff={() => setIsDiffModalOpen(true)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-12 text-slate-500">
              Select an exercise from the audit queue to inspect and curate.
            </div>
          )}
        </main>
      </div>

      {/* Contribution & PR Modal */}
      <ContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        exercises={exercises}
        modifiedExercise={selectedExercise}
      />

      {/* Side-by-Side Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        original={originalSelected}
        modified={selectedExercise}
      />
    </div>
  );
}
export default App;
