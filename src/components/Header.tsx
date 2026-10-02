import React from "react";
import { Volume2, VolumeX, User, LogIn, RefreshCw } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";

interface HeaderProps {
  user: FirebaseUser | null;
  isGuest: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAuth: () => void;
  activeScopeText?: string;
  onSyncRefresh?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isGuest,
  soundEnabled,
  onToggleSound,
  onOpenAuth,
  activeScopeText,
  onSyncRefresh,
  isSyncing = false
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        {/* Brand / Active Scope */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black font-black text-xs tracking-tight shadow-[0_0_12px_rgba(255,255,255,0.2)]">
            SRS
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold tracking-tight text-white text-sm whitespace-nowrap">
                暗記カード
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase whitespace-nowrap">
                Leitner
              </span>
            </div>
            {activeScopeText && (
              <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5 max-w-[210px]">
                {activeScopeText}
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            aria-label="音声切替"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              soundEnabled
                ? "border-white/[0.12] bg-[#121318] text-white hover:border-white/[0.25]"
                : "border-transparent bg-transparent text-zinc-600 hover:text-zinc-400"
            }`}
            title={soundEnabled ? "効果音: ON" : "効果音: OFF"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Sync button */}
          {onSyncRefresh && (
            <button
              onClick={onSyncRefresh}
              aria-label="同期更新"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#121318] text-zinc-300 transition-all hover:text-white hover:border-white/[0.2] ${
                isSyncing ? "animate-spin text-white" : ""
              }`}
              title="データベース同期"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Account button */}
          <button
            onClick={onOpenAuth}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#121318] px-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-zinc-800 hover:border-white/[0.2] active:scale-95 whitespace-nowrap"
          >
            {user ? (
              <>
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-black text-[10px] font-black">
                  {user.email ? user.email.charAt(0).toUpperCase() : <User className="h-2.5 w-2.5" />}
                </div>
                <span className="max-w-[70px] truncate text-[11px] font-medium">
                  {user.email ? user.email.split("@")[0] : (isGuest ? "ゲスト" : "接続中")}
                </span>
              </>
            ) : (
              <>
                <LogIn className="h-3 w-3 text-white shrink-0" />
                <span className="text-[11px]">ログイン</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
