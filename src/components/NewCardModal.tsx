import React, { useState, useEffect } from "react";
import { X, Plus, Eye, EyeOff, HelpCircle } from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import type { Lesson } from "../types";
import { createNewCard } from "../lib/srsUtils";
import { database } from "../lib/firebase";

interface NewCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  allLessons: Record<string, Lesson>;
  onCardCreated: () => void;
  availableSubjects: string[];
  defaultSubject?: string;
}

export const NewCardModal: React.FC<NewCardModalProps> = ({
  isOpen,
  onClose,
  uid,
  allLessons,
  onCardCreated,
  availableSubjects,
  defaultSubject
}) => {
  const [subject, setSubject] = useState(defaultSubject || availableSubjects[0] || "物理");
  const [customSubject, setCustomSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [previewMath, setPreviewMath] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultSubject) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = subject === "__custom__" ? customSubject.trim() : subject;

    if (!finalSubject) {
      setErrorMsg("教科を選択または入力してください");
      return;
    }
    if (!question.trim()) {
      setErrorMsg("問題文を入力してください");
      return;
    }
    if (!answer.trim()) {
      setErrorMsg("解答を入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await createNewCard(database, uid, allLessons, {
        subject: finalSubject,
        question: question.trim(),
        answer: answer.trim(),
        note: note.trim()
      });

      setQuestion("");
      setAnswer("");
      setNote("");
      onCardCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "カードの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#12141a] p-5 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="font-bold text-sm text-white">暗記カード新規登録</h2>
            <p className="text-[11px] text-zinc-400">数式 ($...$ / $$...$$) に自動対応</p>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-900/90 border border-white/[0.12] text-zinc-300 hover:text-white active:scale-90 transition-all touch-manipulation cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
          {/* Subject selection */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              教科・科目
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              >
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">＋ 新規教科を入力</option>
              </select>

              {subject === "__custom__" && (
                <input
                  type="text"
                  placeholder="例: 世界史、化学..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full rounded-lg border border-blue-500 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Question */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-300">
                問題 (オモテ面)
              </label>
              <button
                type="button"
                onClick={() => setPreviewMath(!previewMath)}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                {previewMath ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{previewMath ? "編集モード" : "数式プレビュー"}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例: ニュートンの運動方程式は？ ($ma = F$)"
              className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              required
            />
            {previewMath && question && (
              <div className="mt-1.5 rounded-lg border border-blue-500/30 bg-zinc-950 p-2.5 text-xs text-blue-200">
                <span className="text-[10px] text-blue-400 uppercase font-mono block mb-1">Preview:</span>
                <MathRenderer content={question} />
              </div>
            )}
          </div>

          {/* Answer */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              解答 (ウラ面)
            </label>
            <textarea
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="例: $ma = F$"
              className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              required
            />
            {previewMath && answer && (
              <div className="mt-1.5 rounded-lg border border-emerald-500/30 bg-zinc-950 p-2.5 text-xs text-emerald-200">
                <span className="text-[10px] text-emerald-400 uppercase font-mono block mb-1">Preview:</span>
                <MathRenderer content={answer} />
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              解説・補足 (任意)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: mは質量[kg], aは加速度[m/s^2], Fは合力[N]"
              className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Formula hint */}
          <div className="rounded-lg bg-zinc-950/60 p-2 border border-white/[0.04] text-[10px] text-zinc-400 flex items-start gap-1.5">
            <HelpCircle className="h-3 w-3 shrink-0 text-zinc-500 mt-0.5" />
            <span>
              数式は <code className="text-blue-400 font-mono">$...$</code> または <code className="text-blue-400 font-mono">$$...$$</code> で囲むと KaTeX で自動描画されます
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white transition-colors active:scale-98 disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? "保存中..." : "暗記カードを登録する"}
          </button>
        </form>
      </div>
    </div>
  );
};
