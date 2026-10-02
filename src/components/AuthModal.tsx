import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { X, Mail, Lock, LogOut, Key, AlertCircle, CheckCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  activeUid: string;
  onSwitchUid: (uid: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeUid,
  onSwitchUid
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [customUid, setCustomUid] = useState(activeUid || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg("アカウントを作成しました");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg("ログインしました");
      }
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "認証エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      setSuccessMsg("ゲストとしてログインしました");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "匿名ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMsg("ログアウトしました");
    } catch (err: any) {
      setErrorMsg(err.message || "ログアウトに失敗しました");
    }
  };

  const handleApplyCustomUid = () => {
    if (!customUid.trim()) return;
    onSwitchUid(customUid.trim());
    setSuccessMsg("指定UIDのデータを読み込みました");
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#12141a] p-5 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="font-bold text-sm text-white">アカウント & データベース同期</h2>
            <p className="text-[11px] text-zinc-400">Firebase Realtime Database</p>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-900/90 border border-white/[0.12] text-zinc-300 hover:text-white active:scale-90 transition-all touch-manipulation cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current status */}
        <div className="mt-3.5 rounded-lg border border-white/[0.06] bg-zinc-950/70 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span>保存先 UID:</span>
            <span className="font-mono text-zinc-200 font-semibold">{activeUid || "未設定"}</span>
          </div>
          {currentUser && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>ログイン状態:</span>
              <span className="text-zinc-200">{currentUser.email || "ゲスト (匿名)"}</span>
            </div>
          )}
        </div>

        {/* Form or Account Controls */}
        {currentUser && !currentUser.isAnonymous ? (
          <div className="mt-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>ログアウト</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-colors active:scale-98 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "処理中..." : isRegister ? "新規アカウント登録" : "メールでログイン"}
            </button>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-[11px] text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                {isRegister ? "既存アカウントでログイン" : "新規アカウントを作成"}
              </button>
            </div>

            <div className="relative my-2 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <span className="relative bg-[#12141a] px-2 text-[10px] text-zinc-500">または</span>
            </div>

            <button
              type="button"
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <span>ゲストとして続行</span>
            </button>
          </form>
        )}

        {/* Sync with existing PC/App account via UID */}
        <div className="mt-5 border-t border-white/[0.08] pt-3.5">
          <label className="block text-xs font-semibold text-zinc-200 mb-1 flex items-center gap-1.5 whitespace-nowrap">
            <Key className="h-3.5 w-3.5 text-blue-400" />
            <span>他端末（PC版等）の UID を直接入力</span>
          </label>
          <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
            既存システムと同一の UID を入力すると、クラウド上の学習教材および進捗が同期されます。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUid}
              onChange={(e) => setCustomUid(e.target.value)}
              placeholder="Firebase User UID"
              className="flex-1 rounded-lg border border-white/[0.08] bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCustomUid}
              className="rounded-lg bg-zinc-800 border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 active:scale-95 whitespace-nowrap"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
