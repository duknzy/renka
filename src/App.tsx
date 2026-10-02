import React, { useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously, type User as FirebaseUser } from "firebase/auth";
import { ref, onValue, update, get } from "firebase/database";
import { auth, database } from "./lib/firebase";
import type { Lesson, Problem, MemorizeProgress, CardItem } from "./types";
import {
  extractAllCards,
  INITIAL_SAMPLE_LESSONS,
  INITIAL_SAMPLE_PROBLEMS,
  mergeSrsProgressData
} from "./lib/srsUtils";
import {
  isSoundEnabled,
  setSoundEnabled as persistSoundEnabled
} from "./lib/soundEffects";
import { usePWAInstall } from "./lib/usePWAInstall";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { FlashcardTrainer } from "./components/FlashcardTrainer";
import { RedSheetMode } from "./components/RedSheetMode";
import { NewCardModal } from "./components/NewCardModal";
import { AuthModal } from "./components/AuthModal";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { Home, Play, Eye, PlusCircle } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [activeUid, setActiveUid] = useState<string>(() => {
    try {
      return localStorage.getItem("srs_active_uid") || "";
    } catch {
      return "";
    }
  });

  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);

  // PWA install state
  const { isInstallable, isInstalled, install: installChromium } = usePWAInstall();

  // Raw Database states
  const [allLessons, setAllLessons] = useState<Record<string, Lesson>>({});
  const [allProblems, setAllProblems] = useState<Record<string, Problem>>({});
  const [allMemorizeProgress, setAllMemorizeProgress] = useState<Record<string, MemorizeProgress>>({});
  const [allCardMemos, setAllCardMemos] = useState<Record<string, any>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // App Navigation & Scope state
  const [currentMode, setCurrentMode] = useState<"dashboard" | "flashcard" | "redSheet">("dashboard");
  const [sessionCards, setSessionCards] = useState<CardItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("物理");
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);

  // Track Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setActiveUid(user.uid);
        try {
          localStorage.setItem("srs_active_uid", user.uid);
        } catch {
          // Ignore
        }
      } else {
        const savedUid = localStorage.getItem("srs_active_uid");
        if (!savedUid) {
          signInAnonymously(auth).catch(() => {
            const fallbackUid = "demo_user_1";
            setActiveUid(fallbackUid);
            localStorage.setItem("srs_active_uid", fallbackUid);
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firebase RTDB nodes for current activeUid
  useEffect(() => {
    if (!activeUid) return;

    setIsSyncing(true);

    const lessonsRef = ref(database, `users/${activeUid}/lessons`);
    const problemsRef = ref(database, `users/${activeUid}/problems`);
    const progressRef = ref(database, `users/${activeUid}/memorizeProgress`);
    const memosRef = ref(database, `users/${activeUid}/card_memos`);

    const unsubLessons = onValue(
      lessonsRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setAllLessons(val);
        } else {
          setAllLessons((prev) => (Object.keys(prev).length === 0 ? INITIAL_SAMPLE_LESSONS : prev));
        }
        setIsSyncing(false);
      },
      (err) => {
        console.warn("RTDB lessons read notice:", err);
        setAllLessons((prev) => (Object.keys(prev).length === 0 ? INITIAL_SAMPLE_LESSONS : prev));
        setIsSyncing(false);
      }
    );

    const unsubProblems = onValue(
      problemsRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setAllProblems(val);
        } else {
          setAllProblems((prev) => (Object.keys(prev).length === 0 ? INITIAL_SAMPLE_PROBLEMS : prev));
        }
      },
      (err) => {
        console.warn("RTDB problems read notice:", err);
        setAllProblems((prev) => (Object.keys(prev).length === 0 ? INITIAL_SAMPLE_PROBLEMS : prev));
      }
    );

    const unsubProgress = onValue(
      progressRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setAllMemorizeProgress((prevLocal) => mergeSrsProgressData(prevLocal, val));
        }
      },
      (err) => {
        console.warn("RTDB progress read notice:", err);
      }
    );

    const unsubMemos = onValue(
      memosRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setAllCardMemos(val);
        }
      },
      (err) => {
        console.warn("RTDB card_memos read notice:", err);
      }
    );

    return () => {
      unsubLessons();
      unsubProblems();
      unsubProgress();
      unsubMemos();
    };
  }, [activeUid]);

  // Extract all cards with 100% compatibility logic
  const allCards = useMemo(() => {
    return extractAllCards(allLessons, allProblems, allMemorizeProgress, allCardMemos);
  }, [allLessons, allProblems, allMemorizeProgress, allCardMemos]);

  // Available subjects
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    if (set.size === 0) {
      set.add("物理");
      set.add("数学");
      set.add("公共");
    }
    return Array.from(set);
  }, [allCards]);

  // Ensure selectedSubject is valid
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // All lesson IDs for the selected subject
  const currentSubjectLessonIds = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((c) => {
      if (c.subject === selectedSubject) {
        set.add(c.lessonId || c.problemId || "general");
      }
    });
    return Array.from(set);
  }, [allCards, selectedSubject]);

  // When subject changes, automatically select all lessons in that subject
  useEffect(() => {
    if (currentSubjectLessonIds.length > 0) {
      const hasOverlap = selectedLessonIds.some((id) => currentSubjectLessonIds.includes(id));
      if (!hasOverlap) {
        setSelectedLessonIds(currentSubjectLessonIds);
      }
    }
  }, [selectedSubject, currentSubjectLessonIds]);

  // Scoped cards for the selected subject and selected lessons
  const scopedCards = useMemo(() => {
    return allCards.filter((c) => {
      if (c.subject !== selectedSubject) return false;
      const key = c.lessonId || c.problemId || "general";
      return selectedLessonIds.includes(key);
    });
  }, [allCards, selectedSubject, selectedLessonIds]);

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessonIds((prev) => {
      if (prev.includes(lessonId)) {
        return prev.filter((id) => id !== lessonId);
      } else {
        return [...prev, lessonId];
      }
    });
  };

  const handleSelectAllLessons = (lessonIds: string[]) => {
    setSelectedLessonIds(lessonIds);
  };

  const handleClearLessonSelection = () => {
    setSelectedLessonIds([]);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    persistSoundEnabled(next);
  };

  const handleSwitchUid = (newUid: string) => {
    setActiveUid(newUid);
    try {
      localStorage.setItem("srs_active_uid", newUid);
    } catch {
      // Ignore
    }
  };

  const handleProgressUpdated = useCallback((progressKey: string, newProg: MemorizeProgress) => {
    setAllMemorizeProgress((prev) => ({
      ...prev,
      [progressKey]: newProg
    }));
  }, []);

  const handleLoadSampleData = async () => {
    if (!activeUid) return;
    setIsSyncing(true);
    try {
      await update(ref(database, `users/${activeUid}/lessons`), INITIAL_SAMPLE_LESSONS);
      await update(ref(database, `users/${activeUid}/problems`), INITIAL_SAMPLE_PROBLEMS);
      setAllLessons(INITIAL_SAMPLE_LESSONS);
      setAllProblems(INITIAL_SAMPLE_PROBLEMS);
    } catch (err) {
      console.warn("Could not write sample data directly to RTDB, loaded into memory:", err);
      setAllLessons(INITIAL_SAMPLE_LESSONS);
      setAllProblems(INITIAL_SAMPLE_PROBLEMS);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncRefresh = async () => {
    if (!activeUid) return;
    setIsSyncing(true);
    try {
      const snap = await get(ref(database, `users/${activeUid}`));
      const data = snap.val();
      if (data) {
        if (data.lessons) setAllLessons(data.lessons);
        if (data.problems) setAllProblems(data.problems);
        if (data.memorizeProgress) setAllMemorizeProgress(data.memorizeProgress);
        if (data.card_memos) setAllCardMemos(data.card_memos);
      }
    } catch (err) {
      console.warn("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartFlashcards = (cardsToStudy: CardItem[]) => {
    setSessionCards(cardsToStudy);
    setCurrentMode("flashcard");
  };

  const handleStartRedSheet = (cardsToView: CardItem[]) => {
    setSessionCards(cardsToView);
    setCurrentMode("redSheet");
  };

  const activeScopeText = `${selectedSubject} · ${selectedLessonIds.length}単元 (${scopedCards.length.toLocaleString()}問)`;

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-100 flex flex-col justify-between">
      {/* Top Header */}
      <Header
        user={currentUser}
        isGuest={!currentUser || currentUser.isAnonymous}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        activeScopeText={currentMode === "dashboard" ? activeScopeText : undefined}
        onSyncRefresh={handleSyncRefresh}
        isSyncing={isSyncing}
      />

      {/* Main View */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {currentMode === "dashboard" && (
          <Dashboard
            cards={allCards}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            selectedLessonIds={selectedLessonIds}
            onToggleLesson={handleToggleLesson}
            onSelectAllLessons={handleSelectAllLessons}
            onClearLessonSelection={handleClearLessonSelection}
            onStartSession={handleStartFlashcards}
            onStartRedSheet={handleStartRedSheet}
            onOpenNewCardModal={(subj) => {
              if (subj) setSelectedSubject(subj);
              setIsNewCardModalOpen(true);
            }}
            onLoadSampleData={handleLoadSampleData}
            onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
            isPWAInstalled={isInstalled}
          />
        )}

        {currentMode === "flashcard" && (
          <FlashcardTrainer
            cards={sessionCards.length > 0 ? sessionCards : scopedCards}
            uid={activeUid}
            onClose={() => setCurrentMode("dashboard")}
            onProgressUpdated={handleProgressUpdated}
          />
        )}

        {currentMode === "redSheet" && (
          <RedSheetMode
            cards={sessionCards.length > 0 ? sessionCards : scopedCards}
            uid={activeUid}
            onClose={() => setCurrentMode("dashboard")}
            onProgressUpdated={handleProgressUpdated}
          />
        )}
      </main>

      {/* Floating Bottom Nav for Quick Scope Switching */}
      {currentMode === "dashboard" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.08] bg-black/90 backdrop-blur-xl safe-bottom">
          <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-4">
            <button
              onClick={() => setCurrentMode("dashboard")}
              className="flex flex-col items-center gap-1 text-[11px] font-bold text-white whitespace-nowrap"
            >
              <Home className="h-4 w-4" />
              <span>ホーム</span>
            </button>

            <button
              onClick={() => {
                if (scopedCards.length === 0) return;
                const due = scopedCards.filter((c) => c.isDue);
                handleStartFlashcards(due.length > 0 ? due : scopedCards);
              }}
              disabled={scopedCards.length === 0}
              className="flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white disabled:opacity-25 whitespace-nowrap transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>特訓</span>
            </button>

            <button
              onClick={() => {
                if (scopedCards.length === 0) return;
                handleStartRedSheet(scopedCards);
              }}
              disabled={scopedCards.length === 0}
              className="flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white disabled:opacity-25 whitespace-nowrap transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>赤シート</span>
            </button>

            <button
              onClick={() => setIsNewCardModalOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white whitespace-nowrap transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>追加</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        activeUid={activeUid}
        onSwitchUid={handleSwitchUid}
      />

      <NewCardModal
        isOpen={isNewCardModalOpen}
        onClose={() => setIsNewCardModalOpen(false)}
        uid={activeUid}
        allLessons={allLessons}
        availableSubjects={availableSubjects}
        defaultSubject={selectedSubject}
        onCardCreated={() => {
          handleSyncRefresh();
        }}
      />

      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        isInstallable={isInstallable}
        onInstallChromium={installChromium}
      />
    </div>
  );
}
