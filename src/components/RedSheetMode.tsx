import React, { useState } from "react";
import { X, Search, Eye, EyeOff, Check, RotateCcw, Calendar, CheckCircle2 } from "lucide-react";
import type { CardItem, MemorizeProgress, RatingType } from "../types";
import { MathRenderer } from "./MathRenderer";
import { calculateSrsRating, saveCardProgress, SRS_INTERVALS } from "../lib/srsUtils";
import { database } from "../lib/firebase";
import { playFlipSound, playCorrectChime } from "../lib/soundEffects";

interface RedSheetModeProps {
  cards: CardItem[];
  uid: string;
  onClose: () => void;
  onProgressUpdated: (progressKey: string, newProg: MemorizeProgress) => void;
}

export const RedSheetMode: React.FC<RedSheetModeProps> = ({
  cards,
  uid,
  onClose,
  onProgressUpdated
}) => {
  const [masterMaskOn, setMasterMaskOn] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Track local card progress state for real-time visual feedback without waiting for refetch
  const [localProgress, setLocalProgress] = useState<
    Record<
      string,
      {
        boxLevel: number;
        nextReviewDate?: string | null;
        isDue: boolean;
        isMastered: boolean;
        lastRated?: RatingType;
        justRatedTime?: number;
      }
    >
  >({});

  const filteredCards = cards.filter((card) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchQ = card.question.toLowerCase().includes(q);
    const matchA = card.answer.toLowerCase().includes(q);
    const matchNote = (card.note || "").toLowerCase().includes(q);
    return matchQ || matchA || matchNote;
  });

  const toggleCardReveal = (id: string) => {
    playFlipSound();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleMasterMask = () => {
    playFlipSound();
    if (masterMaskOn) {
      setMasterMaskOn(false);
      setRevealedIds(new Set(filteredCards.map((c) => c.id)));
    } else {
      setMasterMaskOn(true);
      setRevealedIds(new Set());
    }
  };

  const handleRateCard = async (card: CardItem, rating: RatingType, e: React.MouseEvent) => {
    e.stopPropagation();

    // Sound effect
    if (rating === "good" || rating === "easy") {
      playCorrectChime();
    } else {
      playFlipSound();
    }

    const currentBox = localProgress[card.id]?.boxLevel ?? card.boxLevel ?? 0;
    const currentReps = card.reps ?? 0;
    const currentLapses = card.lapses ?? 0;

    const newProg = calculateSrsRating(
      { boxLevel: currentBox, reps: currentReps, lapses: currentLapses },
      rating
    );

    // Automatically reveal answer if hidden
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });

    // Update local visual state immediately
    setLocalProgress((prev) => ({
      ...prev,
      [card.id]: {
        boxLevel: newProg.boxLevel,
        nextReviewDate: newProg.nextReviewDate,
        isDue: false,
        isMastered: newProg.boxLevel >= 4,
        lastRated: rating,
        justRatedTime: Date.now()
      }
    }));

    try {
      await saveCardProgress(database, uid, card.progressKey, newProg);
      onProgressUpdated(card.progressKey, newProg);
    } catch (err) {
      console.error("Failed to save SRS progress from Red Sheet:", err);
    }
  };

  const getBoxColor = (level: number) => {
    if (level === 0) return "text-zinc-400 bg-zinc-800/80 border-zinc-700/60";
    if (level <= 2) return "text-blue-400 bg-blue-950/40 border-blue-500/30";
    if (level <= 3) return "text-amber-400 bg-amber-950/40 border-amber-500/30";
    return "text-emerald-400 bg-emerald-950/40 border-emerald-500/30";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white safe-bottom">
      {/* Top Header with safe-top for notch clearance */}
      <div className="flex flex-col border-b border-white/[0.08] bg-black/95 backdrop-blur-xl safe-top shrink-0">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={onClose}
            aria-label="戻る"
            className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-[#14151a] border border-white/[0.12] text-zinc-300 hover:text-white active:scale-90 active:bg-zinc-800 transition-all touch-manipulation cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 font-bold text-xs text-white whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0" />
            <span>赤シート暗記 ({cards.length.toLocaleString()}問)</span>
          </div>

          <button
            onClick={toggleMasterMask}
            className={`flex h-10 items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all border whitespace-nowrap touch-manipulation cursor-pointer active:scale-95 ${
              masterMaskOn
                ? "bg-rose-950/40 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                : "bg-[#14151a] text-zinc-300 border-white/[0.1]"
            }`}
            title={masterMaskOn ? "赤シート全面解除" : "赤シート全適用"}
          >
            {masterMaskOn ? <EyeOff className="h-4 w-4 text-rose-400 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
            <span>{masterMaskOn ? "全マスク" : "全表示"}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-white/[0.06] bg-[#0c0d12] p-3 shrink-0">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="問題や解答をキーワード検索..."
            className="w-full rounded-xl border border-white/[0.08] bg-[#050608] py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-white/[0.25] focus:outline-none"
          />
        </div>
      </div>

      {/* Card List with generous spacing between each card */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-lg mx-auto w-full no-scrollbar pb-28">
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 whitespace-nowrap">
            該当するカードがありません
          </div>
        ) : (
          filteredCards.map((card, idx) => {
            const isRevealed = revealedIds.has(card.id);
            const state = localProgress[card.id];
            const currentBox = state?.boxLevel ?? card.boxLevel ?? 0;
            const nextReviewDate = state?.nextReviewDate ?? card.nextReviewDate;
            const isDue = state ? state.isDue : card.isDue;
            const isMastered = state ? state.isMastered : card.isMastered;
            const lastRated = state?.lastRated;
            const isJustRated = state?.justRatedTime && Date.now() - state.justRatedTime < 5000;

            const goodIntervalDays = SRS_INTERVALS[Math.min(5, currentBox + 1)] || 3;
            const easyIntervalDays = (SRS_INTERVALS[Math.min(5, currentBox + 2)] || 7) + 3;

            return (
              <div
                key={card.id}
                className="rounded-2xl border border-white/[0.11] bg-gradient-to-b from-[#111218] to-[#090a0f] p-4.5 sm:p-5 shadow-xl transition-all duration-200 hover:border-white/[0.22]"
              >
                {/* 1. Header Row (Meta & SRS State Badge) */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-extrabold text-white tracking-wide truncate whitespace-nowrap">
                      {card.subject}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="truncate text-zinc-400 text-[11px] whitespace-nowrap">
                      {card.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Badge */}
                    {isMastered ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        習得済
                      </span>
                    ) : isDue ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30 whitespace-nowrap">
                        要復習
                      </span>
                    ) : null}

                    {/* Box level badge */}
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold border tabular-nums whitespace-nowrap ${getBoxColor(
                        currentBox
                      )}`}
                    >
                      Box {currentBox}
                    </span>
                  </div>
                </div>

                {/* 2. Question Section */}
                <div
                  onClick={() => toggleCardReveal(card.id)}
                  className="cursor-pointer pt-3 pb-1"
                >
                  <div className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                    <MathRenderer content={card.question} />
                  </div>
                </div>

                {/* 3. Answer Section with Red Sheet Mask */}
                <div
                  onClick={() => toggleCardReveal(card.id)}
                  className="relative mt-2.5 cursor-pointer"
                >
                  <div
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm transition-all duration-150 ${
                      isRevealed
                        ? "red-sheet-revealed"
                        : "red-sheet-mask border-rose-600/50"
                    }`}
                  >
                    <MathRenderer content={card.answer} />
                  </div>
                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-extrabold text-white flex items-center gap-1 bg-black/75 px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap shadow-lg">
                        <Eye className="h-3 w-3 shrink-0 text-rose-400" /> タップで解答を表示
                      </span>
                    </div>
                  )}
                </div>

                {/* Note / Explanation (if revealed) */}
                {card.note && isRevealed && (
                  <div className="mt-2.5 text-[11px] text-zinc-300 bg-black/70 p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                    <span className="text-zinc-500 mr-1.5 font-bold block mb-0.5">解説:</span>
                    <MathRenderer content={card.note} inline />
                  </div>
                )}

                {/* 4. SRS RATING CONTROL BAR (NEW!) */}
                <div className="mt-3.5 pt-3 border-t border-white/[0.07]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                      SRS記憶度判定
                    </span>
                    {isJustRated ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>記録完了 (Box {currentBox})</span>
                      </span>
                    ) : nextReviewDate ? (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono whitespace-nowrap">
                        <Calendar className="h-2.5 w-2.5 text-zinc-400" />
                        <span>次回: {nextReviewDate}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        判定を選んで進捗記録
                      </span>
                    )}
                  </div>

                  {/* 4 Rating Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {/* 1. Again (もう一度) */}
                    <button
                      onClick={(e) => handleRateCard(card, "again", e)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-95 border ${
                        lastRated === "again"
                          ? "bg-rose-500/25 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                          : "bg-rose-950/20 border-rose-500/30 text-rose-300 hover:bg-rose-950/35 hover:border-rose-500/50"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold whitespace-nowrap">もう一度</span>
                      <span className="text-[9px] text-rose-400/90 font-mono whitespace-nowrap mt-0.5">本日中</span>
                    </button>

                    {/* 2. Hard (難しい) */}
                    <button
                      onClick={(e) => handleRateCard(card, "hard", e)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-95 border ${
                        lastRated === "hard"
                          ? "bg-amber-500/25 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                          : "bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-950/35 hover:border-amber-500/50"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold whitespace-nowrap">難しい</span>
                      <span className="text-[9px] text-amber-400/90 font-mono whitespace-nowrap mt-0.5">1日後</span>
                    </button>

                    {/* 3. Good (覚えた) */}
                    <button
                      onClick={(e) => handleRateCard(card, "good", e)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-95 border ${
                        lastRated === "good"
                          ? "bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/35 hover:border-emerald-500/50"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold whitespace-nowrap">覚えた</span>
                      <span className="text-[9px] text-emerald-400/90 font-mono whitespace-nowrap mt-0.5">
                        {goodIntervalDays}日後
                      </span>
                    </button>

                    {/* 4. Easy (かんたん) */}
                    <button
                      onClick={(e) => handleRateCard(card, "easy", e)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-95 border ${
                        lastRated === "easy"
                          ? "bg-cyan-500/25 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                          : "bg-cyan-950/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/35 hover:border-cyan-500/50"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold whitespace-nowrap">かんたん</span>
                      <span className="text-[9px] text-cyan-400/90 font-mono whitespace-nowrap mt-0.5">
                        {easyIntervalDays}日後
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-white/[0.08] bg-black px-4 py-2.5 text-center text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
        カードをタップで赤マスク反転 · 各ボタンをタップでSRS記憶度と復習期日を即時記録
      </div>
    </div>
  );
};
