import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SingleWorkoutCard } from './components/SingleWorkoutCard';
import { MobileAuditFilterDrawer } from './components/MobileAuditFilterDrawer';
import type { SortOrderType } from './components/MobileAuditFilterDrawer';
import type { AuditFilterType } from './components/AuditQueue';
import { ContributionModal } from './components/ContributionModal';
import { DiffModal } from './components/DiffModal';
import { GitHubSettingsModal } from './components/GitHubSettingsModal';
import { AddNewExerciseModal } from './components/AddNewExerciseModal';
import { fetchAllExercises, saveExercisesToLocal, resetLocalEdits } from './services/exerciseService';
import type { Exercise, VideoMedia } from './types/exercise';
import confetti from 'canvas-confetti';
import { Filter } from 'lucide-react';

export function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [originalExercises, setOriginalExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLocalEdits, setHasLocalEdits] = useState<boolean>(false);

  // Filter & Queue State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState<AuditFilterType>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('oldest_first');
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  // Modals & Drawers
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState<boolean>(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [isTokenSettingsOpen, setIsTokenSettingsOpen] = useState<boolean>(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState<boolean>(false);

  // Initial Data Load
  const loadData = async () => {
    setIsLoading(true);
    const res = await fetchAllExercises();
    setExercises(res.exercises);
    setOriginalExercises(res.exercises);
    setIsLive(res.isLive);
    setCurrentIndex(0);
    setActiveExerciseId(null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute unique materials for dropdown
  const materials = useMemo(() => {
    return Array.from(new Set(exercises.map(e => e.material?.id || 'other'))).sort();
  }, [exercises]);

  const materialsList = useMemo(() => {
    const map = new Map<string, { id: string; name: { en: string; nl: string } }>();
    exercises.forEach(e => {
      if (e.material?.id && !map.has(e.material.id)) {
        map.set(e.material.id, {
          id: e.material.id,
          name: {
            en: e.material.name?.en || e.material.id,
            nl: e.material.name?.nl || e.material.name?.en || e.material.id,
          },
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.en.localeCompare(b.name.en));
  }, [exercises]);

  const handleAddNewExercise = (newEx: Exercise) => {
    const updatedList = [newEx, ...exercises];
    setExercises(updatedList);
    saveExercisesToLocal(updatedList);
    setHasLocalEdits(true);
    setActiveExerciseId(newEx.id);
    setCurrentIndex(0);
  };

  // Filter & Sort Logic
  const filteredAndSortedExercises = useMemo(() => {
    const filtered = exercises.filter(ex => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ex.exercise_name?.en?.toLowerCase().includes(q) || ex.exercise_name?.nl?.toLowerCase().includes(q);
        const matchId = ex.id.toLowerCase().includes(q);
        const matchAliases = ex.aliases?.some(a => a.toLowerCase().includes(q));
        const matchMaterial = ex.material?.name?.en?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchAliases && !matchMaterial) return false;
      }

      // 2. Audit Filter
      if (auditFilter === 'missing_video') {
        if (ex.media?.videos && ex.media.videos.length > 0) return false;
      } else if (auditFilter === 'missing_timestamp') {
        const hasTimestamp = ex.media?.videos?.some(v => v.start_seconds !== undefined && v.start_seconds > 0);
        if (hasTimestamp || !ex.media?.videos || ex.media.videos.length === 0) return false;
      } else if (auditFilter === 'needs_review') {
        const isMissingVideos = !ex.media?.videos || ex.media.videos.length === 0;
        const isMissingTimestamps = ex.media?.videos?.some(v => v.start_seconds === undefined || v.start_seconds === 0);
        const isFewCues = !ex.form_cues?.en || ex.form_cues.en.length < 2;
        if (!isMissingVideos && !isMissingTimestamps && !isFewCues) return false;
      }

      // 3. Material Filter
      if (selectedMaterial && selectedMaterial !== 'all') {
        if (ex.material?.id !== selectedMaterial) return false;
      }

      // 4. Target Muscle Filter
      if (selectedMuscle && selectedMuscle !== 'all') {
        const matchPrimary = ex.target_muscles?.primary?.includes(selectedMuscle);
        const matchSecondary = ex.target_muscles?.secondary?.includes(selectedMuscle);
        if (!matchPrimary && !matchSecondary) return false;
      }

      // 5. Difficulty Filter
      if (selectedDifficulty && selectedDifficulty !== 'all') {
        if (ex.attributes?.difficulty !== selectedDifficulty) return false;
      }

      return true;
    });

    // Sort order logic
    return [...filtered].sort((a, b) => {
      const dateA = a.meta?.updated_at || '1970-01-01';
      const dateB = b.meta?.updated_at || '1970-01-01';
      
      switch (sortOrder) {
        case 'oldest_first':
          return dateA.localeCompare(dateB) || a.id.localeCompare(b.id);
        case 'newest_first':
          return dateB.localeCompare(dateA) || a.id.localeCompare(b.id);
        case 'name_asc':
          return (a.exercise_name?.en || a.id).localeCompare(b.exercise_name?.en || b.id);
        case 'fewest_videos': {
          const vA = a.media?.videos?.length || 0;
          const vB = b.media?.videos?.length || 0;
          return vA - vB || a.id.localeCompare(b.id);
        }
        case 'difficulty': {
          const diffRank = { beginner: 1, intermediate: 2, advanced: 3 };
          const rA = diffRank[a.attributes?.difficulty || 'beginner'] || 1;
          const rB = diffRank[b.attributes?.difficulty || 'beginner'] || 1;
          return rA - rB || a.id.localeCompare(b.id);
        }
        default:
          return 0;
      }
    });
  }, [exercises, searchQuery, auditFilter, selectedMaterial, selectedMuscle, selectedDifficulty, sortOrder]);

  // Pinned active exercise (keeps user on current exercise during live editing)
  const currentExercise = useMemo(() => {
    if (activeExerciseId) {
      const found = exercises.find(e => e.id === activeExerciseId);
      if (found) return found;
    }
    return filteredAndSortedExercises[currentIndex] || filteredAndSortedExercises[0] || null;
  }, [exercises, activeExerciseId, filteredAndSortedExercises, currentIndex]);

  // Sync active exercise ID if unset
  useEffect(() => {
    if (!activeExerciseId && filteredAndSortedExercises.length > 0) {
      setActiveExerciseId(filteredAndSortedExercises[0].id);
    }
  }, [filteredAndSortedExercises, activeExerciseId]);

  // Calculate position index of current exercise in current filtered selection
  const computedCurrentIndex = useMemo(() => {
    if (!currentExercise) return 0;
    const idx = filteredAndSortedExercises.findIndex(e => e.id === currentExercise.id);
    return idx >= 0 ? idx : currentIndex;
  }, [filteredAndSortedExercises, currentExercise, currentIndex]);

  // Save exercise changes
  const handleSaveExercise = (updated: Exercise) => {
    const updatedList = exercises.map(e => e.id === updated.id ? updated : e);
    setExercises(updatedList);
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

  // Action: Approve & Advance to next workout in queue
  const handleApproveExercise = (approvedExercise: Exercise) => {
    const today = new Date().toISOString();
    const updated: Exercise = {
      ...approvedExercise,
      meta: {
        ...approvedExercise.meta,
        updated_at: today,
      },
    };
    handleSaveExercise(updated);

    // Explicitly advance to next workout in current selection
    const currentPos = filteredAndSortedExercises.findIndex(e => e.id === approvedExercise.id);
    if (currentPos >= 0 && currentPos < filteredAndSortedExercises.length - 1) {
      const nextEx = filteredAndSortedExercises[currentPos + 1];
      setActiveExerciseId(nextEx.id);
      setCurrentIndex(currentPos + 1);
    } else {
      const remaining = filteredAndSortedExercises.filter(e => e.id !== approvedExercise.id);
      if (remaining.length > 0) {
        setActiveExerciseId(remaining[0].id);
        setCurrentIndex(0);
      } else {
        alert('🎉 Congratulations! You have reviewed all exercises in this audit selection!');
      }
    }
  };

  // Navigation Handlers
  const handleNext = () => {
    const currentPos = filteredAndSortedExercises.findIndex(e => e.id === currentExercise?.id);
    if (currentPos >= 0 && currentPos < filteredAndSortedExercises.length - 1) {
      const nextEx = filteredAndSortedExercises[currentPos + 1];
      setActiveExerciseId(nextEx.id);
      setCurrentIndex(currentPos + 1);
    }
  };

  const handlePrev = () => {
    const currentPos = filteredAndSortedExercises.findIndex(e => e.id === currentExercise?.id);
    if (currentPos > 0) {
      const prevEx = filteredAndSortedExercises[currentPos - 1];
      setActiveExerciseId(prevEx.id);
      setCurrentIndex(currentPos - 1);
    }
  };

  // Video updates from Inspector
  const handleUpdateVideos = (videos: VideoMedia[]) => {
    if (!currentExercise) return;
    const today = new Date().toISOString();
    const updated: Exercise = {
      ...currentExercise,
      media: {
        ...currentExercise.media,
        videos,
      },
      meta: {
        ...currentExercise.meta,
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

  const handleResetFilters = () => {
    setAuditFilter('all');
    setSelectedMaterial('all');
    setSelectedMuscle('all');
    setSelectedDifficulty('all');
    setSortOrder('oldest_first');
    setSearchQuery('');
    setActiveExerciseId(null);
    setCurrentIndex(0);
  };

  const originalSelected = originalExercises.find(e => e.id === currentExercise?.id) || null;

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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 selection:bg-brand-500/30 selection:text-brand-300 font-sans">
      {/* Top Application Header */}
      <Header
        exercises={exercises}
        isLive={isLive}
        onRefresh={loadData}
        onOpenPRModal={() => setIsContributionModalOpen(true)}
        onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
        onOpenAddExerciseModal={() => setIsAddExerciseModalOpen(true)}
        onResetEdits={handleResetEdits}
        hasLocalEdits={hasLocalEdits}
      />

      {/* Main Single Workout View (Responsive Mobile & Desktop) */}
      <main className="flex-1 p-3 sm:p-6 pb-24 overflow-y-auto">
        {filteredAndSortedExercises.length === 0 ? (
          <div className="max-w-md mx-auto my-12 p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <h2 className="text-base font-bold text-white">No exercises found</h2>
            <p className="text-xs text-slate-400">There are no exercises matching your current filter criteria.</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Reset all filters
            </button>
          </div>
        ) : currentExercise ? (
          <SingleWorkoutCard
            exercise={currentExercise}
            currentIndex={computedCurrentIndex}
            totalExercises={filteredAndSortedExercises.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onApprove={handleApproveExercise}
            onSaveEdits={handleSaveExercise}
            onOpenDiff={() => setIsDiffModalOpen(true)}
            onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
            onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
            onUpdateVideos={handleUpdateVideos}
            allExercises={exercises}
          />
        ) : null}
      </main>

      {/* Mobile & Desktop Audit Filter Drawer */}
      <MobileAuditFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        auditFilter={auditFilter}
        onAuditFilterChange={(f) => { setAuditFilter(f); setActiveExerciseId(null); setCurrentIndex(0); }}
        selectedMaterial={selectedMaterial}
        onMaterialChange={(m) => { setSelectedMaterial(m); setActiveExerciseId(null); setCurrentIndex(0); }}
        selectedMuscle={selectedMuscle}
        onMuscleChange={(m) => { setSelectedMuscle(m); setActiveExerciseId(null); setCurrentIndex(0); }}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={(d) => { setSelectedDifficulty(d); setActiveExerciseId(null); setCurrentIndex(0); }}
        sortOrder={sortOrder}
        onSortOrderChange={(s) => { setSortOrder(s); setActiveExerciseId(null); setCurrentIndex(0); }}
        materials={materials}
        totalFilteredCount={filteredAndSortedExercises.length}
        onResetFilters={handleResetFilters}
      />

      {/* Add New Exercise Modal */}
      <AddNewExerciseModal
        isOpen={isAddExerciseModalOpen}
        onClose={() => setIsAddExerciseModalOpen(false)}
        onAddExercise={handleAddNewExercise}
        materialsList={materialsList}
      />

      {/* GitHub Token Settings Modal */}
      <GitHubSettingsModal
        isOpen={isTokenSettingsOpen}
        onClose={() => setIsTokenSettingsOpen(false)}
      />

      {/* Contribution & PR Modal */}
      <ContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        exercises={exercises}
        modifiedExercise={currentExercise}
      />

      {/* Side-by-Side Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        original={originalSelected}
        modified={currentExercise}
      />
    </div>
  );
}
export default App;

