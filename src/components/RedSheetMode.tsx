import React, { useState } from "react";
import { X, Search, Eye, EyeOff, Check } from "lucide-react";
import type { CardItem, MemorizeProgress } from "../types";
import { MathRenderer } from "./MathRenderer";
import { calculateSrsRating, saveCardProgress } from "../lib/srsUtils";
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

  const handleQuickMarkGood = async (card: CardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playCorrectChime();
    const newProg = calculateSrsRating(card, "good");
    try {
      await saveCardProgress(database, uid, card.progressKey, newProg);
      onProgressUpdated(card.progressKey, newProg);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white safe-bottom">
      {/* Top Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.08] bg-black/90 backdrop-blur-xl">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14151a] border border-white/[0.1] text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 font-bold text-xs text-white whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          <span>赤シート暗記 ({cards.length}問)</span>
        </div>

        <button
          onClick={toggleMasterMask}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border whitespace-nowrap ${
            masterMaskOn
              ? "bg-rose-950/40 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "bg-[#14151a] text-zinc-300 border-white/[0.1]"
          }`}
          title={masterMaskOn ? "赤シート全面解除" : "赤シート全適用"}
        >
          {masterMaskOn ? <EyeOff className="h-3 w-3 text-rose-400 shrink-0" /> : <Eye className="h-3 w-3 shrink-0" />}
          <span>{masterMaskOn ? "全マスク" : "全表示"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="border-b border-white/[0.06] bg-[#0c0d12] p-3">
        <div className="relative">
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

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar">
        {filteredCards.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 whitespace-nowrap">
            該当するカードがありません
          </div>
        ) : (
          filteredCards.map((card) => {
            const isRevealed = revealedIds.has(card.id);

            return (
              <div
                key={card.id}
                onClick={() => toggleCardReveal(card.id)}
                className="cursor-pointer rounded-2xl border border-white/[0.09] bg-[#0c0d12] p-4 transition-all hover:border-white/[0.2] shadow-md"
              >
                {/* Meta */}
                <div className="flex items-center justify-between mb-2 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-white tracking-wide">{card.subject}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="truncate text-zinc-400">{card.category}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-zinc-400 tabular-nums">
                      Box {card.boxLevel}
                    </span>
                    <button
                      onClick={(e) => handleQuickMarkGood(card, e)}
                      title="覚えたマーク"
                      className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div className="text-xs sm:text-sm font-semibold text-white mb-2.5">
                  <MathRenderer content={card.question} />
                </div>

                {/* Answer with Red Mask */}
                <div className="relative mt-2">
                  <div
                    className={`p-3 rounded-xl border text-xs sm:text-sm transition-all duration-150 ${
                      isRevealed
                        ? "red-sheet-revealed"
                        : "red-sheet-mask border-rose-600/50"
                    }`}
                  >
                    <MathRenderer content={card.answer} />
                  </div>
                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-extrabold text-white flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full border border-white/20 whitespace-nowrap shadow-md">
                        <Eye className="h-2.5 w-2.5 shrink-0" /> タップで解答を表示
                      </span>
                    </div>
                  )}
                </div>

                {/* Note */}
                {card.note && isRevealed && (
                  <div className="mt-2.5 text-[11px] text-zinc-300 bg-black/60 p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-zinc-500 mr-1.5 font-medium">解説:</span>
                    <MathRenderer content={card.note} inline />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-white/[0.08] bg-black px-4 py-2.5 text-center text-[10px] text-zinc-500 whitespace-nowrap">
        各カードをタップすると個別に解答の赤マスクが反転します
      </div>
    </div>
  );
};
