import React, { useMemo, useState } from "react";
import {
  CheckSquare,
  Square,
  Play,
  Eye,
  Plus,
  Sparkles,
  ChevronRight,
  Smartphone,
  Flame,
  RotateCcw,
  BookOpen
} from "lucide-react";
import type { CardItem } from "../types";

interface DashboardProps {
  cards: CardItem[];
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  selectedLessonIds: string[];
  onToggleLesson: (lessonId: string) => void;
  onSelectAllLessons: (lessonIds: string[]) => void;
  onClearLessonSelection: () => void;
  onStartSession: (sessionCards: CardItem[]) => void;
  onStartRedSheet: (sessionCards: CardItem[]) => void;
  onOpenNewCardModal: (defaultSubject?: string) => void;
  onLoadSampleData: () => void;
  onOpenPWAInstall: () => void;
  isPWAInstalled: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cards,
  selectedSubject,
  onSelectSubject,
  selectedLessonIds,
  onToggleLesson,
  onSelectAllLessons,
  onClearLessonSelection,
  onStartSession,
  onStartRedSheet,
  onOpenNewCardModal,
  onLoadSampleData,
  onOpenPWAInstall,
  isPWAInstalled
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const subjects = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set);
  }, [cards]);

  const subjectLessons = useMemo(() => {
    const lessonMap: Record<
      string,
      {
        id: string;
        title: string;
        subject: string;
        totalCards: number;
        dueStrictCards: number;
        unlearnedCards: number;
        weakCards: number;
        masteredCards: number;
      }
    > = {};

    cards.forEach((c) => {
      if (c.subject !== selectedSubject) return;

      const key = c.lessonId || c.problemId || "general";
      if (!lessonMap[key]) {
        lessonMap[key] = {
          id: key,
          title: c.sourceTitle || (c.sourceType === "problem" ? "解法の極意" : "暗記項目"),
          subject: c.subject,
          totalCards: 0,
          dueStrictCards: 0,
          unlearnedCards: 0,
          weakCards: 0,
          masteredCards: 0
        };
      }
      lessonMap[key].totalCards += 1;
      if (c.isDueStrict || c.boxLevel === 1) lessonMap[key].dueStrictCards += 1;
      if (c.boxLevel === 0) lessonMap[key].unlearnedCards += 1;
      if (c.lapses > 0 || c.boxLevel === 1) lessonMap[key].weakCards += 1;
      if (c.isMastered) lessonMap[key].masteredCards += 1;
    });

    return Object.values(lessonMap);
  }, [cards, selectedSubject]);

  const allCurrentLessonIds = useMemo(() => {
    return subjectLessons.map((l) => l.id);
  }, [subjectLessons]);

  // 選択中教科・選択中単元に厳格に絞り込んだカード群
  const scopedCards = useMemo(() => {
    return cards.filter((c) => {
      if (c.subject !== selectedSubject) return false;
      const key = c.lessonId || c.problemId || "general";
      return selectedLessonIds.includes(key);
    });
  }, [cards, selectedSubject, selectedLessonIds]);

  // 厳格な期日到来カード（nextReviewDate <= 今日 または boxLevel === 1 の当日再出題）
  const scopedStrictDueCards = useMemo(() => {
    return scopedCards.filter((c) => c.isDueStrict || c.boxLevel === 1);
  }, [scopedCards]);

  // 苦手カード（ミス経験あり、または直前Again）
  const scopedWeakCards = useMemo(() => {
    return scopedCards.filter((c) => c.lapses > 0 || c.boxLevel === 1);
  }, [scopedCards]);

  // 未学習カード（Lv.0）
  const scopedUnlearnedCards = useMemo(() => {
    return scopedCards.filter((c) => c.boxLevel === 0);
  }, [scopedCards]);

  const scopedStats = useMemo(() => {
    let box0 = 0;
    let box1to3 = 0;
    let box4to5 = 0;
    scopedCards.forEach((c) => {
      if (c.boxLevel === 0) box0++;
      else if (c.boxLevel <= 3) box1to3++;
      else box4to5++;
    });
    return { box0, box1to3, box4to5 };
  }, [scopedCards]);

  const isAllSelected =
    allCurrentLessonIds.length > 0 &&
    allCurrentLessonIds.every((id) => selectedLessonIds.includes(id));

  // 期日到来がある単元のみを一括選択
  const handleSelectDueOnly = () => {
    const dueLessonIds = subjectLessons
      .filter((l) => l.dueStrictCards > 0)
      .map((l) => l.id);

    if (dueLessonIds.length > 0) {
      onSelectAllLessons(dueLessonIds);
      showToast(`🔥 復習期日がある ${dueLessonIds.length} 単元を選択しました`);
    } else {
      showToast(`🎉 ${selectedSubject} に本日復習期日の単元はありません！`);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-28 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* PWA / iPhone Install Prompt Banner */}
      {!isPWAInstalled && (
        <div
          onClick={onOpenPWAInstall}
          className="cursor-pointer rounded-xl border border-white/[0.1] bg-[#10121a] p-3 flex items-center justify-between transition-colors hover:border-white/[0.2] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black font-black text-xs">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white whitespace-nowrap leading-tight">
                iPhoneのホーム画面に追加
              </div>
              <div className="text-[10px] text-zinc-400 whitespace-nowrap mt-0.5">
                全画面のネイティブアプリとして起動できます
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
        </div>
      )}

      {/* 1. SUBJECT SELECTION BAR */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
            教科の選択
          </span>
          <button
            onClick={() => onOpenNewCardModal(selectedSubject)}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>新規カード追加</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {subjects.length === 0 ? (
            <div className="text-xs text-zinc-500 py-1 whitespace-nowrap">教科がありません</div>
          ) : (
            subjects.map((subj) => {
              const count = cards.filter((c) => c.subject === subj).length;
              const dueCount = cards.filter((c) => c.subject === subj && (c.isDueStrict || c.boxLevel === 1)).length;
              const isSelected = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  onClick={() => onSelectSubject(subj)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 min-h-[44px] text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border touch-manipulation cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-white text-black font-extrabold border-white shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                      : "bg-[#0d0e12] text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:border-white/[0.16]"
                  }`}
                >
                  <span className="whitespace-nowrap">{subj}</span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      isSelected ? "text-zinc-700 font-bold" : "text-zinc-500"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                  {dueCount > 0 && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums ${
                        isSelected ? "bg-amber-500 text-black" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      🔥 {dueCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. LESSONS MULTI-SELECT SECTION */}
      <div className="rounded-2xl border border-white/[0.09] bg-[#0c0d12]/90 backdrop-blur-md p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white tracking-tight whitespace-nowrap">
              授業・単元リスト
            </span>
            <span className="text-[11px] text-zinc-400 font-mono tabular-nums whitespace-nowrap">
              ({selectedLessonIds.length}/{subjectLessons.length} 選択)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] shrink-0 whitespace-nowrap">
            <button
              onClick={isAllSelected ? onClearLessonSelection : () => onSelectAllLessons(allCurrentLessonIds)}
              className="text-zinc-400 hover:text-white transition-colors whitespace-nowrap font-medium"
            >
              {isAllSelected ? "全解除" : "全選択"}
            </button>
            <span className="text-zinc-700">·</span>
            <button
              onClick={handleSelectDueOnly}
              className="text-amber-400/90 hover:text-amber-300 transition-colors whitespace-nowrap font-medium flex items-center gap-1"
            >
              <span>🔥 期日到来のみ</span>
            </button>
          </div>
        </div>

        {/* Lesson Rows */}
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
          {subjectLessons.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 whitespace-nowrap">
              この教科にはまだ教材・授業が登録されていません
            </div>
          ) : (
            subjectLessons.map((lesson) => {
              const isSelected = selectedLessonIds.includes(lesson.id);
              return (
                <div
                  key={lesson.id}
                  onClick={() => onToggleLesson(lesson.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-white/[0.22] bg-white/[0.05] text-white shadow-sm"
                      : "border-white/[0.04] bg-[#07080a] text-zinc-400 hover:border-white/[0.1] hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded bg-white text-black">
                          <CheckSquare className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate text-zinc-100 whitespace-nowrap">
                        {lesson.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5 tabular-nums whitespace-nowrap truncate">
                        <span>全 {lesson.totalCards.toLocaleString()}問</span>
                        <span className="text-zinc-600">·</span>
                        {lesson.dueStrictCards > 0 ? (
                          <span className="text-amber-400 font-bold bg-amber-400/10 px-1 py-0.2 rounded">
                            🔥 要復習 {lesson.dueStrictCards.toLocaleString()}問
                          </span>
                        ) : (
                          <span className="text-emerald-400">完了 ✅</span>
                        )}
                        <span className="text-zinc-600">·</span>
                        <span>習得 {lesson.masteredCards.toLocaleString()}問</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. SCOPE WORKBENCH (FLASHCARDS & RED SHEET) */}
      {scopedCards.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#13141b] to-[#090a0e] p-4.5 shadow-2xl space-y-3.5">
          {/* Top Row: Title + Progress Breakdown */}
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
            <span className="text-xs font-extrabold text-white tracking-tight whitespace-nowrap flex items-center gap-1.5">
              <span>選択範囲の学習</span>
              <span className="text-[10px] font-normal text-zinc-400">({selectedSubject})</span>
            </span>

            {/* Level breakdown metrics */}
            <div className="flex items-center gap-2 text-[11px] tabular-nums font-mono shrink-0 whitespace-nowrap">
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" />
                <span>未: {scopedStats.box0.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>中: {scopedStats.box1to3.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>済: {scopedStats.box4to5.toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Full Width Scope Details Line */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium whitespace-nowrap truncate tabular-nums">
            <span className="text-white font-bold">{selectedSubject}</span>
            <span className="text-zinc-600">·</span>
            <span>{selectedLessonIds.length}単元</span>
            <span className="text-zinc-600">·</span>
            <span>合計 {scopedCards.length.toLocaleString()}問</span>
            {scopedStrictDueCards.length > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                  <Flame className="h-3 w-3 inline shrink-0" />
                  <span>期日到来 {scopedStrictDueCards.length.toLocaleString()}問</span>
                </span>
              </>
            )}
          </div>

          {/* 🌟 1. メインCTA: SRS期日到来カード限定テスト */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                if (scopedStrictDueCards.length === 0) {
                  showToast(`🎉 ${selectedSubject} の選択単元に本日復習期日のカードはありません！`);
                  return;
                }
                onStartSession(scopedStrictDueCards);
              }}
              className={`w-full flex items-center justify-between min-h-[58px] p-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] touch-manipulation cursor-pointer ${
                scopedStrictDueCards.length > 0
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-black shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:from-amber-300 hover:to-amber-200"
                  : "bg-white/10 text-zinc-400 border border-white/[0.08] hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                    scopedStrictDueCards.length > 0
                      ? "bg-black text-amber-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  <Flame className="h-5 w-5 fill-current" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <span className="whitespace-nowrap truncate text-sm font-extrabold block">
                    {scopedStrictDueCards.length > 0
                      ? `🔥 期日到来テストを開始 (${scopedStrictDueCards.length.toLocaleString()}問)`
                      : "期日到来カードはありません (完了 ✅)"}
                  </span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      scopedStrictDueCards.length > 0 ? "text-zinc-800 font-semibold" : "text-zinc-500"
                    }`}
                  >
                    {scopedStrictDueCards.length > 0
                      ? "今日復習すべき期日到来カードだけを集中テスト"
                      : "選択した単元の本日期日分はすべてクリアしています"}
                  </span>
                </div>
              </div>
              <ChevronRight
                className={`h-5 w-5 shrink-0 ml-2 ${
                  scopedStrictDueCards.length > 0 ? "text-black/70" : "text-zinc-600"
                }`}
              />
            </button>

            {/* サブアクション一覧: 全問演習 / 苦手集中 / 未習得 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* 全問演習 */}
              <button
                onClick={() => onStartSession(scopedCards)}
                className="py-2.5 px-3 min-h-[44px] rounded-xl border border-white/[0.08] bg-[#0c0d12] hover:bg-zinc-900 active:scale-[0.98] text-xs font-bold text-zinc-200 transition-all text-center whitespace-nowrap touch-manipulation cursor-pointer flex items-center justify-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>全 {scopedCards.length.toLocaleString()}問演習</span>
              </button>

              {/* 苦手集中演習 */}
              <button
                onClick={() => {
                  if (scopedWeakCards.length === 0) {
                    showToast(`${selectedSubject} に苦手カードはありません！順調です 🎉`);
                    return;
                  }
                  onStartSession(scopedWeakCards);
                }}
                className="py-2.5 px-3 min-h-[44px] rounded-xl border border-rose-500/25 bg-rose-950/20 hover:bg-rose-900/30 active:scale-[0.98] text-xs font-bold text-rose-300 transition-all text-center whitespace-nowrap touch-manipulation cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>苦手 {scopedWeakCards.length.toLocaleString()}問集中</span>
              </button>
            </div>

            {/* 未習得カード演習（未学習がある場合のみ） */}
            {scopedUnlearnedCards.length > 0 && (
              <button
                onClick={() => onStartSession(scopedUnlearnedCards)}
                className="w-full py-2 px-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-900/30 active:scale-[0.98] text-xs font-semibold text-emerald-300 transition-all text-center whitespace-nowrap touch-manipulation cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>🌱 未習得カード {scopedUnlearnedCards.length.toLocaleString()}問を先行学習</span>
              </button>
            )}
          </div>

          {/* Mode 2: Red Sheet Mode */}
          <button
            onClick={() => onStartRedSheet(scopedCards)}
            className="w-full flex items-center justify-between min-h-[54px] p-3.5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 to-[#0e0f14] hover:border-rose-500/50 text-zinc-100 transition-all active:scale-[0.98] touch-manipulation cursor-pointer shadow-lg mt-2"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <Eye className="h-4 w-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold text-white whitespace-nowrap truncate">
                  赤シート暗記一覧 ({scopedCards.length.toLocaleString()}問)
                </div>
                <div className="text-[10px] text-zinc-400 whitespace-nowrap truncate mt-0.5">
                  赤セルシートで解答を覆って暗記確認
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#090a0e]/70 p-6 text-center space-y-2.5">
          <p className="text-xs text-zinc-400 whitespace-nowrap">
            学習したい授業・単元を上のリストから選んでください
          </p>
          {allCurrentLessonIds.length > 0 && (
            <button
              onClick={() => onSelectAllLessons(allCurrentLessonIds)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.2] bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors whitespace-nowrap shadow-sm"
            >
              <span>この教科の全授業を選択する</span>
            </button>
          )}
        </div>
      )}

      {/* Empty Database Sample Loader */}
      {cards.length < 5 && (
        <div className="pt-1">
          <button
            onClick={onLoadSampleData}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#0c0d12] py-2.5 px-4 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>サンプル教材（物理・数学・公共）をロード</span>
          </button>
        </div>
      )}
    </div>
  );
};
