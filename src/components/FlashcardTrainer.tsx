import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  X,
  RotateCw,
  HelpCircle,
  Edit3,
  Check,
  Award,
  Layers,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import type { CardItem, RatingType, MemorizeProgress } from "../types";
import { MathRenderer } from "./MathRenderer";
import {
  calculateSrsRating,
  saveCardProgress,
  saveCardMemo,
  SRS_INTERVALS
} from "../lib/srsUtils";
import { database } from "../lib/firebase";
import {
  playFlipSound,
  playCorrectChime,
  playBuzzerSound,
  playFanfare
} from "../lib/soundEffects";

interface FlashcardTrainerProps {
  cards: CardItem[];
  uid: string;
  onClose: () => void;
  onProgressUpdated: (progressKey: string, newProg: MemorizeProgress) => void;
}

export const FlashcardTrainer: React.FC<FlashcardTrainerProps> = ({
  cards,
  uid,
  onClose,
  onProgressUpdated
}) => {
  const [sessionCards, setSessionCards] = useState<CardItem[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoInput, setMemoInput] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    total: 0
  });

  // Swipe gesture tracking
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const currentCard = sessionCards[currentIndex];

  useEffect(() => {
    if (currentCard) {
      setIsFlipped(false);
      setShowHint(false);
      setIsEditingMemo(false);
      setMemoInput(currentCard.userMemo || "");
      setDragOffset({ x: 0, y: 0 });
    }
  }, [currentIndex]);

  const handleFlip = () => {
    if (isTransitioning) return;
    setIsFlipped((prev) => {
      const next = !prev;
      playFlipSound();
      return next;
    });
  };

  /**
   * High-responsiveness, zero-spoiler SRS rating handler
   */
  const handleRating = (rating: RatingType) => {
    if (!currentCard || isTransitioning) return;

    // 1. Instant sound feedback
    if (rating === "good" || rating === "easy") {
      playCorrectChime();
    } else if (rating === "again") {
      playBuzzerSound();
    } else {
      playFlipSound();
    }

    // 2. Optimistic non-blocking database update
    const newProgress = calculateSrsRating(currentCard, rating);
    saveCardProgress(database, uid, currentCard.progressKey, newProgress).catch((err) => {
      console.error("Failed to save progress to RTDB:", err);
    });
    onProgressUpdated(currentCard.progressKey, newProgress);

    // 3. Update session statistics immediately
    setSessionStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
      total: prev.total + 1
    }));

    if (rating === "again") {
      const updatedCard = {
        ...currentCard,
        boxLevel: newProgress.boxLevel,
        reps: newProgress.reps,
        lapses: newProgress.lapses,
        nextReviewDate: newProgress.nextReviewDate
      };
      setSessionCards((prev) => [...prev, updatedCard]);
    }

    // 4. Smooth, instant card transition without showing next card's answer
    // Start transition: card slides out slightly and fades, preventing flip-back spoiler
    setIsTransitioning(true);

    setTimeout(() => {
      // Immediately reset flip state so the next card mounts cleanly from front
      setIsFlipped(false);
      setShowHint(false);
      setIsEditingMemo(false);
      setDragOffset({ x: 0, y: 0 });

      if (currentIndex + 1 < sessionCards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsTransitioning(false);
      } else {
        setCompleted(true);
        setIsTransitioning(false);
        playFanfare();
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {
          // Ignore
        }
      }
    }, 140);
  };

  const handleSaveMemo = async () => {
    if (!currentCard) return;
    try {
      await saveCardMemo(database, uid, currentCard.progressKey, memoInput.trim());
      currentCard.userMemo = memoInput.trim();
      setIsEditingMemo(false);
    } catch (err) {
      console.error("Failed to save card memo:", err);
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isTransitioning) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setTouchStartX(clientX);
    setTouchStartY(clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || touchStartY === null || !isDragging || isTransitioning) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const diffX = clientX - touchStartX;
    const diffY = clientY - touchStartY;
    setDragOffset({ x: diffX, y: diffY * 0.3 });
  };

  const handleTouchEnd = () => {
    if (!isDragging || isTransitioning) return;
    setIsDragging(false);

    const swipeThreshold = 80;
    if (dragOffset.x > swipeThreshold) {
      if (isFlipped) {
        handleRating("good");
      } else {
        handleFlip();
      }
    } else if (dragOffset.x < -swipeThreshold) {
      if (isFlipped) {
        handleRating("again");
      } else {
        handleFlip();
      }
    } else if (Math.abs(dragOffset.y) > 65 && !isFlipped) {
      handleFlip();
    }

    setTouchStartX(null);
    setTouchStartY(null);
    setDragOffset({ x: 0, y: 0 });
  };

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black text-white p-4 safe-bottom">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black mb-3 shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            <Award className="h-8 w-8 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1 whitespace-nowrap">
            特訓セッション完了
          </h2>
          <p className="text-xs text-zinc-400 mb-6 whitespace-nowrap">
            分散学習アルゴリズムに結果が記録されました
          </p>

          <div className="grid w-full grid-cols-2 gap-2.5 mb-6">
            <div className="rounded-xl border border-white/[0.1] bg-[#111217] p-3.5 text-center">
              <span className="block text-[11px] text-zinc-400 whitespace-nowrap">回答総数</span>
              <span className="text-2xl font-black text-white tabular-nums">{sessionStats.total}</span>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 text-center">
              <span className="block text-[11px] text-emerald-400 whitespace-nowrap">覚えた (Good/Easy)</span>
              <span className="text-2xl font-black text-emerald-400 tabular-nums">
                {sessionStats.good + sessionStats.easy}
              </span>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 text-center">
              <span className="block text-[11px] text-amber-400 whitespace-nowrap">難しい (Hard)</span>
              <span className="text-2xl font-black text-amber-400 tabular-nums">{sessionStats.hard}</span>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-3.5 text-center">
              <span className="block text-[11px] text-rose-400 whitespace-nowrap">要再復習 (Again)</span>
              <span className="text-2xl font-black text-rose-400 tabular-nums">{sessionStats.again}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-white text-black py-3.5 text-xs font-extrabold transition-all hover:bg-zinc-200 active:scale-98 shadow-[0_0_20px_rgba(255,255,255,0.18)] whitespace-nowrap"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 text-white">
        <div className="text-center">
          <p className="text-zinc-400 text-xs mb-3 whitespace-nowrap">対象のカードがありません</p>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white whitespace-nowrap"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round(((currentIndex + 1) / sessionCards.length) * 100));
  const dragRotation = dragOffset.x * 0.06;
  const isSwipingRight = dragOffset.x > 30;
  const isSwipingLeft = dragOffset.x < -30;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden safe-bottom">
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

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            <span className="font-extrabold text-white text-sm">
              {currentIndex + 1} / {sessionCards.length}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 text-xs whitespace-nowrap">
              残り {sessionCards.length - (currentIndex + 1)}問
            </span>
          </div>

          <button
            onClick={handleFlip}
            aria-label="カード反転"
            className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-[#14151a] border border-white/[0.12] text-zinc-300 hover:text-white active:scale-90 active:bg-zinc-800 transition-all touch-manipulation cursor-pointer"
            title="カード反転"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-900 shrink-0">
        <div
          className="h-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Card Arena Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Swipe Overlays */}
        {isSwipingRight && (
          <div className="absolute right-6 top-8 z-30 flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-4 py-1.5 text-xs font-extrabold text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse whitespace-nowrap">
            <Check className="h-4 w-4" />
            <span>覚えた (Good)</span>
          </div>
        )}
        {isSwipingLeft && (
          <div className="absolute left-6 top-8 z-30 flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 px-4 py-1.5 text-xs font-extrabold text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse whitespace-nowrap">
            <X className="h-4 w-4" />
            <span>もう一度 (Again)</span>
          </div>
        )}

        {/* 3D Flip Card Container with key to guarantee a fresh, non-flipped card on index advance */}
        <div
          key={`${currentCard.id}_${currentIndex}`}
          ref={cardRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button, textarea, input")) return;
            handleFlip();
          }}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragRotation}deg)`,
            opacity: isTransitioning ? 0 : 1,
            transition: isDragging
              ? "none"
              : isTransitioning
              ? "opacity 0.14s ease-out, transform 0.14s ease-out"
              : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.14s ease-in"
          }}
          className="relative w-full max-w-sm aspect-[4/5] max-h-[510px] cursor-pointer touch-manipulation"
        >
          <div
            className={`relative w-full h-full preserve-3d transition-transform duration-350 ${
              isFlipped ? "rotate-y-180" : ""
            }`}
          >
            {/* FRONT OF CARD (Question) */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/[0.14] bg-gradient-to-b from-[#13141b] to-[#07080b] p-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.95)] backface-hidden">
              {/* Top metadata */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-white tracking-wide">{currentCard.subject}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="truncate text-zinc-400">{currentCard.category}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] text-zinc-400 tabular-nums">
                    <Layers className="h-3 w-3 text-zinc-300" />
                    <span>Box {currentCard.boxLevel}</span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500 truncate mt-1">
                  {currentCard.sourceTitle}
                </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex flex-col justify-center items-center text-center my-3 overflow-y-auto px-1">
                <div className="text-lg sm:text-xl font-bold text-white max-w-full">
                  <MathRenderer content={currentCard.question} />
                </div>

                {/* Optional Hint button */}
                {currentCard.note && (
                  <div className="mt-3">
                    {showHint ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200 text-left">
                        <span className="font-bold text-amber-300 block text-[10px] mb-0.5">ヒント:</span>
                        <MathRenderer content={currentCard.note} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90 hover:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/25 bg-amber-950/20 whitespace-nowrap"
                      >
                        <HelpCircle className="h-3 w-3 shrink-0" />
                        <span>ヒントを表示</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Cue */}
              <div className="text-center text-[11px] text-zinc-500 whitespace-nowrap">
                タップして解答を表示
              </div>
            </div>

            {/* BACK OF CARD (Answer) - Backface ONLY renders content when isFlipped is true to eliminate any spoiler */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/[0.2] bg-gradient-to-b from-[#181922] to-[#090a0d] p-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.95)] backface-hidden rotate-y-180">
              {/* Back Top */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white tracking-wide whitespace-nowrap">
                  解答
                </span>
                <span className="text-[11px] font-mono text-zinc-500 tabular-nums whitespace-nowrap">
                  復習 {currentCard.reps}回目
                </span>
              </div>

              {/* Answer Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center my-3 overflow-y-auto px-1">
                {isFlipped && (
                  <div className="text-xl sm:text-2xl font-black text-white max-w-full drop-shadow">
                    <MathRenderer content={currentCard.answer} />
                  </div>
                )}

                {/* Note */}
                {currentCard.note && isFlipped && (
                  <div className="mt-3.5 w-full rounded-xl border border-white/[0.08] bg-black/60 p-2.5 text-xs text-zinc-300 text-left">
                    <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">
                      解説・要点
                    </span>
                    <MathRenderer content={currentCard.note} />
                  </div>
                )}

                {/* Personal Card Memo Section */}
                {isFlipped && (
                  <div className="mt-3 w-full">
                    {isEditingMemo ? (
                      <div
                        className="rounded-xl border border-white/[0.2] bg-black p-2.5 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-zinc-300">マイ語録・メモ</span>
                          <button
                            onClick={handleSaveMemo}
                            className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:bg-zinc-200 whitespace-nowrap"
                          >
                            <Check className="h-3 w-3" /> 保存
                          </button>
                        </div>
                        <textarea
                          value={memoInput}
                          onChange={(e) => setMemoInput(e.target.value)}
                          placeholder="自分なりの覚え方や語呂合わせ..."
                          rows={2}
                          className="w-full rounded-lg border border-white/[0.1] bg-[#111217] p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/[0.3]"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingMemo(true);
                        }}
                        className="flex items-center justify-between rounded-xl border border-dashed border-white/[0.12] bg-black/40 px-3 py-2 text-left hover:border-white/[0.25]"
                      >
                        <div className="truncate pr-2">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            マイ語録・メモ
                          </span>
                          <span className="truncate text-[11px] text-zinc-300 block">
                            {currentCard.userMemo || "タップして覚え方やメモを追加..."}
                          </span>
                        </div>
                        <Edit3 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Cue */}
              <div className="text-center text-[10px] text-zinc-500 whitespace-nowrap">
                記憶度を選択して次のカードへ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Swipe hints */}
      <div className="flex items-center justify-between px-6 pb-2 text-[10px] text-zinc-500 whitespace-nowrap font-medium shrink-0">
        <span className="flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> 左スワイプ: もう一度
        </span>
        <span className="flex items-center gap-1">
          右スワイプ: 覚えた <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {/* Bottom Action Controls - Distinct, ultra-responsive touch buttons */}
      <div className="border-t border-white/[0.08] bg-black/95 p-3.5 safe-bottom shrink-0">
        {!isFlipped ? (
          <button
            onClick={handleFlip}
            className="w-full rounded-2xl bg-white text-black py-4 text-sm font-black transition-all hover:bg-zinc-200 active:scale-98 shadow-[0_0_24px_rgba(255,255,255,0.18)] whitespace-nowrap touch-manipulation cursor-pointer"
          >
            答えを見る (タップで裏返す)
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {/* 1. Again (もう一度) */}
            <button
              disabled={isTransitioning}
              onClick={() => handleRating("again")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-rose-500/50 bg-rose-950/30 py-3.5 px-1 text-rose-200 transition-all hover:bg-rose-950/50 active:scale-95 active:bg-rose-600 active:text-white shadow-lg touch-manipulation cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs sm:text-sm font-black whitespace-nowrap">もう一度</span>
              <span className="text-[10px] text-rose-300 font-mono font-bold whitespace-nowrap mt-0.5">
                本日中
              </span>
            </button>

            {/* 2. Hard (難しい) */}
            <button
              disabled={isTransitioning}
              onClick={() => handleRating("hard")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-500/50 bg-amber-950/30 py-3.5 px-1 text-amber-200 transition-all hover:bg-amber-950/50 active:scale-95 active:bg-amber-600 active:text-white shadow-lg touch-manipulation cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs sm:text-sm font-black whitespace-nowrap">難しい</span>
              <span className="text-[10px] text-amber-300 font-mono font-bold whitespace-nowrap mt-0.5">
                1日後
              </span>
            </button>

            {/* 3. Good (覚えた) */}
            <button
              disabled={isTransitioning}
              onClick={() => handleRating("good")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/30 py-3.5 px-1 text-emerald-200 transition-all hover:bg-emerald-950/50 active:scale-95 active:bg-emerald-600 active:text-white shadow-lg touch-manipulation cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs sm:text-sm font-black whitespace-nowrap">覚えた</span>
              <span className="text-[10px] text-emerald-300 font-mono font-bold whitespace-nowrap mt-0.5">
                {SRS_INTERVALS[Math.min(5, (currentCard.boxLevel || 0) + 1)] || 3}日後
              </span>
            </button>

            {/* 4. Easy (かんたん) */}
            <button
              disabled={isTransitioning}
              onClick={() => handleRating("easy")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-cyan-500/50 bg-cyan-950/30 py-3.5 px-1 text-cyan-200 transition-all hover:bg-cyan-950/50 active:scale-95 active:bg-cyan-600 active:text-white shadow-lg touch-manipulation cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs sm:text-sm font-black whitespace-nowrap">かんたん</span>
              <span className="text-[10px] text-cyan-300 font-mono font-bold whitespace-nowrap mt-0.5">
                {(SRS_INTERVALS[Math.min(5, (currentCard.boxLevel || 0) + 2)] || 7) + 3}日後
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
